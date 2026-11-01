import { readEffectivePrivacyDecision, PRIVACY_UPDATED_EVENT, type PrivacyChoice } from './privacy'
import { MAX_SPEECH_TEXT_LENGTH, speechTimeoutMs } from './nativeSpeech'
import { SPEECH_PITCHES } from './speechPreferences'

export const CLOUD_SPEECH_CONFIG_KEY = 'nihongomate_cloud_speech_v1'
export const CLOUD_SPEECH_UPDATED_EVENT = 'nihongomate:cloud-speech-updated'

export interface CloudSpeechConfig { serviceUrl: string; accessToken: string; enabled: boolean; voiceId: string }
export interface CloudVoice { id: string; name: string; gender: 'Female' | 'Male'; verified: boolean }
export interface CloudVoicesResponse { configured: boolean; voices: CloudVoice[]; catalog: CloudVoice[]; reason?: string }
export interface CloudSpeechAdapter {
  isEnabled(): boolean
  speak(text: string, rate: number, pitch: number): Promise<boolean>
  stop(): void
}

// These are official candidates, not proof that a user's Azure region can synthesize them.
export const CLOUD_VOICE_CATALOG: readonly CloudVoice[] = [
  { id: 'ja-JP-NanamiNeural', name: 'Nanami', gender: 'Female', verified: false },
  { id: 'ja-JP-KeitaNeural', name: 'Keita', gender: 'Male', verified: false },
  { id: 'ja-JP-AoiNeural', name: 'Aoi', gender: 'Female', verified: false },
  { id: 'ja-JP-DaichiNeural', name: 'Daichi', gender: 'Male', verified: false },
  { id: 'ja-JP-MayuNeural', name: 'Mayu', gender: 'Female', verified: false },
  { id: 'ja-JP-NaokiNeural', name: 'Naoki', gender: 'Male', verified: false },
  { id: 'ja-JP-ShioriNeural', name: 'Shiori', gender: 'Female', verified: false },
]

const emptyConfig = (): CloudSpeechConfig => ({ serviceUrl: '', accessToken: '', enabled: false, voiceId: '' })
const allowedVoiceIds = new Set(CLOUD_VOICE_CATALOG.map(voice => voice.id))
// Revoking network use takes effect immediately even when persistent storage is full.
const sessionDisabled = new WeakSet<Storage>()
const MAX_AUDIO_BYTES = 10 * 1024 * 1024

function normalizeConfig(value: unknown): CloudSpeechConfig | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const candidate = value as Record<string, unknown>
  if (typeof candidate.serviceUrl !== 'string' || typeof candidate.accessToken !== 'string'
    || typeof candidate.enabled !== 'boolean' || typeof candidate.voiceId !== 'string') return null
  let serviceUrl = candidate.serviceUrl.trim()
  if (serviceUrl) {
    try {
      const url = new URL(serviceUrl)
      const loopback = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)
      if (serviceUrl.length > 500 || (url.protocol !== 'https:' && !(url.protocol === 'http:' && loopback))
        || url.username || url.password || url.search || url.hash) return null
      serviceUrl = url.href.replace(/\/+$/, '')
    } catch { return null }
  }
  const accessToken = candidate.accessToken
  if (accessToken && !/^[\x21-\x7e]{16,512}$/.test(accessToken)) return null
  if (candidate.voiceId && !allowedVoiceIds.has(candidate.voiceId)) return null
  if (candidate.enabled && (!serviceUrl || !accessToken || !candidate.voiceId)) return null
  return { serviceUrl, accessToken, enabled: candidate.enabled, voiceId: candidate.voiceId }
}

export function readCloudSpeechConfig(storage?: Storage): CloudSpeechConfig {
  try {
    const target = storage ?? localStorage
    const config = normalizeConfig(JSON.parse(target.getItem(CLOUD_SPEECH_CONFIG_KEY) || 'null')) ?? emptyConfig()
    return sessionDisabled.has(target) ? { ...config, enabled: false } : config
  } catch { return emptyConfig() }
}

