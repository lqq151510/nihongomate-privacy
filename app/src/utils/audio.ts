import { readEffectivePrivacyDecision, type PrivacyChoice } from './privacy'
import { notifyUser } from './feedback'
import { availableJapaneseVoices, chooseJapaneseVoice, readSpeechPreferences, speechVoiceId, type JapaneseVoiceOption, type SpeechPreferences } from './speechPreferences'

/** 日语设备语音合成；音色与联网能力由系统语音服务提供。 */
export class AudioEngine {
  private voice: SpeechSynthesisVoice | null = null
  private finishPending: ((played: boolean) => void) | null = null
  private lastNoticeAt = -Infinity

  constructor(
    private readonly synth: SpeechSynthesis | null = typeof window !== 'undefined' ? window.speechSynthesis ?? null : null,
    private readonly privacyChoice: () => PrivacyChoice | undefined = () => readEffectivePrivacyDecision()?.choice,
    private readonly notify: (message: string) => void = message => notifyUser(message, 'error'),
    private readonly preferences: () => SpeechPreferences = () => readSpeechPreferences(),
  ) {
    if (this.synth) {
      this.initVoice()
      this.synth.addEventListener('voiceschanged', () => this.initVoice())
    }
  }

  private initVoice() {
    if (!this.synth) return
    this.voice = chooseJapaneseVoice(this.synth.getVoices(), this.privacyChoice() !== 'accepted', this.preferences().voiceId)
  }

  public getVoiceOptions(): JapaneseVoiceOption[] {
    return availableJapaneseVoices(this.synth?.getVoices() ?? [], this.privacyChoice() !== 'accepted').map(voice => ({
      id: speechVoiceId(voice), name: voice.name || '日语音色', lang: voice.lang, localService: voice.localService,
    }))
  }

  public getCurrentVoiceId(): string {
    this.initVoice()
    return this.voice ? speechVoiceId(this.voice) : ''
  }

  private showUnavailable(message: string) {
    // 一次连续朗读失败只提示一次，避免逐句或逐假名反复弹窗。
    if (Date.now() - this.lastNoticeAt < 5000) return
    this.lastNoticeAt = Date.now()
    this.notify(message)
  }

  public stop() {
    this.finishPending?.(false)
    this.synth?.cancel()
  }

  /**
   * 朗读假名或日文单词
   */
  public speak(text: string, rate?: number): Promise<boolean> {
    this.stop()
    return new Promise((resolve) => {
      if (!this.synth) {
        this.showUnavailable('当前设备未提供语音朗读服务，文字课程和练习仍可正常使用。')
        resolve(false)
        return
      }
      this.initVoice()
      if (!this.voice) {
        this.showUnavailable(this.privacyChoice() === 'accepted'
          ? '当前设备未提供日语音色，请检查系统语音服务及日语语音包后重试。'
          : '本地模式仅使用设备标记为离线的日语音色。请先安装系统离线日语语音包；文字课程仍可正常使用。')
        resolve(false)
        return
      }

      const utterance = new SpeechSynthesisUtterance(text)
      utterance.lang = 'ja-JP'
      const requestedRate = rate ?? this.preferences().rate
      utterance.rate = Number.isFinite(requestedRate) ? Math.max(0.5, Math.min(1.5, requestedRate)) : 0.9
      utterance.pitch = 1.0

      utterance.voice = this.voice
      let finished = false
      const finish = (played: boolean) => {
        if (finished) return
        finished = true
        clearTimeout(timeout)
        if (this.finishPending === finish) this.finishPending = null
        resolve(played)
      }
      const timeout = setTimeout(() => {
        finish(false)
        this.synth?.cancel()
        this.showUnavailable('语音服务长时间没有响应，请检查设备语音设置后重试。')
      }, Math.max(15000, Math.min(90000, text.length * 1000)))
      this.finishPending = finish

      utterance.onend = () => finish(true)
      utterance.onerror = event => {
        if (finished) return
        finish(false)
        if (!['canceled', 'interrupted'].includes(event.error)) {
          this.showUnavailable('日语朗读未完成，请检查系统语音服务及日语语音包后重试。')
        }
      }

      try {
        this.synth.speak(utterance)
      } catch {
        finish(false)
        this.showUnavailable('当前设备无法开始日语朗读，请检查系统语音服务后重试。')
      }
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
