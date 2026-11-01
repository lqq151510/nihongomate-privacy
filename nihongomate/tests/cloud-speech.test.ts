import { describe, expect, test } from 'bun:test'
import { AudioEngine } from '../src/utils/audio'
import {
  CLOUD_SPEECH_CONFIG_KEY, CLOUD_VOICE_CATALOG, CloudSpeechPlayer, CloudSpeechError,
  cloudSpeechErrorMessage, fetchCloudVoices, readCloudSpeechConfig, saveCloudSpeechConfig,
  type CloudSpeechConfig, type CloudSpeechAdapter,
} from '../src/utils/cloudSpeech'

class MemoryStorage implements Storage {
  values = new Map<string, string>()
  get length() { return this.values.size }
  clear() { this.values.clear() }
  getItem(key: string) { return this.values.get(key) ?? null }
  key(index: number) { return [...this.values.keys()][index] ?? null }
  removeItem(key: string) { this.values.delete(key) }
  setItem(key: string, value: string) { this.values.set(key, value) }
}
const config: CloudSpeechConfig = { serviceUrl: 'https://voice.example.test', accessToken: 'synthetic-test-token', voiceId: 'ja-JP-NanamiNeural', enabled: true }
function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>(done => { resolve = done })
  return { promise, resolve }
}
async function flush() { for (let i = 0; i < 40; i++) await Promise.resolve() }
class FakeAudio {
  src = ''
  onended: (() => void) | null = null
  onerror: (() => void) | null = null
  plays = 0; pauses = 0; loads = 0
  play = async () => { this.plays++ }
  pause() { this.pauses++ }
  removeAttribute() { this.src = '' }
  load() { this.loads++ }
}
function playerFixture(overrides: { fetch?: typeof fetch; readConfig?: () => CloudSpeechConfig; privacyChoice?: () => 'accepted' | 'local-only' } = {}) {
  const audio = new FakeAudio()
  const state = { requests: [] as { url: string; options?: RequestInit }[], created: [] as Blob[], revoked: [] as string[] }
  const player = new CloudSpeechPlayer({
    readConfig: () => config, privacyChoice: () => 'accepted',
    fetch: (async (url: string | URL | Request, options?: RequestInit) => {
      state.requests.push({ url: String(url), options })
      return new Response('synthetic audio bytes', { headers: { 'Content-Type': 'audio/mpeg' } })
    }) as typeof fetch,
    createAudio: () => audio as unknown as HTMLAudioElement,
    createObjectURL: blob => { state.created.push(blob); return 'blob:synthetic-voice' },
    revokeObjectURL: url => state.revoked.push(url), ...overrides,
  })
  return { player, audio, state }
}

