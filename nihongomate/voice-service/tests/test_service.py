import asyncio
from contextlib import asynccontextmanager
from dataclasses import replace
import json
from pathlib import Path
import sqlite3
import sys
from xml.etree import ElementTree

import httpx
import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from configure import write_config
from voice_service import Settings, VOICE_CATALOG, create_app, load_settings

TOKEN = 'test-only-proxy-token-123'
AUTH = {'Authorization': f'Bearer {TOKEN}'}
VOICE = 'ja-JP-NanamiNeural'
MP3 = b'ID3\x04\x00\x00mock-audio'


@pytest.fixture
def anyio_backend():
    return 'asyncio'


def settings(tmp_path, **changes):
    return replace(Settings(azure_key='test-only-provider-key', region='eastasia', proxy_token=TOKEN,
                            ledger_path=tmp_path / 'voice-data/usage.sqlite3'), **changes)


@asynccontextmanager
async def client_for(config, handler):
    app = create_app(config, httpx.MockTransport(handler))
    try:
        async with httpx.AsyncClient(transport=httpx.ASGITransport(app), base_url='http://test') as client:
            yield client, app.state.voice_service
    finally:
        await app.state.voice_service.close()


def voices_response():
    return httpx.Response(200, json=[{'ShortName': voice['id'], 'Locale': 'ja-JP'} for voice in VOICE_CATALOG])


def body(**changes):
    return {'text': 'こんにちは。', 'voiceId': VOICE, 'rate': 0.9, 'pitch': 1, **changes}


@pytest.mark.anyio
async def test_missing_configuration_never_contacts_azure(tmp_path):
    def no_network(_):
        raise AssertionError('No upstream requests may be made without configuration.')
    async with client_for(settings(tmp_path, azure_key='', region=''), no_network) as (client, _):
        assert (await client.get('/health')).json() == {'provider': 'azure', 'configured': False}
        response = await client.get('/v1/voices', headers=AUTH)
        assert response.status_code == 200
        result = response.json()
        assert result['configured'] is False and result['voices'] == []
        assert len(result['catalog']) == 7 and all(v['verified'] is False for v in result['catalog'])
        assert result['reason'] == 'missing_provider_configuration'
        speech = await client.post('/v1/speech', headers=AUTH, json=body())
        assert speech.status_code == 503 and speech.json()['detail']['code'] == 'setup_required'


@pytest.mark.anyio
async def test_proxy_authentication_and_unconfigured_access_code(tmp_path):
    async with client_for(settings(tmp_path), lambda _: voices_response()) as (client, _):
        for headers in ({}, {'Authorization': 'Bearer wrong'}, {'Authorization': 'Basic test'}):
            response = await client.get('/v1/voices', headers=headers)
            assert response.status_code == 401 and response.json()['detail']['code'] == 'unauthorized'
    async with client_for(settings(tmp_path, proxy_token=''), lambda _: voices_response()) as (client, _):
        assert (await client.get('/health')).json()['configured'] is False
        response = await client.get('/v1/voices', headers=AUTH)
        assert response.status_code == 503 and response.json()['detail']['code'] == 'setup_required'


@pytest.mark.anyio
async def test_only_region_confirmed_allowlisted_japanese_voices(tmp_path):
    calls = []
    def handler(request):
        calls.append(request)
        return httpx.Response(200, json=[
            {'ShortName': VOICE, 'Locale': 'ja-JP'}, {'ShortName': VOICE, 'Locale': 'ja-JP'},
            {'ShortName': 'en-US-JennyNeural', 'Locale': 'en-US'},
            {'ShortName': 'ja-JP-UnlistedNeural', 'Locale': 'ja-JP'},
            {'ShortName': 'ja-JP-KeitaNeural', 'Locale': 'en-US'},
        ])
    async with client_for(settings(tmp_path), handler) as (client, _):
        for _ in range(2):
            result = (await client.get('/v1/voices', headers=AUTH)).json()
            assert result['configured'] is True
            assert result['voices'] == [{'id': VOICE, 'name': 'Nanami', 'gender': 'Female', 'verified': True}]
        assert len(calls) == 1
        assert str(calls[0].url) == 'https://eastasia.tts.speech.microsoft.com/cognitiveservices/voices/list'
        assert calls[0].headers['Ocp-Apim-Subscription-Key'] == 'test-only-provider-key'
        unavailable = await client.post('/v1/speech', headers=AUTH, json=body(voiceId='ja-JP-KeitaNeural'))
        assert unavailable.status_code == 400 and unavailable.json()['detail']['code'] == 'voice_unavailable'
        assert len(calls) == 1


