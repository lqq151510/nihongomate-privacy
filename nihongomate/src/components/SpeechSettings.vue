<template>
  <div id="voice-personalization" class="min-w-0 shrink-0 space-y-4">
    <CloudSpeechSettings />
  <section v-if="!cloudEnabled" aria-labelledby="speech-settings-title" class="rounded-2xl border border-rose-100 bg-white p-4 shadow-xs space-y-4 text-xs min-w-0">
    <div class="flex items-center justify-between gap-3">
      <div class="flex items-center gap-2.5 min-w-0">
        <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-lg" aria-hidden="true">🔊</span>
        <div class="min-w-0">
          <h3 id="speech-settings-title" class="font-bold text-slate-800 text-sm">我的日语声音</h3>
          <p class="mt-0.5 text-[11px] text-slate-500">选一个喜欢的声音，按自己的节奏听</p>
        </div>
      </div>
    </div>
    <p class="text-[11px] leading-relaxed text-slate-500">音色由设备语音服务提供。{{ localOnly ? '当前仅列出系统标记为离线的日语音色。' : '在线音色可能需要网络，由对应系统语音服务处理朗读文本。' }}</p>

    <div v-if="currentVoice" class="rounded-xl border border-rose-100 bg-rose-50/60 p-3 min-w-0">
      <div class="flex flex-wrap items-center justify-between gap-1.5 text-[11px]">
        <span class="font-semibold text-rose-700">当前实际音色</span>
        <span class="text-slate-500">{{ voices.length }} 种可选 · {{ currentVoice.localService ? '系统标记为离线' : '可能联网' }}</span>
      </div>
      <p class="mt-1.5 font-semibold text-slate-800 break-words">{{ currentVoice.name }}</p>
    </div>
    <label class="block space-y-1.5">
      <span class="font-semibold text-slate-600">日语音色</span>
      <select :value="visibleVoiceId" @change="changeVoice" :disabled="loading || !voices.length" aria-label="日语音色" class="block w-full min-w-0 min-h-11 rounded-xl border border-slate-200 bg-white p-2.5 text-slate-700 disabled:bg-slate-50 disabled:text-slate-400">
        <option value="">自动选择可用音色</option>
        <option v-for="voice in voices" :key="voice.id" :value="voice.id">{{ voice.name }} · {{ voice.localService ? '系统标记为离线' : '可能联网' }}</option>
      </select>
    </label>
    <div v-if="voices.length > 1" class="grid grid-cols-2 gap-2">
      <button @click="cycleVoice(-1)" :disabled="loading" class="min-h-11 rounded-xl border border-slate-200 px-2 py-2 font-semibold text-slate-600 disabled:text-slate-300">上一种音色</button>
      <button @click="cycleVoice(1)" :disabled="loading" class="min-h-11 rounded-xl border border-slate-200 px-2 py-2 font-semibold text-slate-600 disabled:text-slate-300">下一种音色</button>
    </div>
    <p v-if="loading" role="status" class="text-slate-500">正在加载设备日语音色…</p>
    <p v-else-if="!voices.length" class="rounded-lg bg-amber-50 p-2.5 leading-relaxed text-amber-900">当前没有符合使用选择的日语音色。请在系统的文字转语音设置中安装日语语音包，再返回本页；文字课程仍可正常学习。</p>
    <p v-else-if="voices.length === 1" class="text-[11px] leading-relaxed text-slate-500">设备当前只提供 1 个可用日语音色。更多声音需要系统语音服务支持，可在系统中查看或安装日语语音包。</p>
    <p v-if="preferredUnavailable" class="rounded-lg bg-amber-50 p-2.5 leading-relaxed text-amber-900">已保存的音色暂不可用，原偏好仍保留。{{ currentVoice ? `本次会回退到「${currentVoice.name}」。` : '目前无法朗读。' }}</p>

    <fieldset class="space-y-2">
      <legend class="font-semibold text-slate-600">默认朗读速度</legend>
      <div class="grid grid-cols-4 gap-1.5">
        <button v-for="rate in SPEECH_RATES" :key="rate" @click="selectRate(rate)" :aria-label="`朗读速度 ${rate} 倍 ${rateNames[rate]}`" :aria-pressed="preferences.rate === rate" :class="['min-h-11 min-w-0 rounded-xl border px-1 py-2 text-center', preferences.rate === rate ? 'border-rose-300 bg-rose-50 text-rose-700' : 'border-slate-200 text-slate-600']">
          <span class="block font-semibold">{{ rate }}×</span><span class="block mt-0.5 text-[11px]">{{ rateNames[rate] }}</span>
        </button>
      </div>
    </fieldset>
    <p class="text-[11px] leading-relaxed text-slate-500">默认速度用于词汇、语法等朗读；情景对话页使用该页单独选择的速度。</p>

    <fieldset class="space-y-2">
      <legend class="font-semibold text-slate-600">声音高低</legend>
      <div class="grid grid-cols-5 gap-1">
        <button v-for="pitch in SPEECH_PITCHES" :key="pitch" @click="selectPitch(pitch)" :aria-label="`声音高低：${pitchNames[pitch]}`" :aria-pressed="(preferences.pitch ?? 1) === pitch" :class="['min-h-11 min-w-0 rounded-xl border px-0.5 py-2 font-semibold', (preferences.pitch ?? 1) === pitch ? 'border-rose-300 bg-rose-50 text-rose-700' : 'border-slate-200 text-slate-600']">{{ pitchNames[pitch] }}</button>
      </div>
      <p class="text-[11px] leading-relaxed text-slate-500">调整同一个声音的高低，不会增加新音色；实际效果取决于设备语音服务。</p>
    </fieldset>

    <div class="space-y-2.5 rounded-xl bg-slate-50 p-3">
      <fieldset class="space-y-2">
        <legend class="font-semibold text-slate-600">试听内容</legend>
        <div class="grid grid-cols-3 gap-1.5">
          <button v-for="sample in previewSamples" :key="sample.id" @click="selectSample(sample.id)" :aria-pressed="previewSampleId === sample.id" :class="['min-h-11 rounded-lg border px-1 py-2 font-semibold', previewSampleId === sample.id ? 'border-rose-200 bg-white text-rose-700' : 'border-transparent text-slate-500']">{{ sample.label }}</button>
        </div>
      </fieldset>
      <p class="font-japanese leading-relaxed text-slate-700 break-words" lang="ja">{{ previewSample.text }}</p>
      <p class="text-[11px] leading-relaxed text-slate-500">{{ previewSample.translation }}</p>
      <div class="grid grid-cols-2 gap-2">
        <button @click="previewVoice" :disabled="loading || !voices.length || playing" class="min-h-11 rounded-xl bg-rose-600 px-2 py-2.5 font-bold text-white disabled:bg-slate-200 disabled:text-slate-400">{{ playing ? '正在试听…' : '试听当前音色' }}</button>
        <button @click="stopPreview" :disabled="!playing" class="min-h-11 rounded-xl border border-slate-200 bg-white px-2 py-2.5 font-bold text-slate-600 disabled:text-slate-300">停止试听</button>
      </div>
    </div>
    <p v-if="error" class="rounded-lg bg-red-50 p-2.5 text-red-700 leading-relaxed" role="alert">{{ error }}</p>
    <p v-else-if="message" class="text-emerald-700 leading-relaxed" role="status">{{ message }}</p>
    <div class="flex flex-wrap gap-2">
      <button @click="reloadVoices" :disabled="loading" class="min-h-11 rounded-xl border border-slate-200 px-3 py-2.5 font-bold text-slate-600 disabled:text-slate-300">刷新日语音色</button>
      <button v-if="systemSettingsAvailable" @click="openSystemSettings" class="min-h-11 rounded-xl border border-slate-200 px-3 py-2.5 font-bold text-slate-600">打开系统语音设置</button>
    </div>
    <p v-if="systemSettingsAvailable" class="text-[11px] leading-relaxed text-slate-500">安装语音包后可返回刷新；更换系统语音引擎后，可能需要重新打开应用。</p>
    <div class="border-t border-slate-100 pt-2">
      <button @click="restoreDefaults" class="min-h-11 rounded-xl px-2 py-2.5 font-semibold text-rose-700">恢复默认朗读设置</button>
      <p class="text-[11px] leading-relaxed text-slate-400">恢复自动音色、0.9× 语速和自然音高，学习记录会保留。</p>
    </div>
  </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { audio } from '@/utils/audio'
