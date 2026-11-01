<template>
  <section aria-labelledby="cloud-speech-title" class="min-w-0 shrink-0 rounded-2xl border border-rose-100 bg-white p-4 text-xs space-y-4">
    <div>
      <h3 id="cloud-speech-title" class="text-sm font-bold text-slate-800">联网多音色（Azure）</h3>
      <p class="mt-1 leading-relaxed text-slate-500">增加不同的日语声音。以下目录为 AI 合成音色，连接服务后以实际可用列表为准。</p>
    </div>

    <div class="grid grid-cols-2 gap-2" aria-label="朗读声音来源">
      <button data-voice-entry @click="useDeviceVoice" :aria-pressed="!saved.enabled" :class="['min-h-11 rounded-xl border px-2 py-2 font-semibold', !saved.enabled ? 'border-rose-300 bg-rose-50 text-rose-700' : 'border-slate-200 text-slate-600']">设备声音</button>
      <button @click="enableCloudVoice" :disabled="!canEnableCloud" :aria-pressed="saved.enabled" :class="['min-h-11 rounded-xl border px-2 py-2 font-semibold disabled:opacity-50', saved.enabled ? 'border-rose-300 bg-rose-50 text-rose-700' : 'border-slate-200 text-slate-600']">联网声音</button>
    </div>

    <p v-if="saved.enabled" class="rounded-xl bg-rose-50 p-3 leading-relaxed text-rose-800">已保存联网朗读偏好。{{ verified ? '当前声音：' + selectedVoiceName + '。' : '重新检测连接后可更换声音或试听。' }}网络失败时会提示，不会悄悄换成设备声音。</p>
    <p v-else class="leading-relaxed text-slate-500">当前使用设备声音；完成下面的连接检测后，再选择联网声音。</p>

    <div class="grid grid-cols-2 gap-2" aria-label="Azure 日语音色目录">
      <button v-for="voice in CLOUD_VOICE_CATALOG" :key="voice.id" @click="selectVoice(voice.id)" :disabled="!isAvailable(voice.id)" :aria-label="'联网音色 ' + voice.name" :aria-pressed="saved.voiceId === voice.id && isAvailable(voice.id)" :class="['min-h-11 min-w-0 rounded-xl border p-3 text-left disabled:cursor-default', saved.voiceId === voice.id && isAvailable(voice.id) ? 'border-rose-300 bg-rose-50 text-rose-800' : 'border-slate-200 bg-slate-50/50 text-slate-600', !isAvailable(voice.id) ? 'opacity-60' : '']">
        <span class="block font-semibold break-words">{{ voice.name }} <span class="font-normal text-[11px]">{{ voice.gender === 'Female' ? '女声' : '男声' }}</span></span>
        <span class="mt-1 block text-[11px]">{{ isAvailable(voice.id) ? '已确认可用' : verified ? '当前服务未提供' : '待配置，尚不可用' }}</span>
      </button>
    </div>

    <div class="rounded-xl bg-slate-50 p-3 space-y-3">
      <h4 class="font-semibold text-slate-700">连接我的语音服务</h4>
      <p class="text-[11px] leading-relaxed text-slate-500">Azure 密钥只在服务端配置，不填入应用。在电脑完成语音服务配置后填写服务地址和访问口令；手机需要可访问的 HTTPS 服务地址。</p>
      <label class="block space-y-1.5">
        <span class="font-semibold text-slate-600">语音服务地址</span>
        <input v-model="serviceUrl" type="url" inputmode="url" autocomplete="url" spellcheck="false" aria-label="语音服务地址" placeholder="https://你的语音服务地址" class="block min-h-11 w-full min-w-0 rounded-xl border border-slate-200 bg-white p-2.5 text-slate-800 focus:ring-2 focus:ring-rose-300" />
      </label>
      <label class="block space-y-1.5">
        <span class="font-semibold text-slate-600">服务访问口令</span>
        <input v-model="tokenDraft" type="password" autocomplete="new-password" maxlength="512" aria-label="语音服务访问口令" :placeholder="canReuseToken ? '已保存口令，留空继续使用' : '填写语音服务访问口令'" class="block min-h-11 w-full min-w-0 rounded-xl border border-slate-200 bg-white p-2.5 text-slate-800 focus:ring-2 focus:ring-rose-300" />
      </label>
      <p v-if="urlChanged && saved.accessToken" class="text-[11px] leading-relaxed text-amber-800">服务地址已改变，请重新填写该服务的访问口令。</p>
      <label class="flex min-h-11 items-start gap-2.5 rounded-xl border border-slate-200 bg-white p-3 leading-relaxed text-slate-600">
        <input v-model="consented" type="checkbox" aria-label="允许联网语音处理朗读文本" class="mt-0.5 h-4 w-4 shrink-0 accent-rose-600" />
        <span>允许将朗读文本发送到我配置的语音服务和 Azure，可能产生费用。</span>
      </label>
      <div v-if="!privacyAccepted" class="rounded-xl border border-amber-100 bg-amber-50 p-3 leading-relaxed text-amber-900 space-y-2">
        <p>当前仅允许本地功能。请先在隐私选择中允许联网，再检测连接或启用联网朗读。</p>
        <button @click="showPrivacyChoice" class="min-h-11 rounded-lg border border-amber-200 bg-white px-3 py-2 font-semibold">查看隐私与联网选择</button>
      </div>
      <button @click="checkConnection" :disabled="checking || !privacyAccepted || !consented || !normalizedDraftUrl || effectiveToken.length < 16" class="min-h-11 w-full rounded-xl bg-rose-600 px-3 py-2.5 font-semibold text-white disabled:bg-slate-200 disabled:text-slate-500">{{ checking ? '正在检测连接…' : '保存并检测连接' }}</button>
      <p class="text-[11px] leading-relaxed text-slate-500">检测只读取可用音色，不生成语音。服务尚未填写 Azure 资源信息时，会保持待配置状态。</p>
    </div>

    <div v-if="verified" class="space-y-3">
      <p class="text-emerald-800 leading-relaxed" role="status">连接已确认：当前服务提供 {{ verifiedVoices.length }} 种可用日语音色。</p>
      <div class="grid grid-cols-2 gap-2">
        <label class="block min-w-0 space-y-1.5">
          <span class="font-semibold text-slate-600">联网朗读速度</span>
          <select :value="speechPreferences.rate" @change="changeRate" aria-label="联网朗读速度" class="min-h-11 w-full rounded-xl border border-slate-200 bg-white p-2 text-slate-700">
            <option v-for="rate in SPEECH_RATES" :key="rate" :value="rate">{{ rate }}×</option>
          </select>
        </label>
        <label class="block min-w-0 space-y-1.5">
          <span class="font-semibold text-slate-600">声音高低</span>
          <select :value="speechPreferences.pitch ?? 1" @change="changePitch" aria-label="联网声音高低" class="min-h-11 w-full rounded-xl border border-slate-200 bg-white p-2 text-slate-700">
            <option v-for="pitch in SPEECH_PITCHES" :key="pitch" :value="pitch">{{ pitchNames[pitch] }}</option>
          </select>
        </label>
      </div>
      <p class="font-japanese leading-relaxed text-slate-700" lang="ja">こんにちは。今日は日本語を練習します。</p>
      <div class="grid grid-cols-2 gap-2">
        <button @click="previewVoice" :disabled="!canPreview || playing" class="min-h-11 rounded-xl bg-rose-600 px-2 py-2.5 font-semibold text-white disabled:bg-slate-200 disabled:text-slate-500">{{ playing ? '正在联网试听…' : '试听联网音色' }}</button>
        <button @click="stopPreview" :disabled="!playing" class="min-h-11 rounded-xl border border-slate-200 px-2 py-2.5 font-semibold text-slate-600 disabled:text-slate-300">停止联网试听</button>
      </div>
      <p v-if="!saved.enabled" class="text-[11px] leading-relaxed text-slate-500">选中已确认的音色后，点击上方“联网声音”启用，再试听。</p>
    </div>

    <p v-if="error" role="alert" class="rounded-xl bg-red-50 p-3 leading-relaxed text-red-700">{{ error }}</p>
    <p v-else-if="message" role="status" class="rounded-xl bg-slate-50 p-3 leading-relaxed text-slate-600">{{ message }}</p>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { audio } from '@/utils/audio'
