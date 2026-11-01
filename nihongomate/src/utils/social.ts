import { Capacitor } from '@capacitor/core'
import { PRIVACY_UPDATED_EVENT, readEffectivePrivacyDecision } from './privacy'

export interface SocialUser {
  id: string
  username: string
  nickname: string
  level: string
  bio: string
  discoverable: boolean
}
export interface FriendRequest { id: string; user: SocialUser; created_at: string }
export interface FriendState { friends: SocialUser[]; incoming: FriendRequest[]; outgoing: FriendRequest[] }
export interface StudyRoom {
  id: string
  title: string
  description: string
  level: string
  capacity: number
  member_count: number
  owner_id: string
  is_member: boolean
  visibility: 'public' | 'private'
  invite_code?: string
}
export interface RoomDetail { room: StudyRoom; members: SocialUser[] }
export interface RoomMessage { id: number; room_id: string; user_id: string; nickname: string; content: string; created_at: string }
export interface SocialState { baseUrl: string; enabled: boolean; token: string; user: SocialUser | null }
export interface SocialSession { token: string; user: SocialUser }
export const SOCIAL_UPDATED_EVENT = 'nihongomate:social-updated'
export const SOCIAL_CONFIG_KEY = 'nihongomate_social_config'
export const SOCIAL_SESSION_KEY = 'nihongomate_social_session'
const LOCAL_SOCIAL_URL = 'http://127.0.0.1:8001'
const BUILD_SOCIAL_URL = import.meta.env?.VITE_SOCIAL_API_URL?.trim() ?? ''
export const DEFAULT_SOCIAL_URL = Capacitor.isNativePlatform() ? BUILD_SOCIAL_URL : LOCAL_SOCIAL_URL

interface ClientOptions {
  storage: Storage
  sessionStorage: Storage
  fetch: typeof globalThis.fetch
  isAllowed: () => boolean
  notify?: () => void
  timeoutMs?: number
  nativePlatform?: boolean
  defaultUrl?: string
}
interface RequestOptions { method?: string; body?: unknown; signal?: AbortSignal }

export class SocialError extends Error {
  constructor(message: string, public readonly status = 0) { super(message); this.name = 'SocialError' }
}

/** 在线身份与本地学习资料分离。地址持久保存，登录令牌只保留在浏览器会话。 */
export class SocialClient {
  private state: SocialState = { baseUrl: '', enabled: false, token: '', user: null }
  private readonly nativePlatform: boolean
  private controllers = new Set<AbortController>()
  private generation = 0

  constructor(private readonly options: ClientOptions) {
    this.nativePlatform = options.nativePlatform ?? Capacitor.isNativePlatform()
    const defaultUrl = options.defaultUrl ?? (this.nativePlatform ? BUILD_SOCIAL_URL : LOCAL_SOCIAL_URL)
    if (defaultUrl.trim()) {
      try { this.state.baseUrl = normalizeSocialUrl(defaultUrl, this.nativePlatform) }
      catch { /* 无效构建地址不启用联网，用户仍可手动配置。 */ }
    }
    try {
      const config = JSON.parse(options.storage.getItem(SOCIAL_CONFIG_KEY) || 'null')
      const hasSavedAddress = typeof config?.baseUrl === 'string' && !!config.baseUrl.trim()
      if (hasSavedAddress) this.state.baseUrl = normalizeSocialUrl(config.baseUrl, this.nativePlatform)
      this.state.enabled = hasSavedAddress && config?.enabled === true && options.isAllowed()
      const session = JSON.parse(options.sessionStorage.getItem(SOCIAL_SESSION_KEY) || 'null')
      if (this.state.enabled && validSession(session)) {
        this.state.token = session.token
        this.state.user = { ...session.user }
      } else options.sessionStorage.removeItem(SOCIAL_SESSION_KEY)
    } catch {
      // 手机不得恢复旧版本的本机地址或登录态；已有学习资料不受影响。
      this.state.enabled = false
      this.state.token = ''
      this.state.user = null
      try { options.sessionStorage.removeItem(SOCIAL_SESSION_KEY) } catch { /* 内存身份已清除。 */ }
    }
  }

  getState(): SocialState { return { ...this.state, enabled: this.state.enabled && this.options.isAllowed(), user: this.state.user ? { ...this.state.user } : null } }

  configure(url: string): void {
    if (!this.options.isAllowed()) throw new SocialError('当前仅使用本地功能，请先查看隐私选择并允许联网。')
    const baseUrl = normalizeSocialUrl(url, this.nativePlatform)
    try {
      this.options.storage.setItem(SOCIAL_CONFIG_KEY, JSON.stringify({ baseUrl, enabled: true }))
    } catch { throw new SocialError('本机存储不可用，服务地址未能保存。') }
    if (baseUrl !== this.state.baseUrl) this.clearSession(false)
    this.cancelPending()
    this.state.baseUrl = baseUrl
    this.state.enabled = true
    this.emit()
  }

  disable(): void {
    this.state.enabled = false
    this.clearSession(false)
    try { this.options.storage.setItem(SOCIAL_CONFIG_KEY, JSON.stringify({ baseUrl: this.state.baseUrl, enabled: false })) } catch { /* 本次会话立即停用。 */ }
    this.emit()
  }

  clearSession(emit = true): void {
    this.cancelPending()
    this.state.token = ''
    this.state.user = null
    try { this.options.sessionStorage.removeItem(SOCIAL_SESSION_KEY) } catch { /* 内存身份已清除。 */ }
    if (emit) this.emit()
  }

