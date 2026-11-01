import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { AudioEngine } from '../src/utils/audio'
import {
  availableJapaneseVoices, chooseJapaneseVoice, readSpeechPreferences, saveSpeechPreferences,
  SPEECH_PREFERENCES_KEY, speechVoiceId, type SpeechPreferences,
} from '../src/utils/speechPreferences'

class MemoryStorage implements Storage {
  values = new Map<string, string>()
  get length() { return this.values.size }
  clear() { this.values.clear() }
  getItem(key: string) { return this.values.get(key) ?? null }
  key(index: number) { return [...this.values.keys()][index] ?? null }
  removeItem(key: string) { this.values.delete(key) }
  setItem(key: string, value: string) { this.values.set(key, value) }
}

const voice = (name: string, localService = true, lang = 'ja-JP', isDefault = false): SpeechSynthesisVoice => ({ name, voiceURI: `test:${name}`, localService, lang, default: isDefault })
const local = voice('Local Japanese')
const second = voice('Second Japanese')
const remote = voice('Remote Japanese', false)
const english = voice('English', true, 'en-US', true)

class UtteranceStub {
  lang = ''; rate = 1; pitch = 1
  voice: SpeechSynthesisVoice | null = null
  onend: (() => void) | null = null
  onerror: ((event: { error: string }) => void) | null = null
  constructor(public text: string) {}
}

let previousUtterance: PropertyDescriptor | undefined
beforeEach(() => {
  previousUtterance = Object.getOwnPropertyDescriptor(globalThis, 'SpeechSynthesisUtterance')
  Object.defineProperty(globalThis, 'SpeechSynthesisUtterance', { configurable: true, writable: true, value: UtteranceStub })
})
afterEach(() => {
  if (previousUtterance) Object.defineProperty(globalThis, 'SpeechSynthesisUtterance', previousUtterance)
  else Reflect.deleteProperty(globalThis, 'SpeechSynthesisUtterance')
})

function speechFixture(initial: SpeechSynthesisVoice[]) {
  const events = new EventTarget()
  const state = { voices: initial, spoken: [] as UtteranceStub[], cancelCount: 0 }
  const synth = {
    getVoices: () => state.voices,
    addEventListener: events.addEventListener.bind(events),
    cancel: () => { state.cancelCount++ },
    speak: (utterance: UtteranceStub) => { state.spoken.push(utterance); utterance.onend?.() },
  } as unknown as SpeechSynthesis
  return { state, synth, voicesChanged: () => events.dispatchEvent(new Event('voiceschanged')) }
}