@pytest.mark.anyio
async def test_ssml_escape_cache_and_budget_preserve_text_privacy(tmp_path):
    calls = []
    def handler(request):
        calls.append(request)
        if request.method == 'GET':
            return voices_response()
        assert request.headers['X-Microsoft-OutputFormat'] == 'audio-24khz-48kbitrate-mono-mp3'
        root = ElementTree.fromstring(request.content)
        voice = root.find('{http://www.w3.org/2001/10/synthesis}voice')
        prosody = voice.find('{http://www.w3.org/2001/10/synthesis}prosody')
        assert voice.attrib['name'] == VOICE
        assert prosody.attrib == {'rate': '-25%', 'pitch': '+10%'}
        assert prosody.text == '日本語 <tag> & "引用"'
        return httpx.Response(200, content=MP3, headers={'content-type': 'audio/mpeg'})
    config = settings(tmp_path)
    async with client_for(config, handler) as (client, service):
        payload = body(text=' 日本語 <tag> & "引用" ', rate=0.75, pitch=1.1)
        first = await client.post('/v1/speech', headers=AUTH, json=payload)
        second = await client.post('/v1/speech', headers=AUTH, json=payload)
        assert first.content == second.content == MP3
        assert first.headers['x-voice-cache'] == 'miss' and second.headers['x-voice-cache'] == 'hit'
        assert first.headers['cache-control'] == 'no-store'
        assert len(calls) == 2
        assert all('日本語' not in key for key in service.cache)
    with sqlite3.connect(config.ledger_path) as connection:
        assert connection.execute('SELECT characters FROM usage').fetchone()[0] == len(payload['text'].strip())
        assert [c[1] for c in connection.execute('PRAGMA table_info(usage)')] == ['day', 'characters']
    assert config.ledger_path.stat().st_mode & 0o777 == 0o600


@pytest.mark.anyio
async def test_invalid_inputs_never_reach_upstream_and_do_not_echo_content(tmp_path):
    def handler(_):
        raise AssertionError('Invalid payload must not reach Azure.')
    async with client_for(settings(tmp_path), handler) as (client, _):
        for changes in (
            {'text': ''}, {'text': '   '}, {'text': 'あ' * 4001}, {'text': 'secret\x00text'}, {'text': '\uffff'},
            {'voiceId': 'en-US-JennyNeural'}, {'rate': 0.1}, {'rate': 2}, {'rate': True},
            {'pitch': 0.7}, {'pitch': 1.3}, {'pitch': True}, {'pitch': None}, {'extra': 'not allowed'},
        ):
            response = await client.post('/v1/speech', headers=AUTH, json=body(**changes))
            assert response.status_code == 422, changes
            assert response.json() == {'detail': {'code': 'invalid_request', 'message': '语音请求参数无效。'}}
        response = await client.post('/v1/speech', headers={**AUTH, 'Content-Type': 'application/json'},
                                     content=json.dumps(body(pitch=float('nan'))))
        assert response.status_code == 422


@pytest.mark.anyio
@pytest.mark.parametrize('upstream,code,attempts', [(401, 'provider_auth', 1), (403, 'provider_auth', 1),
                                                   (429, 'provider_rate_limit', 2), (503, 'provider_unavailable', 2)])
async def test_list_errors_are_classified_without_upstream_detail(tmp_path, upstream, code, attempts):
    calls = []
    def handler(request):
        calls.append(request)
        return httpx.Response(upstream, text='SENSITIVE_UPSTREAM_BODY')
    async with client_for(settings(tmp_path), handler) as (client, _):
        response = await client.get('/v1/voices', headers=AUTH)
        assert response.json()['detail']['code'] == code
        assert 'SENSITIVE_UPSTREAM_BODY' not in response.text and 'test-only-provider-key' not in response.text
        assert len(calls) == attempts


