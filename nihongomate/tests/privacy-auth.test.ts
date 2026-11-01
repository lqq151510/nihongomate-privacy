import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { AuthManager } from '../src/utils/auth'
import { AudioEngine } from '../src/utils/audio'
import { PRIVACY_STORAGE_KEY, PRIVACY_VERSION, readPrivacyDecision, readEffectivePrivacyDecision, savePrivacyDecision } from '../src/utils/privacy'

// Tests use an isolated in-memory store and simulated speech services only.
class MemoryStorage implements Storage {
  private entries = new Map<string, string>()
  get length() { return this.entries.size }
  clear() { this.entries.clear() }
  getItem(key: string) { return this.entries.get(key) ?? null }
  key(index: number) { return [...this.entries.keys()][index] ?? null }
  removeItem(key: string) { this.entries.delete(key) }
  setItem(key: string, value: string) { this.entries.set(key, value) }
}

const profileKey = 'nihongomate_user_auth'
const smsKey = 'nihongomate_last_sms_info'

describe('local profile migration', () => {
  test('removes simulated credentials while preserving chosen profile and unrelated learning data', () => {
    const storage = new MemoryStorage()
    const original = {
      uid: 'guest_fixture', nickname: '日语练习者', avatar: 'data:image/png;base64,fixture',
      bio: '每天学习一点', registeredAt: '2026-10-01', isLoggedIn: true,
      phone: '100****0000', rawPhone: '10000000000',
    }
    storage.setItem(profileKey, JSON.stringify(original))
    storage.setItem(smsKey, JSON.stringify({ phone: original.rawPhone, code: '000000' }))
    storage.setItem('nihongomate_study', '{"saved":"learning progress"}')
    const manager = new AuthManager(storage)
    expect(manager.getProfile()).toEqual({
      uid: original.uid, nickname: original.nickname, avatar: original.avatar,
      bio: original.bio, theme: 'sakura', registeredAt: original.registeredAt, isLoggedIn: false,
    })
    const migrated = JSON.parse(storage.getItem(profileKey)!)
    expect(migrated).not.toHaveProperty('phone')
    expect(migrated).not.toHaveProperty('rawPhone')
    expect(storage.getItem(smsKey)).toBeNull()
    expect(storage.getItem('nihongomate_study')).toBe('{"saved":"learning progress"}')
    expect(manager.getProfile()).toEqual(migrated)
  })

  test('corrupt profile does not keep legacy SMS information or prevent guest use', () => {
    const storage = new MemoryStorage()
    storage.setItem(profileKey, '{broken')
    storage.setItem(smsKey, 'legacy-sms')
    const manager = new AuthManager(storage)
    const profile = manager.getProfile()
    expect(profile.isLoggedIn).toBe(false)
    expect(profile.uid).toStartWith('local_')
    expect(storage.getItem(smsKey)).toBeNull()
    expect(manager.getProfile().uid).toBe(profile.uid)
  })

  test('local profile editing and reset do not clear learning records', () => {
    const storage = new MemoryStorage()
    storage.setItem('nihongomate_study', 'keep-me')
    const manager = new AuthManager(storage)
    expect(manager.updateProfile({ nickname: '  新昵称  ', avatar: '📘', bio: '加油' })).toBe(true)
    expect(manager.getProfile().nickname).toBe('新昵称')
    expect(manager.getProfile().avatar).toBe('📘')
    expect(manager.resetProfile()).toBe(true)
    expect(manager.getProfile().nickname).toBe('日语研习生')
    expect(manager.getProfile().avatar).toBe('🌸')
    expect(storage.getItem('nihongomate_study')).toBe('keep-me')
  })

  test('storage failure allows guest use but reports that profile edits were not saved', () => {
    const storage = new MemoryStorage()
    storage.setItem = () => { throw new Error('quota exceeded') }
    const manager = new AuthManager(storage)
    expect(manager.getProfile().isLoggedIn).toBe(false)
    expect(manager.updateProfile({ nickname: '未保存' })).toBe(false)
  })
})

describe('versioned privacy choices', () => {
  test('unversioned consent from an older app does not count as current consent', () => {
    const storage = new MemoryStorage()
    storage.setItem('nihongomate_privacy_agreed', 'true')
    expect(readPrivacyDecision(storage)).toBeNull()
  })

  test.each(['accepted', 'local-only'] as const)('remembers the explicit %s choice and current policy version', choice => {
    const storage = new MemoryStorage()
    storage.setItem('nihongomate_privacy_agreed', 'true')
    expect(savePrivacyDecision(choice, storage)).toBe(true)
    expect(readPrivacyDecision(storage)).toEqual({ version: PRIVACY_VERSION, choice })
    expect(storage.getItem('nihongomate_privacy_agreed')).toBeNull()
  })

  test('old, malformed and unknown choices require a new decision', () => {
    const storage = new MemoryStorage()
    for (const value of [
      JSON.stringify({ version: '2026-01-01', choice: 'accepted' }),
      JSON.stringify({ version: PRIVACY_VERSION, choice: true }),
      '{broken', 'null',
    ]) {
      storage.setItem(PRIVACY_STORAGE_KEY, value)
      expect(readPrivacyDecision(storage)).toBeNull()
    }
  })

  test('unavailable storage is not mistaken for consent', () => {
    const storage = new MemoryStorage()
    storage.getItem = () => { throw new Error('storage blocked') }
    storage.setItem = () => { throw new Error('storage blocked') }
    expect(readPrivacyDecision(storage)).toBeNull()
    expect(savePrivacyDecision('accepted', storage)).toBe(false)
  })
})

