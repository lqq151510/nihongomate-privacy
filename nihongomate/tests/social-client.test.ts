import { describe, expect, test } from 'bun:test'
import { SocialClient, SocialError, normalizeSocialUrl, SOCIAL_CONFIG_KEY, SOCIAL_SESSION_KEY, type SocialUser } from '../src/utils/social'

class MemoryStorage implements Storage {
  private values = new Map<string, string>()
  get length() { return this.values.size }
  clear() { this.values.clear() }
  getItem(key: string) { return this.values.get(key) ?? null }
  key(index: number) { return [...this.values.keys()][index] ?? null }
  removeItem(key: string) { this.values.delete(key) }
  setItem(key: string, value: string) { this.values.set(key, value) }
}
const user: SocialUser = { id: 'a', username: 'learner_a', nickname: '甲', level: 'N5', bio: '', discoverable: false }
function fixture(fetcher: typeof fetch = async () => Response.json({ ok: true }), timeoutMs = 1000, options: { nativePlatform?: boolean; defaultUrl?: string } = {}) {
  const storage = new MemoryStorage()
  const sessionStorage = new MemoryStorage()
  let allowed = true
  let calls = 0
  const client = new SocialClient({ storage, sessionStorage, isAllowed: () => allowed, fetch: ((...args: Parameters<typeof fetch>) => { calls++; return fetcher(...args) }) as typeof fetch, timeoutMs, ...options })
  return { client, storage, sessionStorage, calls: () => calls, revoke: () => { allowed = false } }
}

