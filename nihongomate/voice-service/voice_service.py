"""Small, single-worker Azure Japanese speech proxy. No provider key reaches the app."""
from __future__ import annotations

import asyncio
from collections import OrderedDict
from contextlib import asynccontextmanager
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
import hashlib
import json
import os
from pathlib import Path
import re
import secrets
import sqlite3
import time
from typing import Annotated, Any
from xml.sax.saxutils import escape

import httpx
from fastapi import FastAPI, Header, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, Response
from pydantic import BaseModel, ConfigDict, Field, field_validator

CONFIG_PATH = Path.home() / '.local/share/nihongomate/voice-service/config.json'
DEFAULT_ORIGINS = ('capacitor://localhost', 'https://localhost', 'http://localhost', 'http://127.0.0.1:4204')
VOICE_CATALOG = tuple(
    {'id': f'ja-JP-{name}Neural', 'name': name, 'gender': gender, 'verified': False}
    for name, gender in (
        ('Nanami', 'Female'), ('Keita', 'Male'), ('Aoi', 'Female'), ('Daichi', 'Male'),
        ('Mayu', 'Female'), ('Naoki', 'Male'), ('Shiori', 'Female'),
    )
)
VOICE_IDS = frozenset(voice['id'] for voice in VOICE_CATALOG)
PITCHES = (0.8, 0.9, 1, 1.1, 1.2)


@dataclass(frozen=True)
class Settings:
    azure_key: str = field(default='', repr=False)
    region: str = ''
    proxy_token: str = field(default='', repr=False)
    origins: tuple[str, ...] = DEFAULT_ORIGINS
    daily_character_limit: int = 5000
    ledger_path: Path = CONFIG_PATH.parent / 'usage.sqlite3'

    def __post_init__(self) -> None:
        if self.region and not re.fullmatch(r'[a-z][a-z0-9]{1,31}', self.region):
            raise ValueError('Azure region must contain only lowercase letters and numbers.')
        if self.proxy_token and (not 16 <= len(self.proxy_token) <= 512 or not self.proxy_token.isascii()
                                 or any(ord(c) < 33 or ord(c) > 126 for c in self.proxy_token)):
            raise ValueError('The proxy access code must be 16–512 printable ASCII characters without spaces.')
        if not 1 <= self.daily_character_limit <= 50000:
            raise ValueError('Daily character limit must be between 1 and 50000.')
        if '*' in self.origins or any(not isinstance(origin, str) for origin in self.origins):
            raise ValueError('Explicit CORS origins are required.')

    @property
    def configured(self) -> bool:
        return bool(self.azure_key and self.region and self.proxy_token)

    @property
    def endpoint(self) -> str:
        return f'https://{self.region}.tts.speech.microsoft.com'


def load_settings(config_path: Path | None = None, environ: dict[str, str] | None = None) -> Settings:
    """Called by the user-run server factory, never at module import."""
    env = os.environ if environ is None else environ
    config_path = config_path or Path(env.get('NIHONGOMATE_VOICE_CONFIG', str(CONFIG_PATH)))
    try:
        saved = json.loads(config_path.read_text()) if config_path.exists() else {}
        if not isinstance(saved, dict):
            raise ValueError
    except (OSError, ValueError):
        raise ValueError('Voice configuration could not be read; run configure.py again.') from None
    def value(env_key: str, file_key: str, default: Any = '') -> Any:
        return env.get(env_key, saved.get(file_key, default))
    origins = value('NIHONGOMATE_VOICE_ORIGINS', 'origins', list(DEFAULT_ORIGINS))
    if isinstance(origins, str):
        origins = [part.strip() for part in origins.split(',') if part.strip()]
    if not isinstance(origins, list):
        raise ValueError('Voice CORS configuration must be an explicit list.')
    def text_value(env_key: str, file_key: str) -> str:
        result = value(env_key, file_key)
        if not isinstance(result, str):
            raise ValueError('Voice configuration fields must contain text.')
        return result.strip()
    return Settings(
        azure_key=text_value('AZURE_SPEECH_KEY', 'azure_key'),
        region=text_value('AZURE_SPEECH_REGION', 'region'),
        proxy_token=text_value('NIHONGOMATE_VOICE_TOKEN', 'proxy_token'),
        origins=tuple(origins),
        daily_character_limit=int(value('NIHONGOMATE_VOICE_DAILY_LIMIT', 'daily_character_limit', 5000)),
        ledger_path=config_path.parent / 'usage.sqlite3',
    )


