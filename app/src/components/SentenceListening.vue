<template>
  <section aria-labelledby="sentence-listening-title" class="p-4 space-y-4 min-w-0">
    <div class="rounded-2xl bg-white border border-slate-100 p-4 space-y-2">
      <h3 id="sentence-listening-title" class="text-sm font-bold text-slate-800">句子精听 · 先听，再核对</h3>
      <p class="text-xs leading-relaxed text-slate-500">{{ level }} 共 {{ sentences.length }} 个已有例句。先听写你听到的内容，再展开原文自查；不自动打分，也不增加模拟题作答次数。</p>
      <div class="flex flex-wrap gap-2 text-xs">
        <button @click="order = 'sequence'" :aria-pressed="order === 'sequence'" :class="['min-h-10 rounded-xl px-3 py-2 border', order === 'sequence' ? 'bg-rose-50 text-rose-700 border-rose-300' : 'bg-white text-slate-500 border-slate-200']">顺序练习</button>
        <button @click="order = 'random'" :aria-pressed="order === 'random'" :class="['min-h-10 rounded-xl px-3 py-2 border', order === 'random' ? 'bg-rose-50 text-rose-700 border-rose-300' : 'bg-white text-slate-500 border-slate-200']">随机练习</button>
      </div>
    </div>
    <div v-if="current" class="rounded-2xl bg-white border border-rose-100 p-4 space-y-3 min-w-0">
      <p class="text-xs font-semibold text-rose-600">{{ level }} · 第 {{ currentIndex + 1 }}/{{ sentences.length }} 句 · {{ rate }}×</p>
      <p v-if="!state.revealed" class="rounded-xl bg-slate-50 px-3 py-5 text-center text-sm text-slate-500">原文已隐藏，先试着听一句。</p>
      <div class="grid grid-cols-2 gap-2 text-xs">
        <button @click="listen" :disabled="playing" class="min-h-11 rounded-xl bg-rose-500 text-white px-3 py-2.5 font-bold disabled:opacity-50">{{ playing ? '正在朗读…' : '播放 / 重听这句' }}</button>
        <button @click="stop" :disabled="!playing" class="min-h-11 rounded-xl border border-slate-200 text-slate-600 px-3 py-2.5 font-bold disabled:text-slate-300">停止朗读</button>
      </div>
      <p v-if="error" role="alert" class="rounded-xl bg-amber-50 p-3 text-xs text-amber-900 leading-relaxed">{{ error }}</p>
      <label for="sentence-dictation" class="block text-xs font-bold text-slate-700">写下你听到的内容（可选）</label>
      <textarea id="sentence-dictation" :value="state.draft" @input="updateDraft" maxlength="500" rows="3" placeholder="没听清的部分可以留空，再重听一次" class="block w-full min-w-0 resize-y rounded-xl border border-slate-200 p-3 text-sm font-japanese text-slate-800" />
      <p class="text-[10px] text-slate-400">草稿仅在本次打开页面期间保留，不上传，不自动判断对错。</p>
      <button @click="state.revealed = !state.revealed" :aria-expanded="state.revealed" class="w-full min-h-11 rounded-xl border border-rose-200 text-rose-700 px-3 py-2.5 text-xs font-bold">{{ state.revealed ? '收起原文，继续盲听' : '展开原文与译文自查' }}</button>
      <div v-if="state.revealed" class="rounded-xl bg-rose-50/60 border border-rose-100 p-3 space-y-2 break-words">
        <p class="text-sm font-bold font-japanese leading-relaxed">{{ current.japanese }}</p>
        <p class="text-xs font-japanese text-rose-600 leading-relaxed">{{ current.reading }}</p>
        <p class="text-xs text-slate-600 leading-relaxed">{{ current.chinese }}</p>
        <p class="text-[10px] text-slate-400">来源：{{ current.sourceLabel }}</p>
        <p class="text-[11px] text-slate-500">对照检查助词、词尾和没听清的部分，然后再听一次。</p>
      </div>
      <button @click="nextSentence" :disabled="sentences.length < 2" class="w-full min-h-11 rounded-xl bg-slate-800 px-3 py-2.5 text-xs font-bold text-white disabled:opacity-50">{{ order === 'random' ? '随机换一句' : '下一句' }}</button>
    </div>
    <p v-else class="text-center text-xs text-slate-500 py-8">当前等级还没有完整例句，可以先切换等级学习。</p>
  </section>
</template>

<script setup lang="ts">
import { computed, onActivated, onDeactivated, onUnmounted, ref, watch } from 'vue'
import { audio } from '@/utils/audio'
import { LISTENING_SENTENCES, nextListeningSentenceIndex, type ListeningLevel } from '@/utils/listeningSentences'

const props = defineProps<{ level: ListeningLevel; rate: number; active: boolean }>()
const indices = ref<Partial<Record<ListeningLevel, number>>>({})
const order = ref<'sequence' | 'random'>('sequence')
const drafts = ref<Record<string, { draft: string; revealed: boolean }>>({})
const playing = ref(false)
const error = ref('')
let pageActive = true
let runId = 0
const sentences = computed(() => LISTENING_SENTENCES.filter(sentence => sentence.level === props.level))
const currentIndex = computed(() => Math.min(indices.value[props.level] ?? 0, Math.max(0, sentences.value.length - 1)))
const current = computed(() => sentences.value[currentIndex.value])
const emptyState = { draft: '', revealed: false }
const state = computed(() => drafts.value[current.value?.id ?? ''] ?? emptyState)
watch(() => current.value?.id, id => {
  if (id && !drafts.value[id]) drafts.value[id] = { draft: '', revealed: false }
}, { immediate: true, flush: 'sync' })

function stop() {
  runId++
  playing.value = false
  audio.stop()
}
function updateDraft(event: Event) { state.value.draft = (event.target as HTMLTextAreaElement).value }
async function listen() {
  if (!current.value || !props.active || !pageActive) return
  stop()
  error.value = ''
  if (!audio.getVoiceOptions().length) {
    error.value = '当前没有可用的日语音色，请在设置中检查音色与系统日语语音包。也可以展开原文继续文字学习。'
    return
  }
  const run = runId
  playing.value = true
  const played = await audio.speak(current.value.reading || current.value.japanese, props.rate)
  if (run !== runId || !props.active || !pageActive) return
  playing.value = false
  if (!played) error.value = '本句朗读未完成，请检查设备语音服务后重试，或展开原文学习。'
}
function nextSentence() {
  stop()
  error.value = ''
  const next = nextListeningSentenceIndex(currentIndex.value, sentences.value.length, order.value === 'random')
  indices.value[props.level] = next
  // Returning to a previously practiced sentence still begins as listening, with its draft retained.
  state.value.revealed = false
}
watch(() => [props.level, props.rate], () => { if (props.active) stop(); error.value = '' })
watch(() => props.active, active => { if (!active) stop() })
onActivated(() => { pageActive = true })
onDeactivated(() => { pageActive = false; stop() })
onUnmounted(() => { pageActive = false; stop() })
</script>