describe('联网语音配置与真实音色列表', () => {
  test('配置与旧学习/设备偏好隔离，保存归一地址，失败保留旧字节', () => {
    const storage = new MemoryStorage()
    storage.setItem('nihongomate_speech_preferences', 'keep-device-voice')
    expect(readCloudSpeechConfig(storage)).toEqual({ serviceUrl: '', accessToken: '', enabled: false, voiceId: '' })
    expect(saveCloudSpeechConfig({ ...config, serviceUrl: 'https://voice.example.test/' }, storage)).toBe(true)
    expect(readCloudSpeechConfig(storage)).toEqual(config)
    const before = storage.getItem(CLOUD_SPEECH_CONFIG_KEY)
    storage.setItem = () => { throw new Error('synthetic quota') }
    expect(saveCloudSpeechConfig({ ...config, enabled: false }, storage)).toBe(false)
    expect(storage.getItem(CLOUD_SPEECH_CONFIG_KEY)).toBe(before)
    expect(storage.getItem('nihongomate_speech_preferences')).toBe('keep-device-voice')
  })

  test('撤销联网写入失败仍在本会话生效，新朗读入口不会发送网络', async () => {
    const storage = new MemoryStorage()
    expect(saveCloudSpeechConfig(config, storage)).toBe(true)
    const before = storage.getItem(CLOUD_SPEECH_CONFIG_KEY)
    const originalWrite = storage.setItem.bind(storage)
    storage.setItem = () => { throw new Error('synthetic quota') }
    expect(saveCloudSpeechConfig({ ...config, enabled: false }, storage)).toBe(false)
    expect(storage.getItem(CLOUD_SPEECH_CONFIG_KEY)).toBe(before)
    expect(readCloudSpeechConfig(storage).enabled).toBe(false)
    const first = playerFixture({ readConfig: () => readCloudSpeechConfig(storage) })
    const second = playerFixture({ readConfig: () => readCloudSpeechConfig(storage) })
    const engine = new AudioEngine(null, () => 'accepted', () => {}, undefined, null, first.player)
    expect(await engine.speak('不再发送')).toBe(false)
    expect(await second.player.speak('新实例也不发送', 1, 1)).toBe(false)
    expect(first.state.requests).toHaveLength(0)
    expect(second.state.requests).toHaveLength(0)
    storage.setItem = originalWrite
    expect(saveCloudSpeechConfig(config, storage)).toBe(true)
    expect(readCloudSpeechConfig(storage).enabled).toBe(true)
  })

  test('拒绝不安全地址、头注入、未知音色和不完整启用配置', () => {
    const storage = new MemoryStorage()
    for (const serviceUrl of ['http://192.168.1.2:4210', 'javascript:alert(1)', 'https://name:secret@example.test', 'https://example.test?key=x', 'https://example.test/#x']) {
      expect(saveCloudSpeechConfig({ ...config, serviceUrl }, storage)).toBe(false)
    }
    expect(saveCloudSpeechConfig({ ...config, accessToken: 'x\r\nAuthorization: value' }, storage)).toBe(false)
    expect(saveCloudSpeechConfig({ ...config, voiceId: 'en-US-fake' }, storage)).toBe(false)
    expect(saveCloudSpeechConfig({ ...config, accessToken: '' }, storage)).toBe(false)
    for (const serviceUrl of ['http://localhost:4210', 'http://127.0.0.1:4210', 'http://[::1]:4210']) {
      expect(saveCloudSpeechConfig({ ...config, serviceUrl }, storage)).toBe(true)
    }
    storage.setItem(CLOUD_SPEECH_CONFIG_KEY, '{invalid')
    expect(readCloudSpeechConfig(storage).enabled).toBe(false)
  })

  test('本地模式下枚举不发网络，目录不是已开通音色', async () => {
    let requests = 0
    const fetcher = (async () => { requests++; return Response.json({ configured: false, voices: [{ ...CLOUD_VOICE_CATALOG[0], verified: true }] }) }) as typeof fetch
    await expect(fetchCloudVoices(config, undefined, { fetch: fetcher, privacyChoice: () => 'local-only' })).rejects.toMatchObject({ code: 'PRIVACY_REQUIRED' })
    expect(requests).toBe(0)
    const result = await fetchCloudVoices(config, undefined, { fetch: fetcher, privacyChoice: () => 'accepted' })
    expect(result.configured).toBe(false)
    expect(result.voices).toEqual([])
    expect(result.catalog).toHaveLength(7)
    expect(result.catalog.every(voice => !voice.verified)).toBe(true)
  })

  test('仅接受服务实际确认的七个允许音色，限制和去重不信任展示字段', async () => {
    const one = { ...CLOUD_VOICE_CATALOG[0], verified: true, name: 'untrusted display' }
    const fetcher = (async () => Response.json({ configured: true, voices: [one, one, CLOUD_VOICE_CATALOG[1], { ...one, id: 'en-US-x' }] })) as typeof fetch
    const result = await fetchCloudVoices(config, undefined, { fetch: fetcher, privacyChoice: () => 'accepted' })
    expect(result.voices).toEqual([{ ...CLOUD_VOICE_CATALOG[0], verified: true }])
  })

  test.each([
    [502, 'provider_auth', 'Azure 服务认证失败'],
    [429, 'provider_rate_limit', '当前繁忙'],
    [504, 'provider_timeout', '响应超时'],
    [502, 'provider_network', '服务端网络'],
    [502, 'provider_unavailable', '暂时不可用'],
  ] as const)('服务真实错误码 %s/%s 提供对应提示', async (status, code, expected) => {
    let received: unknown
    try {
      await fetchCloudVoices(config, undefined, {
        privacyChoice: () => 'accepted',
        fetch: (async () => Response.json({ detail: { code, message: 'upstream secret must not surface' } }, { status })) as typeof fetch,
      })
    } catch (error) { received = error }
    expect(received).toMatchObject({ code })
    expect(cloudSpeechErrorMessage(received)).toContain(expected)
    expect(cloudSpeechErrorMessage(received)).not.toContain('upstream secret')
  })

  test('错误只保留分类，取消不把过期列表交给界面', async () => {
    await expect(fetchCloudVoices(config, undefined, { privacyChoice: () => 'accepted', fetch: (async () => Response.json({ detail: { code: 'AZURE_AUTH_FAILED', message: 'sensitive upstream body' } }, { status: 401 })) as typeof fetch })).rejects.toMatchObject({ code: 'AZURE_AUTH_FAILED' })
    expect(cloudSpeechErrorMessage({ code: 'AZURE_AUTH_FAILED' })).not.toContain('sensitive')
    const response = deferred<Response>()
    const abort = new AbortController()
    const pending = fetchCloudVoices(config, abort.signal, { privacyChoice: () => 'accepted', fetch: (() => response.promise) as typeof fetch })
    abort.abort()
    response.resolve(Response.json({ configured: true, voices: [] }))
    await expect(pending).rejects.toMatchObject({ code: 'CANCELLED' })
  })
})