export function saveCloudSpeechConfig(config: CloudSpeechConfig, storage?: Storage): boolean {
  const normalized = normalizeConfig(config)
  if (!normalized) return false
  let target = storage
  try {
    target ??= localStorage
    target.setItem(CLOUD_SPEECH_CONFIG_KEY, JSON.stringify(normalized))
    sessionDisabled.delete(target)
  } catch {
    if (!normalized.enabled && target) {
      sessionDisabled.add(target)
      cloudSpeech.stop()
      if (typeof window !== 'undefined') window.dispatchEvent(new Event(CLOUD_SPEECH_UPDATED_EVENT))
    }
    return false
  }
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(CLOUD_SPEECH_UPDATED_EVENT))
  return true
}

export class CloudSpeechError extends Error {
  constructor(public readonly code: string) { super('联网语音请求未完成'); this.name = 'CloudSpeechError' }
}

export function cloudSpeechErrorMessage(error: unknown): string {
  const code = typeof error === 'object' && error !== null && 'code' in error ? String(error.code).toUpperCase() : ''
  if (['PRIVACY_REQUIRED', 'CLOUD_PRIVACY_REQUIRED'].includes(code)) return '当前仅使用本地功能。请先在隐私设置中允许联网，再启用联网音色。'
  if (['CONFIG_REQUIRED', 'SETUP_REQUIRED', 'NOT_CONFIGURED', 'MISSING_PROVIDER_CONFIGURATION'].includes(code)) return '联网语音服务尚未配置完成。请先在电脑的本机配置入口填写 Azure 服务信息。'
  if (['UNAUTHORIZED', 'AUTH_REQUIRED', 'INVALID_TOKEN', 'PROXY_AUTH_FAILED'].includes(code)) return '语音服务访问口令不正确，请检查连接设置后重试。'
  if (['AZURE_AUTH', 'AZURE_AUTH_FAILED', 'UPSTREAM_AUTH_FAILED', 'PROVIDER_AUTH'].includes(code)) return 'Azure 服务认证失败，请在服务端检查密钥与区域。'
  if (['VOICE_UNAVAILABLE', 'INVALID_VOICE', 'NO_VOICES'].includes(code)) return '所选联网音色在当前服务中不可用，请重新连接并选择已确认可用的音色。'
  if (['BUDGET_EXCEEDED', 'DAILY_BUDGET_EXCEEDED', 'DAILY_LIMIT'].includes(code)) return '今日联网朗读额度已用完，可以切回设备声音继续学习。'
  if (['RATE_LIMITED', 'TOO_MANY_REQUESTS', 'UPSTREAM_RATE_LIMITED', 'PROVIDER_RATE_LIMIT', 'BUSY'].includes(code)) return '联网语音服务当前繁忙，请稍后手动重试。'
  if (['TIMEOUT', 'UPSTREAM_TIMEOUT', 'PROVIDER_TIMEOUT'].includes(code)) return '联网语音服务响应超时，请检查连接后重试。'
  if (code === 'PROVIDER_NETWORK') return '语音服务暂时无法连接 Azure，请检查服务端网络后重试。'
  if (code === 'PROVIDER_UNAVAILABLE') return 'Azure 语音服务暂时不可用，请稍后手动重试。'
  if (code === 'INVALID_REQUEST') return '朗读内容或声音参数不符合要求，请调整后重试。'
  if (code === 'PLAYBACK_FAILED') return '音频播放未完成，请再次点击试听并检查设备音量。'
  if (code === 'INVALID_AUDIO') return '语音服务未返回可播放的音频，请检查服务配置。'
  return '联网朗读未完成，请检查语音服务地址与网络后重试。'
}

function effectivePrivacyChoice(): PrivacyChoice | undefined {
  try { return readEffectivePrivacyDecision()?.choice } catch { return undefined }
}

interface RequestDependencies { fetch?: typeof fetch; privacyChoice?: () => PrivacyChoice | undefined }

async function checkedResponse(response: Response): Promise<Response> {
  if (response.ok) return response
  let code = response.status === 401 || response.status === 403 ? 'UNAUTHORIZED'
    : response.status === 429 ? 'RATE_LIMITED' : 'SERVICE_UNAVAILABLE'
  // Only a bounded symbolic code is accepted; upstream messages/headers can contain secrets.
  try {
    const body = JSON.parse(new TextDecoder().decode(await boundedBytes(response, 32 * 1024)))
    if (typeof body?.detail?.code === 'string' && /^[A-Za-z_]{1,64}$/.test(body.detail.code)) code = body.detail.code
  } catch { /* Preserve the safe status-based category. */ }
  throw new CloudSpeechError(code)
}