class ServiceError(Exception):
    def __init__(self, code: str, message: str, status: int = 503):
        self.code, self.message, self.status = code, message, status


class SpeechRequest(BaseModel):
    model_config = ConfigDict(extra='forbid')
    text: Annotated[str, Field(strict=True, min_length=1, max_length=4000)]
    voiceId: Annotated[str, Field(strict=True, min_length=1, max_length=80)]
    rate: Annotated[float, Field(strict=True, ge=0.5, le=1.5, allow_inf_nan=False)] = 0.9
    pitch: Annotated[float, Field(strict=True, allow_inf_nan=False)] = 1

    @field_validator('text')
    @classmethod
    def valid_text(cls, text: str) -> str:
        text = text.strip()
        if not text or any(c not in '\t\n\r' and not (32 <= ord(c) <= 0xD7FF or 0xE000 <= ord(c) <= 0xFFFD
                                                       or 0x10000 <= ord(c) <= 0x10FFFF) for c in text):
            raise ValueError('Text must contain printable content.')
        return text

    @field_validator('pitch')
    @classmethod
    def valid_pitch(cls, value: float) -> float:
        if value not in PITCHES:
            raise ValueError('Unsupported pitch.')
        return value

    @field_validator('voiceId')
    @classmethod
    def allowed_voice(cls, value: str) -> str:
        if value not in VOICE_IDS:
            raise ValueError('Unsupported voice.')
        return value


def make_ssml(request: SpeechRequest) -> str:
    rate = round((request.rate - 1) * 100)
    pitch = round((request.pitch - 1) * 100)
    return (f'<speak version="1.0" xml:lang="ja-JP" xmlns="http://www.w3.org/2001/10/synthesis">'
            f'<voice name="{request.voiceId}"><prosody rate="{rate:+d}%" pitch="{pitch:+d}%">'
            f'{escape(request.text)}</prosody></voice></speak>')


class DailyBudget:
    def __init__(self, path: Path, limit: int):
        self.path, self.limit = path, limit

    async def reserve(self, characters: int) -> None:
        day = datetime.now(timezone(timedelta(hours=8))).date().isoformat()
        await asyncio.to_thread(self._reserve, day, characters)

    def _reserve(self, day: str, characters: int) -> None:
        try:
            self.path.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
            with sqlite3.connect(self.path, timeout=5) as connection:
                self.path.chmod(0o600)
                connection.execute('CREATE TABLE IF NOT EXISTS usage (day TEXT PRIMARY KEY, characters INTEGER NOT NULL)')
                connection.execute('BEGIN IMMEDIATE')
                row = connection.execute('SELECT characters FROM usage WHERE day = ?', (day,)).fetchone()
                if (row[0] if row else 0) + characters > self.limit:
                    raise ServiceError('daily_limit', '今日联网朗读字符额度已用完，请明天再试。', 429)
                connection.execute('INSERT INTO usage VALUES (?, ?) ON CONFLICT(day) DO UPDATE SET characters=characters+excluded.characters', (day, characters))
        except (OSError, sqlite3.Error):
            raise ServiceError('budget_unavailable', '用量记录暂不可用，已停止联网合成，请检查服务端存储。') from None