describe('日语音色偏好', () => {
  test('仅列真实日本语音色，按隐私选择过滤且去重', () => {
    const voices = [english, local, { ...local }, remote, voice('Other language', true, 'javanese')]
    expect(availableJapaneseVoices(voices, false)).toEqual([local, remote])
    expect(availableJapaneseVoices(voices, true)).toEqual([local])
    expect(availableJapaneseVoices([voice('ja underscore', true, 'ja_JP'), voice('ja short', true, 'ja')], true)).toHaveLength(2)
    expect(voices).toHaveLength(5)
  })

  test('优先所选可用音色，失效时回退日语默认或首个，不回退英语', () => {
    const defaultJapanese = voice('Japanese default', true, 'ja-JP', true)
    expect(chooseJapaneseVoice([english, defaultJapanese, second], false, speechVoiceId(second))).toBe(second)
    expect(chooseJapaneseVoice([english, defaultJapanese, second], false, 'unavailable')).toBe(defaultJapanese)
    expect(chooseJapaneseVoice([english, second], false, '')).toBe(second)
    expect(chooseJapaneseVoice([english], false, '')).toBeNull()
  })

  test('偏好读取兼容缺失/损坏数据，不接受任意语速', () => {
    const storage = new MemoryStorage()
    expect(readSpeechPreferences(storage)).toEqual({ voiceId: '', rate: 0.9, pitch: 1 })
    storage.setItem(SPEECH_PREFERENCES_KEY, '{invalid')
    expect(readSpeechPreferences(storage)).toEqual({ voiceId: '', rate: 0.9, pitch: 1 })
    storage.setItem(SPEECH_PREFERENCES_KEY, JSON.stringify({ voiceId: 7, rate: 9 }))
    expect(readSpeechPreferences(storage)).toEqual({ voiceId: '', rate: 0.9, pitch: 1 })
    expect(saveSpeechPreferences({ voiceId: speechVoiceId(local), rate: 0.75 }, storage)).toBe(true)
    expect(readSpeechPreferences(storage)).toEqual({ voiceId: speechVoiceId(local), rate: 0.75, pitch: 1 })
  })

  test('保存失败和非法语速保留已存偏好，不影响其他学习记录', () => {
    const storage = new MemoryStorage()
    const original = { voiceId: speechVoiceId(local), rate: 1, pitch: 1 }
    storage.setItem('nihongomate_word_records', 'keep')
    expect(saveSpeechPreferences(original, storage)).toBe(true)
    expect(saveSpeechPreferences({ voiceId: '', rate: 2 }, storage)).toBe(false)
    storage.setItem = () => { throw new Error('quota exceeded') }
    expect(saveSpeechPreferences({ voiceId: speechVoiceId(second), rate: 1.15 }, storage)).toBe(false)
    expect(readSpeechPreferences(storage)).toEqual(original)
    expect(storage.getItem('nihongomate_word_records')).toBe('keep')
  })

  test('旧音色与语速偏好补原始音高，损坏音高读取时安全回退', () => {
    const storage = new MemoryStorage()
    storage.setItem(SPEECH_PREFERENCES_KEY, JSON.stringify({ voiceId: speechVoiceId(second), rate: 1.15 }))
    expect(readSpeechPreferences(storage)).toEqual({ voiceId: speechVoiceId(second), rate: 1.15, pitch: 1 })
    for (const pitch of [0.5, 0.85, 2, '1.1', null]) {
      storage.setItem(SPEECH_PREFERENCES_KEY, JSON.stringify({ voiceId: speechVoiceId(second), rate: 1.15, pitch }))
      expect(readSpeechPreferences(storage)).toEqual({ voiceId: speechVoiceId(second), rate: 1.15, pitch: 1 })
    }
  })

  test('保存允许的音高，非法值或写入失败不覆盖原设置', () => {
    const storage = new MemoryStorage()
    const original = { voiceId: speechVoiceId(second), rate: 0.75, pitch: 0.8 }
    expect(saveSpeechPreferences(original, storage)).toBe(true)
    expect(readSpeechPreferences(storage)).toEqual(original)
    const before = storage.getItem(SPEECH_PREFERENCES_KEY)
    for (const pitch of [-1, 0, 0.85, 2, NaN, Infinity, '1', null]) {
      expect(saveSpeechPreferences({ ...original, pitch: pitch as number }, storage)).toBe(false)
      expect(storage.getItem(SPEECH_PREFERENCES_KEY)).toBe(before)
    }
    storage.setItem = () => { throw new Error('quota exceeded') }
    expect(saveSpeechPreferences({ ...original, pitch: 1.2 }, storage)).toBe(false)
    expect(readSpeechPreferences(storage)).toEqual(original)
  })

  test('浏览器播放使用音高偏好，缺省或非法值回到原始音高', async () => {
    const fixture = speechFixture([local])
    let preferences: SpeechPreferences = { voiceId: '', rate: 0.9, pitch: 0.8 }
    const engine = new AudioEngine(fixture.synth, () => 'local-only', () => {}, () => preferences)
    await engine.speak('あ')
    preferences = { ...preferences, pitch: 1.2 }
    await engine.speak('い', 1)
    preferences = { voiceId: '', rate: 0.9 }
    await engine.speak('う')
    preferences = { ...preferences, pitch: NaN }
    await engine.speak('え')
    expect(fixture.state.spoken.map(item => item.pitch)).toEqual([0.8, 1.2, 1, 1])
    expect(fixture.state.spoken.map(item => item.rate)).toEqual([0.9, 1, 0.9, 0.9])
  })

  test('本地模式阻止预选在线音色，切换隐私后重新计算实际音色', async () => {
    const fixture = speechFixture([remote, local])
    let choice: 'accepted' | 'local-only' = 'accepted'
    const preferences = { voiceId: speechVoiceId(remote), rate: 0.9 }
    const engine = new AudioEngine(fixture.synth, () => choice, () => {}, () => preferences)
    expect(engine.getVoiceOptions()).toHaveLength(2)
    expect(await engine.speak('こんにちは。')).toBe(true)
    expect(fixture.state.spoken[0].voice).toBe(remote)
    choice = 'local-only'
    expect(engine.getVoiceOptions().map(option => option.id)).toEqual([speechVoiceId(local)])
    expect(engine.getCurrentVoiceId()).toBe(speechVoiceId(local))
    expect(await engine.speak('日本語を練習します。')).toBe(true)
    expect(fixture.state.spoken[1].voice).toBe(local)
    expect(preferences.voiceId).toBe(speechVoiceId(remote))
  })

  test('动态音色列表可恢复原偏好，读取不会触发发声', async () => {
    const fixture = speechFixture([local])
    const preferences = { voiceId: speechVoiceId(second), rate: 0.9 }
    const engine = new AudioEngine(fixture.synth, () => 'local-only', () => {}, () => preferences)
    expect(engine.getCurrentVoiceId()).toBe(speechVoiceId(local))
    fixture.state.voices = [local, second]
    fixture.voicesChanged()
    expect(engine.getVoiceOptions().map(option => option.id)).toEqual([speechVoiceId(local), speechVoiceId(second)])
    expect(engine.getCurrentVoiceId()).toBe(speechVoiceId(second))
    expect(fixture.state.spoken).toHaveLength(0)
    expect(await engine.speak('おはようございます。')).toBe(true)
    expect(fixture.state.spoken[0].voice).toBe(second)
  })

  test('默认语速随偏好更新，显式语速保留对话页覆盖能力', async () => {
    const fixture = speechFixture([local])
    let preferences: SpeechPreferences = { voiceId: '', rate: 0.75 }
    const engine = new AudioEngine(fixture.synth, () => 'local-only', () => {}, () => preferences)
    await engine.speak('あ')
    preferences = { voiceId: '', rate: 1.15 }
    await engine.speak('い')
    await engine.speak('う', 1)
    expect(fixture.state.spoken.map(item => item.rate)).toEqual([0.75, 1.15, 1])
  })

  test('无日语音色时明确不可朗读，读取选项不发提示', async () => {
    const fixture = speechFixture([english, remote])
    const notices: string[] = []
    const engine = new AudioEngine(fixture.synth, () => 'local-only', value => notices.push(value), () => ({ voiceId: speechVoiceId(remote), rate: 1 }))
    expect(engine.getVoiceOptions()).toEqual([])
    expect(engine.getCurrentVoiceId()).toBe('')
    expect(notices).toEqual([])
    expect(await engine.speak('こんにちは。')).toBe(false)
    expect(fixture.state.spoken).toHaveLength(0)
    expect(notices).toHaveLength(1)
  })
})
