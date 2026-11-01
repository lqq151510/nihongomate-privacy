import { readEffectivePrivacyDecision, type PrivacyChoice } from './privacy'
import { cloudSpeech, cloudSpeechErrorMessage, type CloudSpeechAdapter } from './cloudSpeech'
import { notifyUser } from './feedback'
import { availableJapaneseVoices, chooseJapaneseVoice, readSpeechPreferences, SPEECH_PITCHES, speechVoiceId, type JapaneseVoiceOption, type SpeechPreferences } from './speechPreferences'
import { getNativeSpeechAdapter, MAX_SPEECH_TEXT_LENGTH, speechErrorCode, speechErrorMessage, speechTimeoutMs, type NativeSpeechAdapter, type NativeSpeechVoice } from './nativeSpeech'

let speechRequestSequence = 0

/** 日语设备语音合成；Android 使用原生服务，浏览器使用 Web Speech。 */
export class AudioEngine {
  private voice: SpeechSynthesisVoice | null = null
  private finishPending: ((played: boolean) => void) | null = null
  private activeNativeRequestId: string | null = null
  private nativeVoices: NativeSpeechVoice[] = []
  private nativeReady = false
  private nativeRefresh: Promise<JapaneseVoiceOption[]> | null = null
  private lastNativeError = 'INIT_FAILED'
  private generation = 0
  private lastNoticeAt = -Infinity

  constructor(
    private readonly synth: SpeechSynthesis | null = typeof window !== 'undefined' ? window.speechSynthesis ?? null : null,
    private readonly privacyChoice: () => PrivacyChoice | undefined = () => readEffectivePrivacyDecision()?.choice,
    private readonly notify: (message: string) => void = message => notifyUser(message, 'error'),
    private readonly preferences: () => SpeechPreferences = () => readSpeechPreferences(),
    private readonly native: NativeSpeechAdapter | null = getNativeSpeechAdapter(),
    private readonly cloud: CloudSpeechAdapter = cloudSpeech,
  ) {
    if (this.native) void this.ready()
    else if (this.synth) {
      this.initVoice()
      this.synth.addEventListener('voiceschanged', () => this.initVoice())
    }
  }

  private initVoice() {
    if (!this.synth || this.native) return
    this.voice = chooseJapaneseVoice(this.synth.getVoices(), this.privacyChoice() !== 'accepted', this.preferences().voiceId)
  }

  /** Initializes without playing or showing a notification. A failed attempt can be retried. */
  public async ready(): Promise<boolean> {
    if (!this.native) { this.initVoice(); return Boolean(this.synth) }
    if (this.nativeReady) return true
    try { await this.refreshVoices(); return true } catch { return false }
  }

  public refreshVoices(): Promise<JapaneseVoiceOption[]> {
    if (!this.native) { this.initVoice(); return Promise.resolve(this.getVoiceOptions()) }
    if (this.nativeRefresh) return this.nativeRefresh
    const adapter = this.native
    const operation = new Promise<{ voices: NativeSpeechVoice[] }>((resolve, reject) => {
      const timeout = setTimeout(() => reject({ code: 'TIMEOUT' }), 8500)
      Promise.resolve().then(() => adapter.getVoices()).then(resolve, reject).finally(() => clearTimeout(timeout))
    }).then(result => {
      this.nativeVoices = Array.isArray(result.voices) ? result.voices : []
      this.nativeReady = true
      return this.getVoiceOptions()
    }).catch(error => {
      this.nativeReady = false
      this.nativeVoices = []
      this.lastNativeError = speechErrorCode(error)
      throw error
    }).finally(() => { this.nativeRefresh = null })
    this.nativeRefresh = operation
    return operation
  }

  public getVoiceOptions(): JapaneseVoiceOption[] {
    if (this.native) {
      const seen = new Set<string>()
      return this.nativeVoices.filter(voice => {
        if (!voice || typeof voice.id !== 'string' || !voice.id || !/^ja(?:[-_]|$)/i.test(voice.lang)
          || voice.installed === false || (this.privacyChoice() !== 'accepted' && voice.localService !== true) || seen.has(voice.id)) return false
        seen.add(voice.id)
        return true
      }).map(voice => ({ id: voice.id, name: voice.name || '日语音色', lang: voice.lang, localService: voice.localService === true }))
    }
    return availableJapaneseVoices(this.synth?.getVoices() ?? [], this.privacyChoice() !== 'accepted').map(voice => ({
      id: speechVoiceId(voice), name: voice.name || '日语音色', lang: voice.lang, localService: voice.localService,
    }))
  }

  public getCurrentVoiceId(): string {
    if (this.native) {
      const allowed = this.getVoiceOptions()
      return allowed.find(voice => voice.id === this.preferences().voiceId)?.id
        ?? allowed.find(voice => this.nativeVoices.some(item => item.id === voice.id && item.default))?.id
        ?? allowed[0]?.id ?? ''
    }
    this.initVoice()
    return this.voice ? speechVoiceId(this.voice) : ''
  }

  public supportsSystemSpeechSettings(): boolean { return Boolean(this.native) }

  /** Called only by the settings button after an explicit user action. */
  public async openSystemSpeechSettings(): Promise<boolean> {
    if (!this.native) return false
    this.stop()
    try { await this.native.openSettings(); return true } catch { return false }
  }

