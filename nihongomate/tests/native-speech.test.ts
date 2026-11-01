import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { AudioEngine } from '../src/utils/audio'
import { speechTimeoutMs, type NativeSpeechAdapter, type NativeSpeechRequest, type NativeSpeechVoice } from '../src/utils/nativeSpeech'

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason: unknown) => void
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no })
  return { promise, resolve, reject }
}
async function flush() { for (let i = 0; i < 20; i++) await Promise.resolve() }
const local: NativeSpeechVoice = { id: 'android:ja-local', name: 'Japanese offline', lang: 'ja-JP', localService: true, installed: true }
const remote: NativeSpeechVoice = { id: 'android:ja-network', name: 'Japanese online', lang: 'ja-JP', localService: false, installed: true, default: true }

function fixture(initial = [local]) {
  const state = {
    voices: initial,
    calls: [] as { options: NativeSpeechRequest; result: ReturnType<typeof deferred<{ played: boolean; cancelled?: boolean }>> }[],
    stops: [] as string[], settings: 0, loads: 0,
  }
  const adapter: NativeSpeechAdapter = {
    getVoices: async () => { state.loads++; return { voices: state.voices } },
    speak: options => { const result = deferred<{ played: boolean; cancelled?: boolean }>(); state.calls.push({ options, result }); return result.promise },
    stop: async ({ requestId }) => { state.stops.push(requestId) },
    openSettings: async () => { state.settings++ },
  }
  return { state, adapter }
}