async function boundedBytes(response: Response, limit: number): Promise<Uint8Array> {
  const length = Number(response.headers.get('content-length'))
  if (Number.isFinite(length) && length > limit) throw new CloudSpeechError('INVALID_AUDIO')
  const reader = response.body?.getReader()
  if (!reader) return new Uint8Array()
  const chunks: Uint8Array[] = []
  let total = 0
  try {
    while (true) {
      const { value, done } = await reader.read()
      if (done) break
      total += value.byteLength
      if (total > limit) { await reader.cancel(); throw new CloudSpeechError('INVALID_AUDIO') }
      chunks.push(value)
    }
  } finally { reader.releaseLock() }
  const bytes = new Uint8Array(total)
  let offset = 0
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength }
  return bytes
}

function safeAvailableVoices(value: unknown): CloudVoice[] {
  if (!Array.isArray(value)) return []
  const seen = new Set<string>()
  return value.slice(0, 100).flatMap(item => {
    if (!item || typeof item !== 'object' || !allowedVoiceIds.has(item.id) || item.verified !== true || seen.has(item.id)) return []
    seen.add(item.id)
    const official = CLOUD_VOICE_CATALOG.find(voice => voice.id === item.id)!
    return [{ ...official, verified: true }]
  })
}

export async function fetchCloudVoices(config: CloudSpeechConfig, signal?: AbortSignal, dependencies: RequestDependencies = {}): Promise<CloudVoicesResponse> {
  const normalized = normalizeConfig(config)
  if (!normalized?.serviceUrl || !normalized.accessToken) throw new CloudSpeechError('CONFIG_REQUIRED')
  const privacyChoice = dependencies.privacyChoice ?? effectivePrivacyChoice
  if (privacyChoice() !== 'accepted') throw new CloudSpeechError('PRIVACY_REQUIRED')
  const controller = new AbortController()
  let timedOut = false
  const abort = () => controller.abort()
  if (signal?.aborted) throw new CloudSpeechError('CANCELLED')
  signal?.addEventListener('abort', abort, { once: true })
  const timer = setTimeout(() => { timedOut = true; controller.abort() }, 10000)
  try {
    const response = await checkedResponse(await (dependencies.fetch ?? fetch)(`${normalized.serviceUrl}/v1/voices`, {
      headers: { Authorization: `Bearer ${normalized.accessToken}` }, signal: controller.signal,
      cache: 'no-store', credentials: 'omit', redirect: 'error',
    }))
    if (signal?.aborted) throw new CloudSpeechError('CANCELLED')
    if (privacyChoice() !== 'accepted') throw new CloudSpeechError('PRIVACY_REQUIRED')
    const body = JSON.parse(new TextDecoder().decode(await boundedBytes(response, 256 * 1024)))
    if (signal?.aborted) throw new CloudSpeechError('CANCELLED')
    if (privacyChoice() !== 'accepted') throw new CloudSpeechError('PRIVACY_REQUIRED')
    const configured = body?.configured === true
    return { configured, voices: configured ? safeAvailableVoices(body.voices) : [], catalog: CLOUD_VOICE_CATALOG.map(voice => ({ ...voice })),
      ...(typeof body?.reason === 'string' && /^[A-Za-z_]{1,64}$/.test(body.reason) ? { reason: body.reason } : {}) }
  } catch (error) {
    if (timedOut) throw new CloudSpeechError('TIMEOUT')
    if (signal?.aborted) throw new CloudSpeechError('CANCELLED')
    if (error instanceof CloudSpeechError) throw error
    throw new CloudSpeechError('NETWORK')
  } finally { clearTimeout(timer); signal?.removeEventListener('abort', abort) }
}

interface PlaybackDependencies extends RequestDependencies {
  readConfig?: () => CloudSpeechConfig
  createAudio?: () => HTMLAudioElement
  createObjectURL?: (blob: Blob) => string
  revokeObjectURL?: (url: string) => void
}

/** One request at a time; cancellation completes immediately even if a transport ignores AbortSignal. */
export class CloudSpeechPlayer implements CloudSpeechAdapter {
  private active: { finish: (played: boolean, error?: CloudSpeechError) => void } | null = null
  constructor(private readonly dependencies: PlaybackDependencies = {}) {}
  private config() { return (this.dependencies.readConfig ?? readCloudSpeechConfig)() }
  isEnabled(): boolean { return this.config().enabled === true }
  stop(): void { this.active?.finish(false) }