class UtteranceStub {
  lang = ''
  rate = 1
  pitch = 1
  voice: SpeechSynthesisVoice | null = null
  onend: (() => void) | null = null
  onerror: ((event: { error: string }) => void) | null = null
  constructor(public text: string) {}
}
const originalUtterance = globalThis.SpeechSynthesisUtterance
beforeAll(() => { globalThis.SpeechSynthesisUtterance = UtteranceStub as unknown as typeof SpeechSynthesisUtterance })
afterAll(() => {
  if (originalUtterance) globalThis.SpeechSynthesisUtterance = originalUtterance
  else Reflect.deleteProperty(globalThis, 'SpeechSynthesisUtterance')
})
function speechFixture(voices: { lang: string; localService: boolean }[], finishImmediately = true) {
  const spoken: UtteranceStub[] = []
  const synth = {
    getVoices: () => voices,
    addEventListener: () => {},
    cancel: () => {},
    speak: (utterance: UtteranceStub) => {
      spoken.push(utterance)
      if (finishImmediately) utterance.onend?.()
    },
  } as unknown as SpeechSynthesis
  return { synth, spoken }
}

describe('device speech availability and local-only choice', () => {
  test('restricting an accepted session removes stale consent when writes fail but deletion succeeds', async () => {
    const storage = new MemoryStorage()
    savePrivacyDecision('accepted', storage)
    const fixture = speechFixture([{ lang: 'ja-JP', localService: false }])
    const engine = new AudioEngine(fixture.synth, () => readEffectivePrivacyDecision(storage)?.choice, () => {})
    expect(await engine.speak('あ')).toBe(true)
    storage.setItem = () => { throw new Error('quota exceeded') }
    expect(savePrivacyDecision('local-only', storage)).toBe(false)
    expect(readPrivacyDecision(storage)).toBeNull()
    expect(storage.getItem(PRIVACY_STORAGE_KEY)).toBeNull()
    expect(readEffectivePrivacyDecision(storage)?.choice).toBe('local-only')
    expect(await engine.speak('い')).toBe(false)
    expect(fixture.spoken).toHaveLength(1)
    expect(readEffectivePrivacyDecision(new MemoryStorage())).toBeNull()
  })

  test('restricting a session still blocks network speech when both persistence and deletion fail', async () => {
    const storage = new MemoryStorage()
    savePrivacyDecision('accepted', storage)
    storage.setItem = () => { throw new Error('storage blocked') }
    storage.removeItem = () => { throw new Error('storage blocked') }
    expect(savePrivacyDecision('local-only', storage)).toBe(false)
    expect(readPrivacyDecision(storage)?.choice).toBe('accepted')
    expect(readEffectivePrivacyDecision(storage)?.choice).toBe('local-only')
    const fixture = speechFixture([{ lang: 'ja-JP', localService: false }])
    const engine = new AudioEngine(fixture.synth, () => readEffectivePrivacyDecision(storage)?.choice, () => {})
    expect(await engine.speak('あ')).toBe(false)
    expect(fixture.spoken).toHaveLength(0)
  })

  test('local-only selects a system-declared local Japanese voice instead of a network voice', async () => {
    const fixture = speechFixture([{ lang: 'ja-JP', localService: false }, { lang: 'ja-JP', localService: true }])
    const notices: string[] = []
    const engine = new AudioEngine(fixture.synth, () => 'local-only', message => notices.push(message))
    expect(await engine.speak('こんにちは')).toBe(true)
    expect(fixture.spoken[0].voice?.localService).toBe(true)
    expect(notices).toEqual([])
  })

  test('local-only blocks network-only Japanese speech without emitting repeated notices', async () => {
    const fixture = speechFixture([{ lang: 'ja-JP', localService: false }])
    const notices: string[] = []
    const engine = new AudioEngine(fixture.synth, () => 'local-only', message => notices.push(message))
    expect(notices).toEqual([])
    expect(await engine.speak('あ')).toBe(false)
    expect(await engine.speak('い')).toBe(false)
    expect(fixture.spoken).toHaveLength(0)
    expect(notices).toHaveLength(1)
  })

  test('accepted policy can use Japanese network speech, but does not fall back to a different language', async () => {
    const fixture = speechFixture([{ lang: 'en-US', localService: true }, { lang: 'ja-JP', localService: false }])
    const engine = new AudioEngine(fixture.synth, () => 'accepted', () => {})
    expect(await engine.speak('あ')).toBe(true)
    expect(fixture.spoken[0].voice?.lang).toBe('ja-JP')
  })

  test('unsupported speech finishes with a notice only after an explicit request', async () => {
    const notices: string[] = []
    const engine = new AudioEngine(null, () => 'accepted', message => notices.push(message))
    expect(notices).toEqual([])
    expect(await engine.speak('あ')).toBe(false)
    expect(notices).toHaveLength(1)
  })

  test('cancel releases a pending caller and ignores a later engine cancellation error', async () => {
    const fixture = speechFixture([{ lang: 'ja-JP', localService: true }], false)
    const notices: string[] = []
    const engine = new AudioEngine(fixture.synth, () => 'local-only', message => notices.push(message))
    const pending = engine.speak('長い対話')
    engine.stop()
    expect(await pending).toBe(false)
    fixture.spoken[0].onerror?.({ error: 'interrupted' })
    expect(notices).toEqual([])
  })

  test('engine failure resolves the caller and provides one actionable notice', async () => {
    const fixture = speechFixture([{ lang: 'ja-JP', localService: true }], false)
    const notices: string[] = []
    const engine = new AudioEngine(fixture.synth, () => 'accepted', message => notices.push(message))
    const pending = engine.speak('あ')
    fixture.spoken[0].onerror?.({ error: 'synthesis-failed' })
    expect(await pending).toBe(false)
    expect(notices).toHaveLength(1)
  })
})
