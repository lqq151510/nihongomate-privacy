<template>
  <section aria-labelledby="speech-settings-title" class="rounded-2xl border border-slate-100 bg-white p-4 shadow-xs space-y-3 text-xs min-w-0">
    <h3 id="speech-settings-title" class="font-bold text-slate-800">🔊 日语朗读音色与速度</h3>
    <p class="text-[11px] leading-relaxed text-slate-500">音色由设备语音服务提供。{{ localOnly ? '当前仅列出系统标记为离线的日语音色。' : '在线音色可能需要网络，由对应系统语音服务处理朗读文本。' }}</p>

    <label class="block space-y-1.5">
      <span class="font-semibold text-slate-600">日语音色</span>
      <select :value="visibleVoiceId" @change="changeVoice" :disabled="!voices.length" aria-label="日语音色" class="block w-full min-w-0 rounded-xl border border-slate-200 bg-white p-2.5 text-slate-700 disabled:bg-slate-50 disabled:text-slate-400">
        <option value="">自动选择可用音色</option>
        <option v-for="voice in voices" :key="voice.id" :value="voice.id">{{ voice.name }} · {{ voice.localService ? '系统标记为离线' : '可能联网' }}</option>
      </select>
    </label>
    <p v-if="!voices.length" class="rounded-lg bg-amber-50 p-2.5 leading-relaxed text-amber-900">当前没有符合使用选择的日语音色。请在系统的文字转语音设置中安装日语语音包，再返回本页；文字课程仍可正常学习。</p>
    <p v-else-if="voices.length === 1" class="text-[11px] leading-relaxed text-slate-500">设备当前只提供 1 个可用日语音色。更多声音需要系统语音服务支持，可在系统中查看或安装日语语音包。</p>
    <p v-if="preferredUnavailable" class="rounded-lg bg-amber-50 p-2.5 leading-relaxed text-amber-900">已保存的音色暂不可用，原偏好仍保留。{{ currentVoice ? `本次会回退到「${currentVoice.name}」。` : '目前无法朗读。' }}</p>
    <p v-if="currentVoice" class="text-[11px] text-slate-600 break-words">当前实际音色：{{ currentVoice.name }}（{{ currentVoice.localService ? '系统标记为离线' : '可能联网' }}）</p>

    <label class="block space-y-1.5">
      <span class="font-semibold text-slate-600">默认朗读速度</span>
      <select :value="preferences.rate" @change="changeRate" aria-label="默认朗读速度" class="block w-full rounded-xl border border-slate-200 bg-white p-2.5 text-slate-700">
        <option v-for="rate in SPEECH_RATES" :key="rate" :value="rate">{{ rate }}× · {{ rateNames[rate] }}</option>
      </select>
    </label>
    <p class="text-[11px] leading-relaxed text-slate-500">默认速度用于词汇、语法等朗读；情景对话页使用该页单独选择的速度。</p>

    <p v-if="error" class="rounded-lg bg-red-50 p-2.5 text-red-700 leading-relaxed" role="alert">{{ error }}</p>
    <p v-else-if="message" class="text-emerald-700 leading-relaxed" role="status">{{ message }}</p>
    <div class="grid grid-cols-2 gap-2">
      <button @click="previewVoice" :disabled="!voices.length || playing" class="min-h-11 rounded-xl bg-rose-500 px-3 py-2.5 font-bold text-white disabled:bg-slate-100 disabled:text-slate-400">{{ playing ? '正在试听…' : '试听当前音色' }}</button>
      <button @click="stopPreview" :disabled="!playing" class="min-h-11 rounded-xl border border-slate-200 px-3 py-2.5 font-bold text-slate-600 disabled:text-slate-300">停止试听</button>
    </div>
    <p class="font-japanese text-[11px] leading-relaxed text-slate-400">こんにちは。今日は日本語を練習します。</p>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { audio } from '@/utils/audio'