import {
  CLOUD_SPEECH_UPDATED_EVENT, CLOUD_VOICE_CATALOG, cloudSpeechErrorMessage,
  fetchCloudVoices, readCloudSpeechConfig, saveCloudSpeechConfig,
  type CloudSpeechConfig, type CloudVoice,
} from '@/utils/cloudSpeech'
import { PRIVACY_UPDATED_EVENT, readEffectivePrivacyDecision } from '@/utils/privacy'
import {
  SPEECH_PREFERENCES_EVENT, SPEECH_RATES, SPEECH_PITCHES,
  readSpeechPreferences, saveSpeechPreferences, type SpeechPreferences,
} from '@/utils/speechPreferences'

const saved = ref(readCloudSpeechConfig())
const serviceUrl = ref(saved.value.serviceUrl)
const tokenDraft = ref('')
const consented = ref(saved.value.enabled)
const privacyAccepted = ref(readEffectivePrivacyDecision()?.choice === 'accepted')
const speechPreferences = ref(readSpeechPreferences())
const verifiedVoices = ref<CloudVoice[]>([])
const verified = ref(false)
const checking = ref(false)
const playing = ref(false)
const error = ref('')
const message = ref('')
const pitchNames: Record<number, string> = { 0.8: '偏低', 0.9: '稍低', 1: '自然', 1.1: '稍高', 1.2: '偏高' }
let active = true
let connectionRun = 0
let previewRun = 0
let connectionAbort: AbortController | undefined
let verifiedConnection = ''