@pytest.mark.anyio
async def test_synthesis_timeout_is_not_retried_and_budget_is_conservative(tmp_path):
    calls = []
    def handler(request):
        calls.append(request.method)
        if request.method == 'GET':
            return voices_response()
        raise httpx.ReadTimeout('text and keys must not be returned', request=request)
    async with client_for(settings(tmp_path, daily_character_limit=3), handler) as (client, _):
        first = await client.post('/v1/speech', headers=AUTH, json=body(text='一二三'))
        assert first.status_code == 504 and first.json()['detail']['code'] == 'provider_timeout'
        assert calls == ['GET', 'POST']
        retry = await client.post('/v1/speech', headers=AUTH, json=body(text='一二三'))
        assert retry.status_code == 429 and retry.json()['detail']['code'] == 'daily_limit'
        assert calls == ['GET', 'POST']


@pytest.mark.anyio
async def test_budget_survives_service_restart(tmp_path):
    calls = []
    def handler(request):
        calls.append(request.method)
        return voices_response() if request.method == 'GET' else httpx.Response(200, content=MP3, headers={'content-type': 'audio/mpeg'})
    config = settings(tmp_path, daily_character_limit=4)
    async with client_for(config, handler) as (client, _):
        assert (await client.post('/v1/speech', headers=AUTH, json=body(text='一二三'))).status_code == 200
    async with client_for(config, handler) as (client, _):
        response = await client.post('/v1/speech', headers=AUTH, json=body(text='四五六'))
        assert response.status_code == 429 and response.json()['detail']['code'] == 'daily_limit'
    assert calls.count('POST') == 1


@pytest.mark.anyio
async def test_identical_concurrent_requests_share_one_synthesis(tmp_path):
    calls = []
    async def handler(request):
        calls.append(request.method)
        if request.method == 'GET':
            return voices_response()
        await asyncio.sleep(0.02)
        return httpx.Response(200, content=MP3, headers={'content-type': 'audio/mpeg'})
    async with client_for(settings(tmp_path), handler) as (client, _):
        responses = await asyncio.gather(*(client.post('/v1/speech', headers=AUTH, json=body()) for _ in range(3)))
        assert all(response.status_code == 200 and response.content == MP3 for response in responses)
        assert calls == ['GET', 'POST']


@pytest.mark.anyio
async def test_explicit_cors_only(tmp_path):
    async with client_for(settings(tmp_path), lambda _: voices_response()) as (client, _):
        headers = {'Origin': 'https://localhost', 'Access-Control-Request-Method': 'POST',
                   'Access-Control-Request-Headers': 'Authorization,Content-Type'}
        accepted = await client.options('/v1/speech', headers=headers)
        assert accepted.status_code == 200 and accepted.headers['access-control-allow-origin'] == 'https://localhost'
        assert 'access-control-allow-credentials' not in accepted.headers
        rejected = await client.options('/v1/speech', headers={**headers, 'Origin': 'https://untrusted.example'})
        assert rejected.status_code == 400 and 'access-control-allow-origin' not in rejected.headers


def test_local_configuration_is_private_and_env_overrides_file(tmp_path):
    path = tmp_path / 'private-config/config.json'
    config = settings(tmp_path)
    write_config(path, config)
    assert path.stat().st_mode & 0o777 == 0o600 and path.parent.stat().st_mode & 0o777 == 0o700
    loaded = load_settings(path, {'AZURE_SPEECH_REGION': 'japaneast', 'NIHONGOMATE_VOICE_DAILY_LIMIT': '1000'})
    assert loaded.region == 'japaneast' and loaded.daily_character_limit == 1000
    assert loaded.azure_key == config.azure_key and loaded.proxy_token == config.proxy_token
    assert 'test-only-provider-key' not in repr(loaded) and TOKEN not in repr(loaded)
    with pytest.raises(ValueError):
        Settings(region='eastasia.evil.test/path')
    with pytest.raises(ValueError):
        Settings(origins=('*',))
    with pytest.raises(ValueError):
        Settings(proxy_token='too short')
    assert len(Settings(proxy_token='a' * 512).proxy_token) == 512
    path.write_text('{"azure_key": null}')
    with pytest.raises(ValueError):
        load_settings(path, {})


def test_cache_is_bounded_and_expiry_drops_bytes(tmp_path):
    app = create_app(settings(tmp_path), httpx.MockTransport(lambda _: voices_response()))
    service = app.state.voice_service
    for index in range(40):
        service.remember(str(index), b'a' * 100)
    assert len(service.cache) == 32 and service.cache_bytes == 3200
    service.cache['39'] = (0, b'a' * 100)
    assert service.cached('39') is None and service.cache_bytes == 3100
    asyncio.run(service.close())