import { PRIVACY_UPDATED_EVENT, readEffectivePrivacyDecision } from '@/utils/privacy'
import {
  readSpeechPreferences, saveSpeechPreferences, SPEECH_PREFERENCES_EVENT, SPEECH_RATES,
  type JapaneseVoiceOption, type SpeechPreferences,
} from '@/utils/speechPreferences'

const preferences = ref(readSpeechPreferences())
const voices = ref<JapaneseVoiceOption[]>([])
const currentVoiceId = ref('')
const localOnly = ref(true)
const error = ref('')
const message = ref('')
const playing = ref(false)
const rateNames: Record<number, string> = { 0.75: '慢速', 0.9: '稍慢', 1: '正常', 1.15: '稍快' }
let active = true
let previewRun = 0
let synth: SpeechSynthesis | undefined

const preferredUnavailable = computed(() => Boolean(preferences.value.voiceId && !voices.value.some(voice => voice.id === preferences.value.voiceId)))
const visibleVoiceId = computed(() => preferredUnavailable.value ? '' : preferences.value.voiceId)
const currentVoice = computed(() => voices.value.find(voice => voice.id === currentVoiceId.value))

function refreshVoices() {
  if (!active) return
  preferences.value = readSpeechPreferences()
  localOnly.value = readEffectivePrivacyDecision()?.choice !== 'accepted'
  voices.value = audio.getVoiceOptions()
  currentVoiceId.value = audio.getCurrentVoiceId()
}
function stopPreview() {
  previewRun++
  audio.stop()
  playing.value = false
}
function privacyChanged() {
  stopPreview()
  refreshVoices()
}
function persist(next: SpeechPreferences) {
  stopPreview()
  error.value = ''
  message.value = ''
  if (!saveSpeechPreferences(next)) {
    error.value = '朗读设置未能保存，仍使用上次设置。请检查设备存储后重试。'
    return false
  }
  refreshVoices()
  message.value = '朗读设置已保存到本机。'
  return true
}
function changeVoice(event: Event) {
  const input = event.target as HTMLSelectElement
  const voiceId = input.value
  if (voiceId && !voices.value.some(voice => voice.id === voiceId)) {
    refreshVoices()
    input.value = visibleVoiceId.value
    error.value = '该音色已不可用，请从当前列表重新选择。'
    return
  }
  if (!persist({ ...preferences.value, voiceId })) input.value = visibleVoiceId.value
}
function changeRate(event: Event) {
  const input = event.target as HTMLSelectElement
  if (!persist({ ...preferences.value, rate: Number(input.value) })) input.value = String(preferences.value.rate)
}
async function previewVoice() {
  refreshVoices()
  if (!voices.value.length || playing.value) return
  const run = ++previewRun
  error.value = ''
  message.value = ''
  playing.value = true
  const played = await audio.speak('こんにちは。今日は日本語を練習します。')
  if (!active || run !== previewRun) return
  playing.value = false
  if (played) message.value = '试听结束，可以调整音色或速度后再听。'
  else error.value = '试听未完成，请检查系统日语语音服务后重试。'
}

onMounted(() => {
  synth = window.speechSynthesis
  refreshVoices()
  synth?.addEventListener('voiceschanged', refreshVoices)
  window.addEventListener('focus', refreshVoices)
  window.addEventListener(PRIVACY_UPDATED_EVENT, privacyChanged)
  window.addEventListener(SPEECH_PREFERENCES_EVENT, refreshVoices)
})
onUnmounted(() => {
  active = false
  previewRun++
  audio.stop()
  synth?.removeEventListener('voiceschanged', refreshVoices)
  window.removeEventListener('focus', refreshVoices)
  window.removeEventListener(PRIVACY_UPDATED_EVENT, privacyChanged)
  window.removeEventListener(SPEECH_PREFERENCES_EVENT, refreshVoices)
})
</script>