class VoiceService:
    def __init__(self, settings: Settings, transport: httpx.AsyncBaseTransport | None = None):
        self.settings = settings
        self.client = httpx.AsyncClient(
            timeout=httpx.Timeout(30, connect=5, pool=2), transport=transport, follow_redirects=False,
            limits=httpx.Limits(max_connections=4, max_keepalive_connections=2),
        )
        self.budget = DailyBudget(settings.ledger_path, settings.daily_character_limit)
        self.voice_lock = asyncio.Lock()
        self.semaphore = asyncio.Semaphore(2)
        self.verified_voices: list[dict[str, Any]] = []
        self.voices_expire = 0.0
        self.cache: OrderedDict[str, tuple[float, bytes]] = OrderedDict()
        self.cache_bytes = 0
        self.inflight: dict[str, asyncio.Task[bytes]] = {}

    async def close(self) -> None:
        pending = list(self.inflight.values())
        for task in pending:
            task.cancel()
        if pending:
            await asyncio.gather(*pending, return_exceptions=True)
        await self.client.aclose()

    def authorize(self, authorization: str | None) -> None:
        if not self.settings.proxy_token:
            raise ServiceError('setup_required', '请先在服务端运行本机配置入口，设置语音服务访问口令。')
        scheme, _, credentials = (authorization or '').partition(' ')
        supplied = credentials.strip() if scheme.lower() == 'bearer' else ''
        if not supplied.isascii() or not secrets.compare_digest(supplied, self.settings.proxy_token):
            raise ServiceError('unauthorized', '语音服务访问口令无效。', 401)

    @staticmethod
    def response_error(status: int) -> ServiceError:
        if status in (401, 403):
            return ServiceError('provider_auth', 'Azure 认证失败，请在服务端检查密钥和区域。', 502)
        if status == 429:
            return ServiceError('provider_rate_limit', 'Azure 请求过于频繁，请稍后重试。', 429)
        if status >= 500:
            return ServiceError('provider_unavailable', 'Azure 语音服务暂时不可用，请稍后重试。', 502)
        return ServiceError('provider_request', 'Azure 未接受本次语音请求，请检查服务端配置。', 502)

    async def request(self, method: str, path: str, **kwargs: Any) -> httpx.Response:
        headers = {'Ocp-Apim-Subscription-Key': self.settings.azure_key, **kwargs.pop('headers', {})}
        attempts = 2 if method == 'GET' else 1
        for attempt in range(attempts):
            try:
                response = await self.client.request(method, self.settings.endpoint + path, headers=headers, **kwargs)
            except httpx.TimeoutException:
                if attempt + 1 < attempts:
                    continue
                raise ServiceError('provider_timeout', 'Azure 语音请求超时，未自动重复合成。', 504) from None
            except httpx.RequestError:
                if attempt + 1 < attempts:
                    continue
                raise ServiceError('provider_network', '无法连接 Azure 语音服务，请检查服务端网络。', 502) from None
            if response.is_success:
                return response
            if method == 'GET' and (response.status_code == 429 or response.status_code >= 500) and attempt + 1 < attempts:
                await asyncio.sleep(0.1)
                continue
            raise self.response_error(response.status_code)
        raise ServiceError('provider_unavailable', 'Azure 语音服务暂不可用。', 502)

    async def voices(self) -> dict[str, Any]:
        if not self.settings.configured:
            return {'configured': False, 'voices': [], 'catalog': list(VOICE_CATALOG), 'reason': 'missing_provider_configuration'}
        async with self.voice_lock:
            if time.monotonic() >= self.voices_expire:
                response = await self.request('GET', '/cognitiveservices/voices/list')
                try:
                    values = response.json()
                    if not isinstance(values, list) or len(response.content) > 2 * 1024 * 1024:
                        raise ValueError
                    supplied = {item['ShortName'] for item in values if isinstance(item, dict)
                                and item.get('Locale') == 'ja-JP' and item.get('ShortName') in VOICE_IDS}
                except (ValueError, KeyError, TypeError):
                    raise ServiceError('provider_response', 'Azure 音色列表格式无效，请稍后刷新。', 502) from None
                self.verified_voices = [{**voice, 'verified': True} for voice in VOICE_CATALOG if voice['id'] in supplied]
                self.voices_expire = time.monotonic() + 3600
            return {'configured': True, 'voices': self.verified_voices, 'catalog': list(VOICE_CATALOG)}

    def cached(self, key: str) -> bytes | None:
        item = self.cache.get(key)
        if item is None:
            return None
        expires, audio = item
        if expires <= time.monotonic():
            self.cache.pop(key)
            self.cache_bytes -= len(audio)
            return None
        self.cache.move_to_end(key)
        return audio

    def remember(self, key: str, audio: bytes) -> None:
        old = self.cache.pop(key, None)
        if old:
            self.cache_bytes -= len(old[1])
        self.cache[key] = (time.monotonic() + 3600, audio)
        self.cache_bytes += len(audio)
        while len(self.cache) > 32 or self.cache_bytes > 8 * 1024 * 1024:
            _, (_, removed) = self.cache.popitem(last=False)
            self.cache_bytes -= len(removed)

    async def synthesize(self, request: SpeechRequest) -> tuple[bytes, bool]:
        voices = await self.voices()
        if not voices['configured']:
            raise ServiceError('setup_required', 'Azure 尚未配置，请先在服务端录入密钥和区域。')
        if request.voiceId not in {voice['id'] for voice in voices['voices']}:
            raise ServiceError('voice_unavailable', '该音色未被当前 Azure 区域确认可用，请刷新列表。', 400)
        key = hashlib.sha256(json.dumps(request.model_dump(), ensure_ascii=False, sort_keys=True).encode()).hexdigest()
        audio = self.cached(key)
        if audio is not None:
            return audio, True
        task = self.inflight.get(key)
        if task is None:
            task = asyncio.create_task(self.produce(key, request))
            self.inflight[key] = task
            def completed(done: asyncio.Task[bytes]) -> None:
                self.inflight.pop(key, None)
                if not done.cancelled():
                    done.exception()  # Retrieve failures even if the requesting client disconnected.
            task.add_done_callback(completed)
        return await asyncio.shield(task), False

    async def produce(self, key: str, request: SpeechRequest) -> bytes:
        try:
            await asyncio.wait_for(self.semaphore.acquire(), timeout=2)
        except TimeoutError:
            raise ServiceError('busy', '语音服务正在处理其他请求，请稍后再试。', 429) from None
        try:
            await self.budget.reserve(len(request.text))
            response = await self.request('POST', '/cognitiveservices/v1', content=make_ssml(request).encode(), headers={
                'Content-Type': 'application/ssml+xml', 'X-Microsoft-OutputFormat': 'audio-24khz-48kbitrate-mono-mp3',
                'User-Agent': 'NihongoMateVoiceService',
            })
            audio = response.content
            if not audio or len(audio) > 8 * 1024 * 1024 or not response.headers.get('content-type', '').lower().startswith(('audio/', 'application/octet-stream')):
                raise ServiceError('provider_response', 'Azure 返回的音频不可用，请稍后重试。', 502)
            self.remember(key, audio)
            return audio
        finally:
            self.semaphore.release()