describe('联网播放器与共享朗读入口', () => {
  test('发送所选声音参数，必须等音频真正结束才成功，结束释放对象URL', async () => {
    const f = playerFixture()
    let settled = false
    const pending = f.player.speak('こんにちは。', 0.75, 0.9).then(value => { settled = true; return value })
    await flush()
    expect(f.state.requests).toHaveLength(1)
    expect(JSON.parse(String(f.state.requests[0].options?.body))).toEqual({ text: 'こんにちは。', voiceId: config.voiceId, rate: 0.75, pitch: 0.9 })
    expect(f.audio.plays).toBe(1)
    expect(settled).toBe(false)
    f.audio.onended?.()
    expect(await pending).toBe(true)
    expect(f.state.revoked).toEqual(['blob:synthetic-voice'])
    expect(f.audio.src).toBe('')
  })

  test('禁用或仅本地模式不发送文本', async () => {
    const disabled = playerFixture({ readConfig: () => ({ ...config, enabled: false }) })
    expect(await disabled.player.speak('日本語', 1, 1)).toBe(false)
    expect(disabled.state.requests).toHaveLength(0)
    const local = playerFixture({ privacyChoice: () => 'local-only' })
    await expect(local.player.speak('日本語', 1, 1)).rejects.toMatchObject({ code: 'PRIVACY_REQUIRED' })
    expect(local.state.requests).toHaveLength(0)
  })

  test('取消立即结束，迟到网络结果不能播放', async () => {
    const response = deferred<Response>()
    let signal: AbortSignal | null = null
    const f = playerFixture({ fetch: ((_url, options) => { signal = options?.signal ?? null; return response.promise }) as typeof fetch })
    const pending = f.player.speak('旧的内容', 1, 1)
    f.player.stop()
    expect(await pending).toBe(false)
    expect(signal?.aborted).toBe(true)
    response.resolve(new Response('late', { headers: { 'Content-Type': 'audio/mpeg' } }))
    await flush()
    expect(f.audio.plays).toBe(0)
    expect(f.state.created).toHaveLength(0)
  })

  test('请求超时会立即结束，迟到响应不能恢复播放', async () => {
    const response = deferred<Response>()
    const original = globalThis.setTimeout
    let timeout: (() => void) | undefined
    globalThis.setTimeout = ((callback: () => void, delay: number) => {
      if (delay === 20000) timeout = callback
      return original(callback, delay)
    }) as typeof setTimeout
    try {
      const f = playerFixture({ fetch: (() => response.promise) as typeof fetch })
      const pending = f.player.speak('无响应', 1, 1)
      const rejection = pending.catch(error => error)
      expect(timeout).toBeDefined()
      timeout!()
      expect(await rejection).toMatchObject({ code: 'TIMEOUT' })
      response.resolve(new Response('late', { headers: { 'Content-Type': 'audio/mpeg' } }))
      await flush()
      expect(f.audio.plays).toBe(0)
    } finally { globalThis.setTimeout = original }
  })

  test('请求过程中更换音色不会播放旧声音', async () => {
    const response = deferred<Response>()
    let current = { ...config }
    const f = playerFixture({ fetch: (() => response.promise) as typeof fetch, readConfig: () => current })
    const pending = f.player.speak('旧音色内容', 1, 1)
    current = { ...current, voiceId: 'ja-JP-KeitaNeural' }
    response.resolve(new Response('late', { headers: { 'Content-Type': 'audio/mpeg' } }))
    expect(await pending).toBe(false)
    expect(f.audio.plays).toBe(0)
  })

  test('播放中停止清理音频；偏好或隐私在请求中变化也不播放', async () => {
    const playing = playerFixture()
    const pending = playing.player.speak('播放', 1, 1)
    await flush()
    playing.player.stop()
    expect(await pending).toBe(false)
    expect(playing.audio.pauses).toBe(1)
    expect(playing.state.revoked).toHaveLength(1)
    const response = deferred<Response>()
    let choice: 'accepted' | 'local-only' = 'accepted'
    const f = playerFixture({ fetch: (() => response.promise) as typeof fetch, privacyChoice: () => choice })
    const stale = f.player.speak('不再允许的内容', 1, 1)
    choice = 'local-only'
    response.resolve(new Response('late', { headers: { 'Content-Type': 'audio/mpeg' } }))
    expect(await stale).toBe(false)
    expect(f.audio.plays).toBe(0)
  })

  test('拒绝非音频/超大数据并区分播放拒绝，不泄露服务详情', async () => {
    for (const response of [new Response('not audio'), new Response('large', { headers: { 'Content-Type': 'audio/mpeg', 'Content-Length': String(11 * 1024 * 1024) } })]) {
      const f = playerFixture({ fetch: (async () => response) as typeof fetch })
      await expect(f.player.speak('内容', 1, 1)).rejects.toMatchObject({ code: 'INVALID_AUDIO' })
      expect(f.audio.plays).toBe(0)
    }
    const f = playerFixture()
    f.audio.play = async () => { throw new Error('not allowed') }
    await expect(f.player.speak('内容', 1, 1)).rejects.toMatchObject({ code: 'PLAYBACK_FAILED' })
    expect(f.state.revoked).toHaveLength(1)
  })

  test('共享入口仅本地时禁止云调用，联网失败不会静默改用系统声音', async () => {
    const calls: string[] = []
    const adapter: CloudSpeechAdapter = { isEnabled: () => true, stop: () => {}, speak: async text => { calls.push(text); throw new CloudSpeechError('AZURE_AUTH_FAILED') } }
    const notices: string[] = []
    const local = new AudioEngine(null, () => 'local-only', message => notices.push(message), undefined, null, adapter)
    expect(await local.speak('不发送')).toBe(false)
    expect(calls).toEqual([])
    const online = new AudioEngine(null, () => 'accepted', message => notices.push(message), undefined, null, adapter)
    expect(await online.speak('允许发送')).toBe(false)
    expect(calls).toEqual(['允许发送'])
    expect(notices.some(message => message.includes('Azure'))).toBe(true)
  })

  test('共享入口停止时立即结束并取消云任务，过期错误不通知', async () => {
    const result = deferred<boolean>()
    let stops = 0
    const adapter: CloudSpeechAdapter = { isEnabled: () => true, stop: () => { stops++ }, speak: () => result.promise }
    const notices: string[] = []
    const engine = new AudioEngine(null, () => 'accepted', message => notices.push(message), undefined, null, adapter)
    const pending = engine.speak('内容')
    engine.stop()
    expect(await pending).toBe(false)
    expect(stops).toBe(2)
    result.resolve(true)
    await flush()
    expect(notices).toEqual([])
  })
})