describe('online client privacy and identity boundaries', () => {
  test('disabled client never makes a request', async () => {
    const f = fixture()
    await expect(f.client.request('/api/me')).rejects.toThrow('未开启')
    expect(f.calls()).toBe(0)
  })
  test('local-only prevents enabling and all network access', async () => {
    const f = fixture()
    f.revoke()
    expect(() => f.client.configure('http://127.0.0.1:8001')).toThrow('仅使用本地')
    await expect(f.client.request('/api/users')).rejects.toThrow()
    expect(f.calls()).toBe(0)
  })
  test('password is never saved and bearer token lives only in session storage', async () => {
    let sent: RequestInit | undefined
    const f = fixture((async (_url, init) => { sent = init; return Response.json(user) }) as typeof fetch)
    f.client.configure('http://127.0.0.1:8001/')
    f.client.setSession({ token: 'test-session', user })
    await f.client.request('/api/me')
    expect((sent?.headers as Record<string, string>).Authorization).toBe('Bearer test-session')
    expect(sent?.credentials).toBe('omit')
    expect(sent?.redirect).toBe('error')
    expect(f.storage.getItem(SOCIAL_CONFIG_KEY)).not.toContain('test-session')
    expect(f.sessionStorage.getItem(SOCIAL_SESSION_KEY)).toContain('test-session')
    f.client.clearSession()
    expect(f.sessionStorage.getItem(SOCIAL_SESSION_KEY)).toBeNull()
  })
  test('changing server clears the old identity before any new request', () => {
    const f = fixture()
    f.client.configure('http://127.0.0.1:8001')
    f.client.setSession({ token: 'old-server', user })
    f.client.configure('https://study.example.com')
    expect(f.client.getState().token).toBe('')
    expect(f.client.getState().user).toBeNull()
  })
  test('401 clears identity and preserves the actual authentication error', async () => {
    const f = fixture(async () => Response.json({ detail: '登录已失效' }, { status: 401 }))
    f.client.configure('http://127.0.0.1:8001')
    f.client.setSession({ token: 'expired', user })
    try { await f.client.request('/api/me'); throw new Error('expected failure') }
    catch (e) { expect(e).toBeInstanceOf(SocialError); expect((e as SocialError).status).toBe(401); expect((e as Error).message).toBe('登录已失效') }
    expect(f.client.getState().token).toBe('')
  })
  test('revocation during a request discards the late response', async () => {
    let resolve!: (value: Response) => void
    const f = fixture((() => new Promise<Response>(r => { resolve = r })) as typeof fetch)
    f.client.configure('http://127.0.0.1:8001')
    const pending = f.client.request('/api/me')
    f.revoke()
    resolve(Response.json(user))
    await expect(pending).rejects.toThrow('取消')
  })
  test('disable aborts in-flight requests even if fetch resolves after abort', async () => {
    let resolve!: (value: Response) => void
    let signal: AbortSignal | undefined
    const f = fixture(((_url, init) => { signal = init?.signal ?? undefined; return new Promise<Response>(r => { resolve = r }) }) as typeof fetch)
    f.client.configure('http://127.0.0.1:8001')
    const pending = f.client.request('/api/users')
    f.client.disable()
    expect(signal?.aborted).toBe(true)
    resolve(Response.json([]))
    await expect(pending).rejects.toThrow('取消')
    expect(f.client.getState().enabled).toBe(false)
  })
  test('timeout is bounded and mutations are not automatically retried', async () => {
    const f = fixture((async (_url, init) => new Promise((_resolve, reject) => init?.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError'))))) as typeof fetch, 10)
    f.client.configure('http://127.0.0.1:8001')
    await expect(f.client.request('/api/rooms', { method: 'POST', body: { title: '共学' } })).rejects.toThrow('超时')
    expect(f.calls()).toBe(1)
  })
  test('server errors do not reveal internal details', async () => {
    const f = fixture(async () => Response.json({ detail: 'private database path' }, { status: 500 }))
    f.client.configure('http://127.0.0.1:8001')
    await expect(f.client.request('/api/users')).rejects.toThrow('服务暂时不可用')
  })
  test('corrupt storage does not restore identity or prevent local use', () => {
    const storage = new MemoryStorage()
    storage.setItem(SOCIAL_CONFIG_KEY, '{broken')
    const client = new SocialClient({ storage, sessionStorage: storage, fetch, isAllowed: () => true })
    expect(client.getState().enabled).toBe(false)
    expect(client.getState().token).toBe('')
  })
  test('unavailable config storage does not pretend networking was enabled', () => {
    const f = fixture()
    f.storage.setItem = () => { throw new Error('full') }
    expect(() => f.client.configure('http://127.0.0.1:8001')).toThrow('未能保存')
    expect(f.client.getState().enabled).toBe(false)
  })
  test('external request paths cannot receive the bearer token', async () => {
    const f = fixture()
    f.client.configure('http://127.0.0.1:8001')
    await expect(f.client.request('https://elsewhere.example/api/me')).rejects.toThrow('接口路径')
    expect(f.calls()).toBe(0)
  })
})

describe('native service configuration', () => {
  test('native app without a service has no local fallback and sends no request', async () => {
    const f = fixture(undefined, 1000, { nativePlatform: true, defaultUrl: '' })
    expect(f.client.getState()).toMatchObject({ baseUrl: '', enabled: false, token: '', user: null })
    expect(() => f.client.configure('')).toThrow('尚未配置')
    await expect(f.client.request('/api/users')).rejects.toThrow('尚未配置')
    expect(f.calls()).toBe(0)
  })
  test('browser retains the explicit local development default without enabling networking', () => {
    const f = fixture(undefined, 1000, { nativePlatform: false })
    expect(f.client.getState()).toMatchObject({ baseUrl: 'http://127.0.0.1:8001', enabled: false })
  })
  test.each([
    'http://127.0.0.1:8001', 'http://localhost:8001', 'http://study.example.com',
    'https://localhost', 'https://localhost.', 'https://room.localhost',
    'https://127.0.0.1', 'https://127.123.45.67', 'https://127.1', 'https://2130706433',
    'https://[::1]', 'https://[0:0:0:0:0:0:0:1]', 'https://[::ffff:127.0.0.1]',
    'https://0.0.0.0', 'https://[::]',
  ])('native rejects HTTP or local-only service address %s', url => {
    const f = fixture(undefined, 1000, { nativePlatform: true, defaultUrl: '' })
    expect(() => f.client.configure(url)).toThrow()
    expect(f.client.getState().enabled).toBe(false)
    expect(f.calls()).toBe(0)
  })
  test('native accepts a remote HTTPS service only after explicit enabling', async () => {
    const f = fixture(undefined, 1000, { nativePlatform: true, defaultUrl: '' })
    f.client.configure('https://study.example.com:8443/')
    expect(f.client.getState()).toMatchObject({ baseUrl: 'https://study.example.com:8443', enabled: true })
    await f.client.request('/api/users')
    expect(f.calls()).toBe(1)
    f.client.disable()
    await expect(f.client.request('/api/users')).rejects.toThrow('未开启')
    expect(f.calls()).toBe(1)
  })
  test('a build-provided HTTPS default never grants upload consent or restores an unbound token', async () => {
    const f = fixture(undefined, 1000, { nativePlatform: true, defaultUrl: 'https://study.example.com' })
    expect(f.client.getState()).toMatchObject({ baseUrl: 'https://study.example.com', enabled: false })
    await expect(f.client.request('/api/users')).rejects.toThrow('未开启')
    expect(f.calls()).toBe(0)
    f.revoke()
    expect(() => f.client.configure('https://study.example.com')).toThrow('仅使用本地')
  })
  test.each(['http://127.0.0.1:8001', 'https://localhost', 'https://127.2.3.4', 'https://[::1]'])('native drops old local configuration and token: %s', baseUrl => {
    const storage = new MemoryStorage()
    const sessionStorage = new MemoryStorage()
    storage.setItem(SOCIAL_CONFIG_KEY, JSON.stringify({ baseUrl, enabled: true }))
    sessionStorage.setItem(SOCIAL_SESSION_KEY, JSON.stringify({ token: 'old-local-session', user }))
    const client = new SocialClient({ storage, sessionStorage, fetch, isAllowed: () => true, nativePlatform: true, defaultUrl: 'https://study.example.com' })
    expect(client.getState()).toMatchObject({ baseUrl: 'https://study.example.com', enabled: false, token: '', user: null })
    expect(sessionStorage.getItem(SOCIAL_SESSION_KEY)).toBeNull()
  })
  test('native does not restore an orphan token when only a build default exists', () => {
    const storage = new MemoryStorage()
    const sessionStorage = new MemoryStorage()
    sessionStorage.setItem(SOCIAL_SESSION_KEY, JSON.stringify({ token: 'orphan', user }))
    const client = new SocialClient({ storage, sessionStorage, fetch, isAllowed: () => true, nativePlatform: true, defaultUrl: 'https://study.example.com' })
    expect(client.getState()).toMatchObject({ enabled: false, token: '', user: null })
    expect(sessionStorage.getItem(SOCIAL_SESSION_KEY)).toBeNull()
  })
  test('native restores a previously enabled valid HTTPS service and its session', () => {
    const storage = new MemoryStorage()
    const sessionStorage = new MemoryStorage()
    storage.setItem(SOCIAL_CONFIG_KEY, JSON.stringify({ baseUrl: 'https://study.example.com', enabled: true }))
    sessionStorage.setItem(SOCIAL_SESSION_KEY, JSON.stringify({ token: 'cloud-session', user }))
    const client = new SocialClient({ storage, sessionStorage, fetch, isAllowed: () => true, nativePlatform: true, defaultUrl: '' })
    expect(client.getState()).toMatchObject({ baseUrl: 'https://study.example.com', enabled: true, token: 'cloud-session' })
  })
  test.each(['https://name:pass@study.example.com', 'https://study.example.com/api', 'https://study.example.com/?q=1', 'https://study.example.com/#room', 'https://study.example.com/api/..', 'https://study.example.com/%2e%2e', 'https://study.example.com/?', 'https://study.example.com/#'])('native rejects credentials or path/query/fragment: %s', url => {
    expect(() => normalizeSocialUrl(url, true)).toThrow()
  })
  test('an invalid injected native default remains unconfigured and cannot send requests', async () => {
    const f = fixture(undefined, 1000, { nativePlatform: true, defaultUrl: 'https://127.0.0.1' })
    expect(f.client.getState()).toMatchObject({ baseUrl: '', enabled: false })
    await expect(f.client.request('/api/users')).rejects.toThrow('尚未配置')
    expect(f.calls()).toBe(0)
  })
})

describe('server URL validation', () => {
  test.each(['http://192.168.1.4:8001', 'ftp://study.example.com', 'https://name:pass@study.example.com', 'https://study.example.com/api', 'https://study.example.com/?token=x', 'javascript:alert(1)'])('rejects unsafe or ambiguous URL %s', url => {
    expect(() => normalizeSocialUrl(url)).toThrow()
  })
  test.each(['http://localhost:8001', 'http://127.0.0.1:8001', 'https://study.example.com'])('accepts explicit local development or HTTPS %s', url => {
    expect(normalizeSocialUrl(`${url}/`)).toBe(url)
  })
})