def create_app(settings: Settings | None = None, transport: httpx.AsyncBaseTransport | None = None) -> FastAPI:
    settings = settings or load_settings()
    service = VoiceService(settings, transport)

    @asynccontextmanager
    async def lifespan(_: FastAPI):
        yield
        await service.close()

    app = FastAPI(title='NihongoMate voice service', version='1.0', lifespan=lifespan)
    app.state.voice_service = service
    app.add_middleware(CORSMiddleware, allow_origins=list(settings.origins), allow_credentials=False,
                       allow_methods=['GET', 'POST'], allow_headers=['Authorization', 'Content-Type'])

    @app.exception_handler(ServiceError)
    async def service_error(_: Request, error: ServiceError) -> JSONResponse:
        return JSONResponse({'detail': {'code': error.code, 'message': error.message}}, status_code=error.status)

    @app.exception_handler(RequestValidationError)
    async def invalid_request(_: Request, __: RequestValidationError) -> JSONResponse:
        return JSONResponse({'detail': {'code': 'invalid_request', 'message': '语音请求参数无效。'}}, status_code=422)

    @app.get('/health')
    async def health() -> dict[str, Any]:
        return {'provider': 'azure', 'configured': settings.configured}

    @app.get('/v1/voices')
    async def voices(authorization: str | None = Header(default=None)) -> dict[str, Any]:
        service.authorize(authorization)
        return await service.voices()

    @app.post('/v1/speech')
    async def speech(request: SpeechRequest, authorization: str | None = Header(default=None)) -> Response:
        service.authorize(authorization)
        audio, cached = await service.synthesize(request)
        return Response(audio, media_type='audio/mpeg', headers={'Cache-Control': 'no-store', 'X-Voice-Cache': 'hit' if cached else 'miss'})

    return app