  private showUnavailable(message: string) {
    if (Date.now() - this.lastNoticeAt < 5000) return
    this.lastNoticeAt = Date.now()
    this.notify(message)
  }

  public stop() {
    this.generation++
    this.cloud.stop()
    const requestId = this.activeNativeRequestId
    this.activeNativeRequestId = null
    this.finishPending?.(false)
    if (this.native) {
      if (requestId) void this.native.stop({ requestId }).catch(() => {})
    } else this.synth?.cancel()
  }

  /** Resolves only on completion, failure or cancellation; cancellation is registered before initialization. */
  public speak(text: string, rate?: number): Promise<boolean> {
    this.stop()
    const generation = this.generation
    const requestId = `speech-${++speechRequestSequence}`
    return new Promise(resolve => {
      let finished = false
      let timeout: ReturnType<typeof setTimeout> | undefined
      const finish = (played: boolean) => {
        if (finished) return
        finished = true
        if (timeout !== undefined) clearTimeout(timeout)
        if (this.finishPending === finish) this.finishPending = null
        if (this.activeNativeRequestId === requestId) this.activeNativeRequestId = null
        resolve(played)
      }
      const fail = (code: string) => {
        if (finished || generation !== this.generation) return
        finish(false)
        if (!['CANCELLED', 'CANCELED', 'INTERRUPTED'].includes(code)) {
          this.showUnavailable(speechErrorMessage(code, this.privacyChoice() !== 'accepted'))
        }
      }
      this.finishPending = finish
      if (typeof text !== 'string' || !text.trim() || text.length > MAX_SPEECH_TEXT_LENGTH) { fail('INVALID_REQUEST'); return }
      const preferences = this.preferences()
      const requestedRate = rate ?? preferences.rate
      const effectiveRate = Number.isFinite(requestedRate) ? Math.max(0.5, Math.min(1.5, requestedRate)) : 0.9
      const requestedPitch = preferences.pitch ?? 1
      const effectivePitch = SPEECH_PITCHES.includes(requestedPitch as typeof SPEECH_PITCHES[number]) ? requestedPitch : 1
      const armTimeout = () => {
        timeout = setTimeout(() => {
          if (finished) return
          fail('TIMEOUT')
          if (this.native) void this.native.stop({ requestId }).catch(() => {})
          else this.synth?.cancel()
        }, speechTimeoutMs(text, effectiveRate))
      }
      if (this.cloud.isEnabled()) {
        if (this.privacyChoice() !== 'accepted') {
          finish(false)
          this.showUnavailable(cloudSpeechErrorMessage({ code: 'PRIVACY_REQUIRED' }))
          return
        }
        void this.cloud.speak(text, effectiveRate, effectivePitch).then(played => {
          if (!finished && generation === this.generation) finish(played)
        }).catch(error => {
          if (finished || generation !== this.generation) return
          finish(false)
          this.showUnavailable(cloudSpeechErrorMessage(error))
        })
        return
      }
      if (this.native) {
        void (async () => {
          const ready = await this.ready()
          if (finished || generation !== this.generation) return
          if (!ready) { fail(this.lastNativeError); return }
          const voiceId = this.getCurrentVoiceId()
          if (!voiceId) { fail(this.privacyChoice() !== 'accepted' ? 'NO_LOCAL_VOICE' : 'NO_JAPANESE_VOICE'); return }
          this.activeNativeRequestId = requestId
          armTimeout()
          try {
            const result = await this.native!.speak({
              requestId, text, rate: effectiveRate, pitch: effectivePitch, voiceId, localOnly: this.privacyChoice() !== 'accepted',
            })
            if (finished || generation !== this.generation) return
            if (result.played === true) finish(true)
            else if (result.cancelled) finish(false)
            else fail('OUTPUT')
          } catch (error) { fail(speechErrorCode(error)) }
        })()
        return
      }
      if (!this.synth || typeof SpeechSynthesisUtterance === 'undefined') { fail('NO_ENGINE'); return }
      this.initVoice()
      if (!this.voice) { fail('NO_JAPANESE_VOICE'); return }
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.lang = 'ja-JP'
      utterance.rate = effectiveRate
      utterance.pitch = effectivePitch
      utterance.voice = this.voice
      armTimeout()
      utterance.onend = () => finish(true)
      utterance.onerror = event => {
        if (['canceled', 'interrupted'].includes(event.error)) finish(false)
        else fail('OUTPUT')
      }
      try { this.synth.speak(utterance) } catch { fail('OUTPUT') }
    })
  }

  /**
   * 播放答对/交互的极简本地合成音效 (AudioContext)
   */
  public playCorrect() {
    this.playTone(587.33, 0.1, () => {
      this.playTone(880, 0.2)
    })
  }

  public playWrong() {
    this.playTone(300, 0.15, () => {
      this.playTone(250, 0.25)
    })
  }

  private playTone(freq: number, duration: number, callback?: () => void) {
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      if (!AudioCtx) return
      const ctx = new AudioCtx()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()

      osc.type = 'sine'
      osc.frequency.value = freq
      gain.gain.setValueAtTime(0.15, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration)

      osc.connect(gain)
      gain.connect(ctx.destination)

      osc.start()
      osc.stop(ctx.currentTime + duration)
      if (callback) {
        setTimeout(callback, duration * 1000 * 0.8)
      }
    } catch {
      // ignore
    }
  }
}

export const audio = new AudioEngine()