const normalizedDraftUrl = computed(() => {
  const input = serviceUrl.value.trim()
  try { return new URL(input).toString().replace(/\/+$/, '') } catch { return input }
})
const urlChanged = computed(() => normalizedDraftUrl.value !== saved.value.serviceUrl)
const canReuseToken = computed(() => !urlChanged.value && Boolean(saved.value.accessToken))
const effectiveToken = computed(() => tokenDraft.value || (canReuseToken.value ? saved.value.accessToken : ''))
const draftConnection = computed(() => JSON.stringify([normalizedDraftUrl.value, effectiveToken.value]))
const selectedVoiceName = computed(() => CLOUD_VOICE_CATALOG.find(voice => voice.id === saved.value.voiceId)?.name ?? '未选择')
const canEnableCloud = computed(() => privacyAccepted.value && consented.value && verified.value && !checking.value && draftConnection.value === verifiedConnection && isAvailable(saved.value.voiceId))
const canPreview = computed(() => saved.value.enabled && canEnableCloud.value)

function isAvailable(id: string): boolean {
  return verified.value && verifiedVoices.value.some(voice => voice.id === id && voice.verified)
}
function stopPreview() {
  previewRun++
  audio.stop()
  playing.value = false
}
function cancelConnection() {
  connectionRun++
  connectionAbort?.abort()
  connectionAbort = undefined
  checking.value = false
}
function invalidateVerification() {
  cancelConnection()
  verified.value = false
  verifiedVoices.value = []
  verifiedConnection = ''
}
function persist(config: CloudSpeechConfig): boolean {
  stopPreview()
  if (!saveCloudSpeechConfig(config)) {
    saved.value = readCloudSpeechConfig()
    error.value = !config.enabled && !saved.value.enabled
      ? '本次已切回设备声音，但未能保存。下次打开应用请检查联网开关，并在存储恢复后重新保存。'
      : '联网朗读设置未能保存，仍使用上次设置。请检查设备存储后重试。'
    return false
  }
  saved.value = readCloudSpeechConfig()
  return true
}
function connectionDraftChanged() {
  stopPreview()
  invalidateVerification()
  message.value = ''
  error.value = ''
  if (saved.value.enabled) persist({ ...saved.value, enabled: false })
}
watch(normalizedDraftUrl, (next, previous) => {
  if (next === previous) return
  tokenDraft.value = ''
  connectionDraftChanged()
}, { flush: 'sync' })
watch(tokenDraft, connectionDraftChanged, { flush: 'sync' })
watch(consented, agreed => {
  if (!agreed) {
    stopPreview()
    invalidateVerification()
    error.value = ''
    message.value = '已停止联网朗读。重新同意并检测连接后，才可再次启用。'
    if (saved.value.enabled) persist({ ...saved.value, enabled: false })
  }
})