  speak(text: string, rate: number, pitch: number): Promise<boolean> {
    this.stop()
    return new Promise((resolve, reject) => {
      const config = normalizeConfig(this.config())
      const privacyChoice = this.dependencies.privacyChoice ?? effectivePrivacyChoice
      const controller = new AbortController()
      let finished = false
      let timer: ReturnType<typeof setTimeout> | undefined
      let audio: HTMLAudioElement | undefined
      let objectUrl: string | undefined
      const stillAllowed = () => {
        const current = normalizeConfig(this.config())
        return privacyChoice() === 'accepted' && current?.enabled === true
          && current.serviceUrl === config?.serviceUrl && current.accessToken === config?.accessToken && current.voiceId === config?.voiceId
      }
      const changed = () => { if (!stillAllowed()) finish(false) }
      const finish = (played: boolean, error?: CloudSpeechError) => {
        if (finished) return
        finished = true
        if (timer !== undefined) clearTimeout(timer)
        controller.abort()
        if (audio) {
          audio.onended = null; audio.onerror = null
          audio.pause(); audio.removeAttribute('src'); audio.load()
        }
        if (objectUrl) (this.dependencies.revokeObjectURL ?? URL.revokeObjectURL)(objectUrl)
        if (typeof window !== 'undefined') {
          window.removeEventListener(PRIVACY_UPDATED_EVENT, changed)
          window.removeEventListener(CLOUD_SPEECH_UPDATED_EVENT, changed)
        }
        if (this.active?.finish === finish) this.active = null
        if (error) reject(error)
        else resolve(played)
      }
      this.active = { finish }
      if (!config?.enabled) { finish(false); return }
      if (privacyChoice() !== 'accepted') { finish(false, new CloudSpeechError('PRIVACY_REQUIRED')); return }
      if (typeof text !== 'string' || !text.trim() || text.length > MAX_SPEECH_TEXT_LENGTH
        || !Number.isFinite(rate) || rate < 0.5 || rate > 1.5 || !SPEECH_PITCHES.includes(pitch as typeof SPEECH_PITCHES[number])) {
        finish(false, new CloudSpeechError('INVALID_REQUEST')); return
      }
      if (typeof window !== 'undefined') {
        window.addEventListener(PRIVACY_UPDATED_EVENT, changed)
        window.addEventListener(CLOUD_SPEECH_UPDATED_EVENT, changed)
      }
      timer = setTimeout(() => finish(false, new CloudSpeechError('TIMEOUT')), 20000)
      void (async () => {
        try {
          const response = await checkedResponse(await (this.dependencies.fetch ?? fetch)(`${config.serviceUrl}/v1/speech`, {
            method: 'POST', headers: { Authorization: `Bearer ${config.accessToken}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ text, voiceId: config.voiceId, rate, pitch }), signal: controller.signal,
            credentials: 'omit', cache: 'no-store', redirect: 'error',
          }))
          if (finished) return
          if (!stillAllowed()) { finish(false); return }
          if (response.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !== 'audio/mpeg') throw new CloudSpeechError('INVALID_AUDIO')
          const bytes = await boundedBytes(response, MAX_AUDIO_BYTES)
          if (finished) return
          if (!stillAllowed()) { finish(false); return }
          if (!bytes.byteLength) throw new CloudSpeechError('INVALID_AUDIO')
          clearTimeout(timer)
          const blob = new Blob([bytes.buffer as ArrayBuffer], { type: 'audio/mpeg' })
          objectUrl = (this.dependencies.createObjectURL ?? URL.createObjectURL)(blob)
          audio = (this.dependencies.createAudio ?? (() => new Audio()))()
          audio.src = objectUrl
          audio.onended = () => finish(true)
          audio.onerror = () => finish(false, new CloudSpeechError('PLAYBACK_FAILED'))
          timer = setTimeout(() => finish(false, new CloudSpeechError('TIMEOUT')), speechTimeoutMs(text, rate))
          await audio.play()
        } catch (error) {
          if (finished) return
          finish(false, error instanceof CloudSpeechError ? error : new CloudSpeechError(audio ? 'PLAYBACK_FAILED' : 'NETWORK'))
        }
      })()
    })
  }
}

export const cloudSpeech = new CloudSpeechPlayer()