describe('Android native speech through shared audio engine', () => {
  test('native works without Web Speech and resolves only after the terminal reply', async () => {
    const f = fixture()
    const notices: string[] = []
    const engine = new AudioEngine(null, () => 'local-only', x => notices.push(x), () => ({ voiceId: '', rate: 0.9 }), f.adapter)
    expect(engine.getVoiceOptions()).toEqual([])
    let settled = false
    const pending = engine.speak('こんにちは').then(value => { settled = true; return value })
    await flush()
    expect(f.state.calls).toHaveLength(1)
    expect(f.state.calls[0].options.localOnly).toBe(true)
    expect(settled).toBe(false)
    f.state.calls[0].result.resolve({ played: true })
    expect(await pending).toBe(true)
    expect(notices).toEqual([])
  })

  test('native receives selected pitch and defaults legacy or invalid preferences to the original pitch', async () => {
    const f = fixture()
    const preferences: { voiceId: string; rate: number; pitch?: number } = { voiceId: local.id, rate: 0.75, pitch: 1.2 }
    const engine = new AudioEngine(null, () => 'local-only', () => {}, () => preferences, f.adapter)
    for (const pitch of [1.2, 0.8, undefined, NaN, 0.85]) {
      preferences.pitch = pitch
      const pending = engine.speak('日本語', 1)
      await flush()
      const call = f.state.calls.at(-1)!
      expect(call.options).toMatchObject({ pitch: pitch === 1.2 || pitch === 0.8 ? pitch : 1, rate: 1, voiceId: local.id, localOnly: true })
      call.result.resolve({ played: true })
      expect(await pending).toBe(true)
    }
  })

  test('delayed initialization is shared and first speech waits for voices', async () => {
    const f = fixture()
    const initialization = deferred<{ voices: NativeSpeechVoice[] }>()
    f.adapter.getVoices = () => { f.state.loads++; return initialization.promise }
    const engine = new AudioEngine(null, () => 'local-only', () => {}, undefined, f.adapter)
    const pending = engine.speak('あ')
    const ready = engine.ready()
    await flush()
    expect(f.state.loads).toBe(1)
    expect(f.state.calls).toHaveLength(0)
    initialization.resolve({ voices: [local] })
    expect(await ready).toBe(true)
    await flush()
    expect(f.state.calls).toHaveLength(1)
    f.state.calls[0].result.resolve({ played: true })
    expect(await pending).toBe(true)
  })

  test('stop during initialization resolves immediately and prevents late speech', async () => {
    const f = fixture()
    const initialization = deferred<{ voices: NativeSpeechVoice[] }>()
    f.adapter.getVoices = () => initialization.promise
    const notices: string[] = []
    const engine = new AudioEngine(null, () => 'local-only', x => notices.push(x), undefined, f.adapter)
    const pending = engine.speak('古い文章')
    engine.stop()
    expect(await pending).toBe(false)
    initialization.resolve({ voices: [local] })
    await flush()
    expect(f.state.calls).toHaveLength(0)
    expect(notices).toEqual([])
  })

  test('rapid switch during initialization dispatches only the newest sentence', async () => {
    const f = fixture()
    const initialization = deferred<{ voices: NativeSpeechVoice[] }>()
    f.adapter.getVoices = () => initialization.promise
    const engine = new AudioEngine(null, () => 'local-only', () => {}, undefined, f.adapter)
    const first = engine.speak('最初')
    const second = engine.speak('次の文')
    expect(await first).toBe(false)
    initialization.resolve({ voices: [local] })
    await flush()
    expect(f.state.calls.map(call => call.options.text)).toEqual(['次の文'])
    f.state.calls[0].result.resolve({ played: true })
    expect(await second).toBe(true)
  })

  test('quick sentence changes target old stop and ignore old completion/error', async () => {
    const f = fixture()
    const stopReply = deferred<void>()
    f.adapter.stop = ({ requestId }) => { f.state.stops.push(requestId); return stopReply.promise }
    const notices: string[] = []
    const engine = new AudioEngine(null, () => 'local-only', x => notices.push(x), undefined, f.adapter)
    const first = engine.speak('一番')
    await flush()
    const second = engine.speak('二番')
    expect(await first).toBe(false)
    await flush()
    expect(f.state.stops).toEqual([f.state.calls[0].options.requestId])
    expect(f.state.calls[0].options.requestId).not.toBe(f.state.calls[1].options.requestId)
    f.state.calls[0].result.reject({ code: 'OUTPUT' })
    stopReply.resolve()
    await flush()
    f.state.calls[1].result.resolve({ played: true })
    expect(await second).toBe(true)
    expect(notices).toEqual([])
  })

  test('local-only filters English, network, uninstalled and unknown capabilities', async () => {
    const f = fixture([
      remote, { ...local, id: 'missing', installed: false },
      { ...local, id: 'english', lang: 'en-US' }, { ...local, id: 'unknown', localService: undefined as unknown as boolean }, local,
    ])
    const preferences = { voiceId: remote.id, rate: 0.75 }
    const engine = new AudioEngine(null, () => 'local-only', () => {}, () => preferences, f.adapter)
    expect(await engine.ready()).toBe(true)
    expect(engine.getVoiceOptions().map(voice => voice.id)).toEqual([local.id])
    const pending = engine.speak('日本語')
    await flush()
    expect(f.state.calls[0].options.voiceId).toBe(local.id)
    expect(f.state.calls[0].options.rate).toBe(0.75)
    expect(preferences.voiceId).toBe(remote.id)
    f.state.calls[0].result.resolve({ played: true })
    expect(await pending).toBe(true)
  })

  test('privacy is rechecked after delayed initialization, not captured on click', async () => {
    const f = fixture()
    const initialization = deferred<{ voices: NativeSpeechVoice[] }>()
    f.adapter.getVoices = () => initialization.promise
    let choice: 'accepted' | 'local-only' = 'accepted'
    const engine = new AudioEngine(null, () => choice, () => {}, () => ({ voiceId: remote.id, rate: 1 }), f.adapter)
    const pending = engine.speak('日本語')
    choice = 'local-only'
    initialization.resolve({ voices: [remote, local] })
    await flush()
    expect(f.state.calls[0].options).toMatchObject({ voiceId: local.id, localOnly: true })
    f.state.calls[0].result.resolve({ played: true })
    expect(await pending).toBe(true)
  })

  test('accepted mode uses a selected Japanese network voice, never an English default', async () => {
    const f = fixture([{ ...local, id: 'english', lang: 'en-US', default: true }, local, remote])
    const engine = new AudioEngine(null, () => 'accepted', () => {}, () => ({ voiceId: remote.id, rate: 1 }), f.adapter)
    const pending = engine.speak('はい')
    await flush()
    expect(f.state.calls[0].options).toMatchObject({ voiceId: remote.id, localOnly: false })
    f.state.calls[0].result.resolve({ played: true })
    expect(await pending).toBe(true)
  })

  test('dynamic refresh restores a saved voice preference without starting audio', async () => {
    const f = fixture()
    const second = { ...local, id: 'android:second' }
    const preferences = { voiceId: second.id, rate: 1 }
    const engine = new AudioEngine(null, () => 'local-only', () => {}, () => preferences, f.adapter)
    await engine.ready()
    expect(engine.getCurrentVoiceId()).toBe(local.id)
    f.state.voices = [local, second]
    await engine.refreshVoices()
    expect(engine.getCurrentVoiceId()).toBe(second.id)
    expect(f.state.calls).toHaveLength(0)
    expect(f.state.settings).toBe(0)
    expect(preferences.voiceId).toBe(second.id)
  })

  test('no offline voice fails with one actionable notice and no speech', async () => {
    const f = fixture([remote])
    const notices: string[] = []
    const engine = new AudioEngine(null, () => 'local-only', x => notices.push(x), undefined, f.adapter)
    expect(await engine.speak('あ')).toBe(false)
    expect(await engine.speak('い')).toBe(false)
    expect(f.state.calls).toHaveLength(0)
    expect(notices).toHaveLength(1)
    expect(notices[0]).toContain('离线')
  })

  test('initialization failure can be retried and never notifies until speech is requested', async () => {
    const f = fixture()
    let failing = true
    f.adapter.getVoices = async () => { if (failing) throw { code: 'INIT_FAILED' }; return { voices: [local] } }
    const notices: string[] = []
    const engine = new AudioEngine(null, () => 'local-only', x => notices.push(x), undefined, f.adapter)
    expect(await engine.ready()).toBe(false)
    expect(notices).toEqual([])
    failing = false
    const pending = engine.speak('再試行')
    await flush()
    f.state.calls[0].result.resolve({ played: true })
    expect(await pending).toBe(true)
  })

  test.each(['NO_ENGINE', 'INIT_FAILED', 'NO_JAPANESE_VOICE', 'NO_LOCAL_VOICE', 'TIMEOUT', 'OUTPUT'])('%s returns false and reports once', async code => {
    const f = fixture()
    const notices: string[] = []
    f.adapter.getVoices = async () => { throw { code } }
    const engine = new AudioEngine(null, () => 'local-only', x => notices.push(x), undefined, f.adapter)
    expect(await engine.speak('あ')).toBe(false)
    expect(notices).toHaveLength(1)
    expect(f.state.calls).toHaveLength(0)
  })

  test('native output failure and cancellation are distinct terminal results', async () => {
    const f = fixture()
    const notices: string[] = []
    const engine = new AudioEngine(null, () => 'local-only', x => notices.push(x), undefined, f.adapter)
    const cancelled = engine.speak('取消')
    await flush()
    f.state.calls[0].result.resolve({ played: false, cancelled: true })
    expect(await cancelled).toBe(false)
    expect(notices).toEqual([])
    const failed = engine.speak('出力')
    await flush()
    f.state.calls[1].result.reject({ code: 'OUTPUT' })
    expect(await failed).toBe(false)
    expect(notices).toHaveLength(1)
  })

  test('watchdog releases a hung speech request and stops its requestId', async () => {
    const f = fixture()
    const notices: string[] = []
    const engine = new AudioEngine(null, () => 'local-only', x => notices.push(x), undefined, f.adapter)
    await engine.ready()
    const original = globalThis.setTimeout
    let watchdog: (() => void) | undefined
    globalThis.setTimeout = ((callback: () => void, delay: number) => {
      if (delay >= 15000) { watchdog = callback; return original(() => {}, 60000) }
      return original(callback, delay)
    }) as typeof setTimeout
    try {
      const pending = engine.speak('応答なし')
      await flush()
      expect(watchdog).toBeDefined()
      watchdog!()
      expect(await pending).toBe(false)
      expect(f.state.stops).toEqual([f.state.calls[0].options.requestId])
      f.state.calls[0].result.resolve({ played: true })
      await flush()
      expect(notices).toHaveLength(1)
    } finally { globalThis.setTimeout = original }
  })

  test('input limits are explicit and speech budget scales for long slow passages', async () => {
    const f = fixture()
    const engine = new AudioEngine(null, () => 'local-only', () => {}, undefined, f.adapter)
    expect(await engine.speak('あ'.repeat(4001))).toBe(false)
    expect(f.state.calls).toHaveLength(0)
    expect(speechTimeoutMs('あ', 1)).toBe(15000)
    expect(speechTimeoutMs('あ'.repeat(500), 0.5)).toBe(300000)
    expect(speechTimeoutMs('あ'.repeat(120), 0.75)).toBeGreaterThan(speechTimeoutMs('あ'.repeat(120), 1.15))
  })

  test('system settings opens only after an explicit request', async () => {
    const f = fixture()
    const engine = new AudioEngine(null, () => 'local-only', () => {}, undefined, f.adapter)
    await engine.ready()
    expect(engine.supportsSystemSpeechSettings()).toBe(true)
    expect(f.state.settings).toBe(0)
    expect(await engine.openSystemSpeechSettings()).toBe(true)
    expect(f.state.settings).toBe(1)
  })
})

test('Android bridge registration, lifecycle and package visibility are present', () => {
  const base = new URL('../android/app/src/main/', import.meta.url)
  const main = readFileSync(new URL('java/com/zebao/nihongomate/MainActivity.java', base), 'utf8')
  const manifest = readFileSync(new URL('AndroidManifest.xml', base), 'utf8')
  const plugin = readFileSync(new URL('java/com/zebao/nihongomate/NativeSpeechPlugin.java', base), 'utf8')
  expect(main.indexOf('registerPlugin(NativeSpeechPlugin.class)')).toBeLessThan(main.indexOf('super.onCreate'))
  expect(manifest).toMatch(/<queries>[\s\S]*android.intent.action.TTS_SERVICE[\s\S]*<\/queries>/)
  expect(plugin).toContain('KEY_FEATURE_NOT_INSTALLED')
  expect(plugin).toContain('getMaxSpeechInputLength()')
  expect(plugin).toContain('handleOnDestroy()')
  expect(plugin).toContain('tts.shutdown()')
  expect(plugin).not.toContain('tts.setLanguage(')
  expect(plugin).not.toContain('ACTION_INSTALL_TTS_DATA')
})