function useDeviceVoice() {
  cancelConnection()
  error.value = ''
  if (persist({ ...saved.value, enabled: false })) message.value = '已切换为设备声音，联网连接信息仍保留。'
}
function enableCloudVoice() {
  if (!canEnableCloud.value) return
  error.value = ''
  if (persist({ ...saved.value, enabled: true })) message.value = '已启用联网朗读，选中的内容将发送到语音服务和 Azure。'
}
function selectVoice(voiceId: string) {
  if (!isAvailable(voiceId) || draftConnection.value !== verifiedConnection) return
  error.value = ''
  if (persist({ ...saved.value, voiceId })) message.value = '已保存音色：' + selectedVoiceName.value + '。'
}
async function checkConnection() {
  if (!privacyAccepted.value || !consented.value || checking.value) return
  stopPreview()
  invalidateVerification()
  error.value = ''
  message.value = ''
  const candidate: CloudSpeechConfig = {
    serviceUrl: normalizedDraftUrl.value, accessToken: effectiveToken.value,
    enabled: false, voiceId: saved.value.voiceId,
  }
  if (!candidate.serviceUrl || candidate.accessToken.length < 16) {
    error.value = '请填写 HTTPS 语音服务地址及至少 16 位服务访问口令。本机测试可以使用 localhost。'
    return
  }
  if (!persist(candidate)) return
  const run = ++connectionRun
  const controller = new AbortController()
  connectionAbort = controller
  checking.value = true
  const requestedConnection = JSON.stringify([saved.value.serviceUrl, saved.value.accessToken])
  try {
    const response = await fetchCloudVoices(saved.value, controller.signal)
    if (!active || run !== connectionRun || controller.signal.aborted || !privacyAccepted.value || !consented.value) return
    if (!response.configured) {
      message.value = '服务已连接，但 Azure 资源尚未配置。请在电脑完成语音服务配置；七种音色仍待配置，尚不可用。'
      return
    }
    verifiedVoices.value = response.voices.filter(voice => voice.verified)
    verified.value = true
    verifiedConnection = requestedConnection
    if (!verifiedVoices.value.length) {
      message.value = '服务已连接，但当前 Azure 区域没有返回目录中的可用日语音色。请检查资源区域后重试。'
      return
    }
    if (!isAvailable(saved.value.voiceId)) {
      if (!persist({ ...saved.value, enabled: false, voiceId: verifiedVoices.value[0].id })) {
        invalidateVerification()
        return
      }
    }
    message.value = '音色列表已确认。选择喜欢的音色，再点击“联网声音”启用。'
  } catch (cause) {
    if (!active || run !== connectionRun || controller.signal.aborted) return
    error.value = cloudSpeechErrorMessage(cause)
  } finally {
    if (active && run === connectionRun) {
      checking.value = false
      connectionAbort = undefined
    }
  }
}
function changeSpeechPreference(next: SpeechPreferences, input: HTMLSelectElement, previous: number) {
  stopPreview()
  error.value = ''
  if (!saveSpeechPreferences(next)) {
    input.value = String(previous)
    error.value = '朗读设置未能保存，仍使用上次设置。'
    return
  }
  speechPreferences.value = readSpeechPreferences()
}
function changeRate(event: Event) {
  const input = event.target as HTMLSelectElement
  changeSpeechPreference({ ...speechPreferences.value, rate: Number(input.value) }, input, speechPreferences.value.rate)
}
function changePitch(event: Event) {
  const input = event.target as HTMLSelectElement
  changeSpeechPreference({ ...speechPreferences.value, pitch: Number(input.value) }, input, speechPreferences.value.pitch ?? 1)
}
async function previewVoice() {
  if (!canPreview.value || playing.value) return
  const run = ++previewRun
  error.value = ''
  message.value = ''
  playing.value = true
  const played = await audio.speak('こんにちは。今日は日本語を練習します。')
  if (!active || run !== previewRun) return
  playing.value = false
  if (played) message.value = '联网试听结束。这是 AI 合成语音。'
  else error.value = '联网试听未完成，请检查语音服务连接、Azure 配置或使用额度后重试。'
}
function showPrivacyChoice() {
  stopPreview()
  window.dispatchEvent(new Event('nihongomate:show-privacy'))
}
function cloudConfigChanged() {
  const next = readCloudSpeechConfig()
  const connectionChanged = next.serviceUrl !== saved.value.serviceUrl || next.accessToken !== saved.value.accessToken
  stopPreview()
  saved.value = next
  if (connectionChanged) invalidateVerification()
}
function privacyChanged() {
  privacyAccepted.value = readEffectivePrivacyDecision()?.choice === 'accepted'
  stopPreview()
  invalidateVerification()
}
function speechPreferenceChanged() {
  stopPreview()
  speechPreferences.value = readSpeechPreferences()
}
function visibilityChanged() {
  if (document.visibilityState === 'hidden') {
    stopPreview()
    invalidateVerification()
  }
}
onMounted(() => {
  window.addEventListener(CLOUD_SPEECH_UPDATED_EVENT, cloudConfigChanged)
  window.addEventListener(PRIVACY_UPDATED_EVENT, privacyChanged)
  window.addEventListener(SPEECH_PREFERENCES_EVENT, speechPreferenceChanged)
  document.addEventListener('visibilitychange', visibilityChanged)
})
onUnmounted(() => {
  active = false
  cancelConnection()
  stopPreview()
  window.removeEventListener(CLOUD_SPEECH_UPDATED_EVENT, cloudConfigChanged)
  window.removeEventListener(PRIVACY_UPDATED_EVENT, privacyChanged)
  window.removeEventListener(SPEECH_PREFERENCES_EVENT, speechPreferenceChanged)
  document.removeEventListener('visibilitychange', visibilityChanged)
})
</script>