import CloudSpeechSettings from '@/components/CloudSpeechSettings.vue'
import { CLOUD_SPEECH_UPDATED_EVENT, readCloudSpeechConfig } from '@/utils/cloudSpeech'
import { speechErrorCode, speechErrorMessage } from '@/utils/nativeSpeech'
import { PRIVACY_UPDATED_EVENT, readEffectivePrivacyDecision } from '@/utils/privacy'
import {
  readSpeechPreferences, saveSpeechPreferences, SPEECH_PREFERENCES_EVENT, SPEECH_RATES, SPEECH_PITCHES,
  type JapaneseVoiceOption, type SpeechPreferences,
} from '@/utils/speechPreferences'

const preferences = ref(readSpeechPreferences())
const cloudEnabled = ref(readCloudSpeechConfig().enabled)
function refreshCloudMode() { stopPreview(); cloudEnabled.value = readCloudSpeechConfig().enabled }
const voices = ref<JapaneseVoiceOption[]>([])
const currentVoiceId = ref('')
const localOnly = ref(true)
const error = ref('')
const message = ref('')
const playing = ref(false)
const loading = ref(true)
const systemSettingsAvailable = audio.supportsSystemSpeechSettings()
let voiceRun = 0
const rateNames: Record<number, string> = { 0.75: '慢速', 0.9: '稍慢', 1: '正常', 1.15: '稍快' }
const pitchNames: Record<number, string> = { 0.8: '偏低', 0.9: '稍低', 1: '自然', 1.1: '稍高', 1.2: '偏高' }
const previewSamples = [
  { id: 'greeting', label: '问候', text: 'こんにちは。よろしくお願いします。', translation: '你好。请多关照。' },
  { id: 'word', label: '单词', text: '桜。日本語。図書館。', translation: '樱花。日语。图书馆。' },
  { id: 'sentence', label: '句子', text: '今日は日本語を練習します。少しずつ、いっしょに勉強しましょう。', translation: '今天练习日语。一起一点点地学吧。' },
] as const
type PreviewSampleId = typeof previewSamples[number]['id']
const previewSampleId = ref<PreviewSampleId>('greeting')
const previewSample = computed(() => previewSamples.find(sample => sample.id === previewSampleId.value) ?? previewSamples[0])
let active = true
let previewRun = 0
let synth: SpeechSynthesis | undefined