  setSession(session: SocialSession): void {
    if (!this.state.enabled || !this.options.isAllowed()) throw new SocialError('联网功能已关闭，请重新开启。')
    if (!validSession(session)) throw new SocialError('服务器返回的登录资料无效。')
    try { this.options.sessionStorage.setItem(SOCIAL_SESSION_KEY, JSON.stringify(session)) }
    catch { throw new SocialError('会话存储不可用，无法保留本次登录。') }
    this.cancelPending()
    this.state.token = session.token
    this.state.user = { ...session.user }
    this.emit()
  }

  cancelPending(): void {
    this.generation += 1
    this.controllers.forEach(controller => controller.abort())
    this.controllers.clear()
  }

  async request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    if (!this.state.baseUrl) throw new SocialError('多人学习服务尚未配置，暂时无法使用好友和自习室。')
    if (!this.state.enabled || !this.options.isAllowed()) throw new SocialError('联网功能未开启，当前不会发送网络请求。')
    if (!/^\/api\/(?!\/)/.test(path) || path.includes('://') || path.includes('\\')) throw new SocialError('无效的接口路径。')
    const generation = this.generation
    const controller = new AbortController()
    const abort = () => controller.abort()
    options.signal?.addEventListener('abort', abort, { once: true })
    if (options.signal?.aborted) controller.abort()
    this.controllers.add(controller)
    let timedOut = false
    const timer = setTimeout(() => { timedOut = true; controller.abort() }, this.options.timeoutMs ?? 8000)
    try {
      if (controller.signal.aborted) throw new SocialError('请求已取消。')
      const response = await this.options.fetch(`${this.state.baseUrl}${path}`, {
        method: options.method ?? 'GET',
        headers: { Accept: 'application/json', ...(options.body === undefined ? {} : { 'Content-Type': 'application/json' }), ...(this.state.token ? { Authorization: `Bearer ${this.state.token}` } : {}) },
        body: options.body === undefined ? undefined : JSON.stringify(options.body),
        signal: controller.signal,
        credentials: 'omit',
        cache: 'no-store',
        redirect: 'error',
        referrerPolicy: 'no-referrer',
      })
      const data: unknown = await response.json().catch(() => null)
      if (controller.signal.aborted || generation !== this.generation || !this.options.isAllowed()) throw new SocialError('请求已取消。')
      if (!response.ok) {
        if (response.status === 401 && this.state.token) this.clearSession()
        const detail = data && typeof data === 'object' && 'detail' in data ? data.detail : null
        const message = response.status >= 500 ? '服务暂时不可用，请稍后重试。' : typeof detail === 'string' ? detail : response.status === 422 ? '输入内容不符合要求，请检查长度和格式。' : `请求失败（${response.status}），请重试。`
        throw new SocialError(message, response.status)
      }
      return data as T
    } catch (error) {
      if (timedOut) throw new SocialError('请求超时，请检查服务是否运行；发送失败的消息可重试。')
      if (error instanceof SocialError) throw error
      if (controller.signal.aborted || generation !== this.generation) throw new SocialError('请求已取消。')
      throw new SocialError('无法连接学习服务，请检查地址和网络后重试。')
    } finally {
      clearTimeout(timer)
      options.signal?.removeEventListener('abort', abort)
      this.controllers.delete(controller)
    }
  }

  private emit(): void { this.options.notify?.() }
}

function validSession(value: unknown): value is SocialSession {
  if (!value || typeof value !== 'object') return false
  const session = value as Partial<SocialSession>
  return typeof session.token === 'string' && !!session.token && !!session.user && typeof session.user.id === 'string' && typeof session.user.username === 'string' && typeof session.user.nickname === 'string'
}

function isLoopbackHost(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/\.+$/, '')
  return host === 'localhost' || host.endsWith('.localhost') || /^127(?:\.\d{1,3}){3}$/.test(host)
    || host === '[::1]' || /^\[::ffff:7f[0-9a-f]{2}:[0-9a-f]{1,4}\]$/.test(host)
}

export function normalizeSocialUrl(value: string, nativePlatform = false): string {
  if (!value.trim()) throw new SocialError('多人学习服务尚未配置，请填写完整服务地址。')
  let url: URL
  try { url = new URL(value.trim()) } catch { throw new SocialError(nativePlatform ? '请输入完整的 HTTPS 服务地址。' : '请输入完整服务地址，例如 http://127.0.0.1:8001。') }
  if (url.username || url.password || !/^[a-z][a-z0-9+.-]*:\/\/[^/?#\\\\]+\/?$/i.test(value.trim())) throw new SocialError('服务地址只填写协议、域名和端口，不包含路径或账号。')
  const local = isLoopbackHost(url.hostname)
  if (nativePlatform) {
    if (url.protocol !== 'https:') throw new SocialError('手机多人学习服务必须使用 HTTPS 地址。')
    if (local || ['0.0.0.0', '[::]'].includes(url.hostname)) throw new SocialError('手机无法使用本机回环地址，请配置可访问的 HTTPS 服务地址。')
  } else if (url.protocol !== 'https:' && !(url.protocol === 'http:' && local)) {
    throw new SocialError('远程服务必须使用 HTTPS；HTTP 仅限本机开发地址。')
  }
  return url.origin
}

export const socialClient = new SocialClient({
  get storage() { return localStorage },
  get sessionStorage() { return sessionStorage },
  fetch: (...args) => globalThis.fetch(...args),
  isAllowed: () => typeof localStorage !== 'undefined' && readEffectivePrivacyDecision()?.choice === 'accepted',
  notify: () => { if (typeof window !== 'undefined') window.dispatchEvent(new Event(SOCIAL_UPDATED_EVENT)) },
})

if (typeof window !== 'undefined') window.addEventListener(PRIVACY_UPDATED_EVENT, () => {
  if (readEffectivePrivacyDecision()?.choice !== 'accepted') socialClient.disable()
})
