export const SPEECH_PREFERENCES_KEY = 'nihongomate_speech_preferences'
export const SPEECH_PREFERENCES_EVENT = 'nihongomate:speech-preferences-updated'
export const SPEECH_RATES = [0.75, 0.9, 1, 1.15] as const
export interface SpeechPreferences { voiceId: string; rate: number }
export interface JapaneseVoiceOption { id: string; name: string; lang: string; localService: boolean }
const defaults: SpeechPreferences = { voiceId: '', rate: 0.9 }

export function speechVoiceId(voice: SpeechSynthesisVoice): string {
  return JSON.stringify([voice.voiceURI ?? '', voice.name ?? '', voice.lang.toLowerCase(), voice.localService])
}

export function availableJapaneseVoices(voices: SpeechSynthesisVoice[], localOnly: boolean): SpeechSynthesisVoice[] {
  const seen = new Set<string>()
  return voices.filter(voice => {
    if (!/^ja(?:[-_]|$)/i.test(voice.lang) || (localOnly && !voice.localService)) return false
    const id = speechVoiceId(voice)
    if (seen.has(id)) return false
    seen.add(id)
    return true
  })
}

export function chooseJapaneseVoice(voices: SpeechSynthesisVoice[], localOnly: boolean, preferredId: string): SpeechSynthesisVoice | null {
  const allowed = availableJapaneseVoices(voices, localOnly)
  return allowed.find(voice => speechVoiceId(voice) === preferredId)
    ?? allowed.find(voice => voice.default)
    ?? allowed[0]
    ?? null
}

export function readSpeechPreferences(storage?: Storage): SpeechPreferences {
  try {
    const parsed = JSON.parse((storage ?? localStorage).getItem(SPEECH_PREFERENCES_KEY) || 'null')
    return {
      voiceId: typeof parsed?.voiceId === 'string' ? parsed.voiceId : '',
      rate: SPEECH_RATES.includes(parsed?.rate) ? parsed.rate : defaults.rate,
    }
  } catch { return { ...defaults } }
}

export function saveSpeechPreferences(preferences: SpeechPreferences, storage?: Storage): boolean {
  if (typeof preferences.voiceId !== 'string' || !SPEECH_RATES.includes(preferences.rate as typeof SPEECH_RATES[number])) return false
  try { (storage ?? localStorage).setItem(SPEECH_PREFERENCES_KEY, JSON.stringify(preferences)) }
  catch { return false }
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(SPEECH_PREFERENCES_EVENT))
  return true
}