const preferredUnavailable = computed(() => Boolean(preferences.value.voiceId && !voices.value.some(voice => voice.id === preferences.value.voiceId)))
const visibleVoiceId = computed(() => preferredUnavailable.value ? '' : preferences.value.voiceId)
const currentVoice = computed(() => voices.value.find(voice => voice.id === currentVoiceId.value))

async function refreshVoices() {
  if (!active) return
  const run = ++voiceRun
  loading.value = true
  preferences.value = readSpeechPreferences()
  localOnly.value = readEffectivePrivacyDecision()?.choice !== 'accepted'
  try {
    await audio.refreshVoices()
    if (!active || run !== voiceRun) return
    voices.value = audio.getVoiceOptions()
    currentVoiceId.value = audio.getCurrentVoiceId()
    error.value = ''
  } catch (cause) {
    if (!active || run !== voiceRun) return
    voices.value = []
    currentVoiceId.value = ''
    error.value = speechErrorMessage(speechErrorCode(cause), localOnly.value)
  } finally {
    if (active && run === voiceRun) loading.value = false
  }
}
async function openSystemSettings() {
  stopPreview()
  if (!await audio.openSystemSpeechSettings() && active) {
    error.value = '系统未提供语音设置入口，请在手机设置中搜索「文字转语音」或「语音合成」。'
  }
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
function cycleVoice(direction: -1 | 1) {
  if (loading.value || voices.value.length < 2) return
  const current = voices.value.findIndex(voice => voice.id === currentVoiceId.value)
  const next = ((current < 0 ? 0 : current) + direction + voices.value.length) % voices.value.length
  persist({ ...preferences.value, voiceId: voices.value[next].id })
}
function selectRate(rate: number) {
  persist({ ...preferences.value, rate })
}
function selectPitch(pitch: number) {
  persist({ ...preferences.value, pitch })
}
function selectSample(id: PreviewSampleId) {
  if (id === previewSampleId.value) return
  stopPreview()
  previewSampleId.value = id
  message.value = ''
  error.value = ''
}
function restoreDefaults() {
  if (persist({ voiceId: '', rate: 0.9, pitch: 1 })) message.value = '已恢复默认朗读设置，学习记录已保留。'
}
function reloadVoices() {
  stopPreview()
  message.value = ''
  refreshVoices()
}
function preferencesChanged() {
  stopPreview()
  refreshVoices()
}
function onVisibilityChange() {
  if (document.visibilityState === 'hidden') stopPreview()
  else refreshVoices()
}
async function previewVoice() {
  if (playing.value) return
  const run = ++previewRun
  error.value = ''
  message.value = ''
  playing.value = true
  await refreshVoices()
  if (!active || run !== previewRun) return
  if (!voices.value.length) { playing.value = false; return }
  const played = await audio.speak(previewSample.value.text)
  if (!active || run !== previewRun) return
  playing.value = false
  if (played) message.value = '试听结束，可以调整音色、语速或声音高低后再听。'
  else error.value = '试听未完成，请检查系统日语语音服务后重试。'
}

onMounted(() => {
  synth = window.speechSynthesis
  refreshVoices()
  synth?.addEventListener('voiceschanged', refreshVoices)
  window.addEventListener('focus', refreshVoices)
  window.addEventListener(PRIVACY_UPDATED_EVENT, privacyChanged)
  window.addEventListener(SPEECH_PREFERENCES_EVENT, preferencesChanged)
  window.addEventListener(CLOUD_SPEECH_UPDATED_EVENT, refreshCloudMode)
  document.addEventListener('visibilitychange', onVisibilityChange)
})
onUnmounted(() => {
  active = false
  previewRun++
  audio.stop()
  synth?.removeEventListener('voiceschanged', refreshVoices)
  window.removeEventListener('focus', refreshVoices)
  window.removeEventListener(PRIVACY_UPDATED_EVENT, privacyChanged)
  window.removeEventListener(SPEECH_PREFERENCES_EVENT, preferencesChanged)
  window.removeEventListener(CLOUD_SPEECH_UPDATED_EVENT, refreshCloudMode)
  document.removeEventListener('visibilitychange', onVisibilityChange)
})
</script>
