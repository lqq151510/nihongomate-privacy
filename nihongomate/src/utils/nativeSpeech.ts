import { Capacitor, registerPlugin } from '@capacitor/core'
import type { JapaneseVoiceOption } from './speechPreferences'

export interface NativeSpeechVoice extends JapaneseVoiceOption {
  default?: boolean
  installed?: boolean
}

export interface NativeSpeechRequest {
  requestId: string
  text: string
  rate: number
  pitch: number
  voiceId: string
  localOnly: boolean
}

/** The promise completes on the native utterance terminal callback, never on queue acceptance. */
export interface NativeSpeechAdapter {
  getVoices(): Promise<{ voices: NativeSpeechVoice[] }>
  speak(options: NativeSpeechRequest): Promise<{ played: boolean; cancelled?: boolean }>
  stop(options: { requestId: string }): Promise<void>
  openSettings(): Promise<void>
}

const NativeSpeech = registerPlugin<NativeSpeechAdapter>('NativeSpeech')

export function getNativeSpeechAdapter(): NativeSpeechAdapter | null {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android' ? NativeSpeech : null
}

export const MAX_SPEECH_TEXT_LENGTH = 4000

export function speechTimeoutMs(text: string, rate: number): number {
  return Math.max(15000, Math.min(300000, Math.ceil(text.length * 500 / rate) + 10000))
}

export function speechErrorCode(error: unknown): string {
  return typeof error === 'object' && error !== null && 'code' in error ? String(error.code) : 'OUTPUT'
}

export function speechErrorMessage(code: string, localOnly: boolean): string {
  if (code === 'NO_ENGINE') return '当前设备未提供语音朗读服务，请在系统中检查文字转语音服务；文字课程仍可正常学习。'
  if (code === 'INIT_FAILED') return '系统语音服务初始化失败，请检查系统语音设置后重试。'
  if (code === 'NO_LOCAL_VOICE' || (code === 'NO_JAPANESE_VOICE' && localOnly)) {
    return '本地模式仅使用设备标记为离线的日语音色。请在系统语音设置中检查离线日语语音包，再返回刷新；文字课程仍可正常学习。'
  }
  if (code === 'NO_JAPANESE_VOICE') return '当前设备未提供已安装的日语音色，请检查系统语音服务及日语语音包后重试。'
  if (code === 'TIMEOUT') return '语音服务长时间没有响应，请检查设备语音设置后重试。'
  if (code === 'INVALID_REQUEST') return '这段内容暂时无法朗读，请缩短文本后重试。'
  return '日语朗读未完成，请检查系统语音服务及日语语音包后重试。'
}
