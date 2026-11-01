<template>
  <section class="h-full min-h-0 overflow-y-auto bg-slate-50 p-4 pb-8 space-y-4 text-sm text-slate-800" data-testid="question-bank-practice">
    <div class="flex items-center justify-between gap-3">
      <h2 class="text-base font-black">📚 题库专项练习</h2>
      <button class="min-h-10 rounded-xl px-3 font-bold text-rose-600" @click="leave">返回练习</button>
    </div>
    <div class="rounded-2xl border border-slate-100 bg-white p-4 space-y-3">
      <p class="text-xs leading-relaxed text-slate-600">免费练习，题目为学习参考，并非 JLPT 官方真题；部分内容尚未经日语教师逐题审校。听力由设备合成，音色和发音因设备而异。</p>
      <p class="text-xs leading-relaxed text-slate-600">本轮进度在应用运行期间保留，关闭应用后不恢复；切换等级或题型会清空本轮作答。</p>
      <div class="grid grid-cols-2 gap-3">
        <label class="space-y-1 font-bold" for="practice-bank-level"><span>选择等级</span>
          <select id="practice-bank-level" :value="level" class="min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3" @change="requestLevel">
            <option v-for="item in levels" :key="item" :value="item">{{ item }}</option>
          </select>
        </label>
        <label class="space-y-1 font-bold" for="practice-bank-category"><span>选择题型</span>
          <select id="practice-bank-category" :value="category" class="min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3" @change="requestCategory">
            <option v-for="item in categories" :key="item.value" :value="item.value">{{ item.label }}</option>
          </select>
        </label>
      </div>
      <p aria-live="polite" class="text-xs text-slate-600">{{ level }} · {{ categoryLabel }}：共 {{ questions.length }} 题<span v-if="category !== 'vocab'">，{{ groups.length }} 组材料</span> · 已提交 {{ submittedCount }} 题</p>
      <label v-if="groups.length" for="practice-bank-group" class="block space-y-1 font-bold">
        <span>{{ category === 'vocab' ? '选择题目' : '选择材料组' }}</span>
        <select id="practice-bank-group" :value="currentGroupIndex" class="min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 font-normal" @change="chooseGroup">
          <option v-for="(group, index) in groups" :key="group.key" :value="index">{{ groupLabel(index, group) }}</option>
        </select>
      </label>
    </div>

    <div v-if="!question" class="rounded-2xl border border-slate-100 bg-white p-5 text-slate-600" role="status">当前等级和题型暂无题目，请选择其他组合。</div>
    <div v-else class="rounded-2xl border border-slate-100 bg-white p-4 space-y-4">
      <h3 class="font-black">第 {{ currentIndex + 1 }} / {{ questions.length }} 题<span v-if="category !== 'vocab'" class="ml-2 text-xs font-normal text-slate-500">{{ currentGroupLabel }}</span></h3>
      <div v-if="question.passage" class="max-h-64 overflow-y-auto whitespace-pre-line rounded-xl bg-slate-50 p-3 font-japanese leading-relaxed" tabindex="0" aria-label="阅读材料">{{ question.passage }}</div>
      <p class="whitespace-pre-line font-bold">{{ question.prompt }}</p>
      <div v-if="category === 'listening'" class="space-y-2 rounded-xl bg-indigo-50 p-3">
        <p class="text-xs text-indigo-900">使用设备日语语音朗读，可重复播放。系统没有可用日语语音时可能无法播放。</p>
        <div class="flex gap-2"><button class="min-h-10 rounded-lg bg-indigo-600 px-3 py-2 font-bold text-white disabled:opacity-50" :disabled="playing || !question.audioReading" @click="playAudio">{{ playing ? '正在播放' : '播放听力' }}</button><button class="min-h-10 rounded-lg bg-white px-3 py-2 font-bold disabled:opacity-50" :disabled="!playing" @click="stopAudio">停止</button></div>
        <p v-if="audioProblem" role="status" class="text-xs text-amber-800">{{ audioProblem }}</p>
      </div>
      <fieldset class="grid gap-2" :disabled="isSubmitted">
        <legend class="mb-2 font-bold">选择答案</legend>
        <label v-for="(option, index) in question.options" :key="index" :class="['flex min-h-11 items-start gap-2 rounded-xl border p-3 break-words', selection === index ? 'border-indigo-500 bg-indigo-50 text-indigo-900' : 'border-slate-200 bg-white']">
          <input class="mt-1 shrink-0" type="radio" :name="`practice-${question.id}`" :value="index" :checked="selection === index" @change="selectAnswer(index)">
          <span>{{ String.fromCharCode(65 + index) }}. {{ option }}</span>
        </label>
      </fieldset>
      <button v-if="!isSubmitted" class="min-h-11 w-full rounded-xl bg-rose-500 px-3 py-2 font-bold text-white disabled:opacity-50" :disabled="selection === undefined" @click="submitAnswer">提交本题</button>
      <div v-else class="rounded-xl border border-indigo-100 bg-indigo-50 p-3 space-y-2" role="status">
        <p class="font-black">{{ isCorrect ? '回答正确' : '再看看解析' }}</p>
        <p>你的答案：{{ question.options[selection!] }}</p>
        <p>正确答案：{{ question.options[question.correctIndex] }}</p>
        <p class="whitespace-pre-line text-slate-700">{{ question.explanation }}</p>
        <details v-if="question.transcript || question.translation" class="rounded-lg bg-white p-2">
          <summary class="cursor-pointer py-1 font-bold">查看{{ category === 'listening' ? '听力原文与译文' : '参考译文' }}</summary>
          <p v-if="question.transcript" class="mt-2 whitespace-pre-line">{{ question.transcript }}</p>
          <p v-if="question.translation" class="mt-2 whitespace-pre-line text-slate-600">{{ question.translation }}</p>
        </details>
      </div>
      <div class="grid grid-cols-2 gap-2">
        <button class="min-h-11 rounded-xl bg-slate-100 font-bold disabled:opacity-40" :disabled="currentIndex === 0" @click="goTo(currentIndex - 1)">上一题</button>
        <button class="min-h-11 rounded-xl bg-slate-100 font-bold disabled:opacity-40" :disabled="currentIndex >= questions.length - 1" @click="goTo(currentIndex + 1)">下一题</button>
      </div>
      <button v-if="hasWork" class="min-h-10 w-full rounded-xl border border-slate-200 px-3 py-2 font-bold text-slate-600" @click="pending = { kind: 'reset' }">清空本轮作答并重练</button>
    </div>

    <div v-if="pending" role="dialog" aria-modal="true" aria-labelledby="practice-bank-confirm-title" class="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4">
      <div class="w-full max-w-sm rounded-2xl bg-white p-5 space-y-3 shadow-lg">
        <h3 id="practice-bank-confirm-title" class="font-black">确认清空本轮作答</h3>
        <p>当前专项的已选答案和解析状态会清空，模拟考场和其他学习记录不受影响。</p>
        <div class="flex gap-2"><button class="min-h-11 flex-1 rounded-xl bg-slate-100 font-bold" @click="pending = null">取消</button><button class="min-h-11 flex-1 rounded-xl bg-rose-500 font-bold text-white" @click="confirmChange">确认</button></div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onActivated, onDeactivated, onMounted, onUnmounted, ref, watch } from 'vue'
import { MOCK_EXAM_BANK, type MockExamCategory, type MockExamLevel, type MockExamQuestion } from '@/data/mockExamBank'
import { audio } from '@/utils/audio'
import { playPracticeAudio, segmentPracticeAudio } from '@/utils/advancedPracticeAudio'
import { orderStudyQuestion } from '@/utils/studyQuestionOrder'
import { PROGRESS_RESET_EVENT } from '@/utils/storage'

type PracticeCategory = Extract<MockExamCategory, 'vocab' | 'reading' | 'listening'>
type Pending = { kind: 'level'; value: MockExamLevel } | { kind: 'category'; value: PracticeCategory } | { kind: 'reset' }
type Group = { key: string; start: number; questions: MockExamQuestion[] }

const props = withDefaults(defineProps<{ active?: boolean }>(), { active: true })
const emit = defineEmits<{ close: [] }>()
const levels: MockExamLevel[] = ['N5', 'N4', 'N3', 'N2', 'N1']
const categories: { value: PracticeCategory; label: string }[] = [
  { value: 'vocab', label: '词汇' }, { value: 'reading', label: '阅读' }, { value: 'listening', label: '听力' },
]
const bank = MOCK_EXAM_BANK.map(orderStudyQuestion)
const level = ref<MockExamLevel>('N5')
const category = ref<PracticeCategory>('vocab')
const currentIndex = ref(0)
const selections = ref<Record<string, number>>({})
const submitted = ref<Record<string, boolean>>({})
const pending = ref<Pending | null>(null)
const playing = ref(false)
const audioProblem = ref('')
let audioRun = 0

const groups = computed<Group[]>(() => {
  const byId = new Map<string, MockExamQuestion[]>()
  for (const q of bank) {
    if (q.level !== level.value || q.category !== category.value) continue
    const key = q.groupId ? `group:${q.groupId}` : `question:${q.id}`
    const group = byId.get(key) ?? []
    group.push(q)
    byId.set(key, group)
  }
  let start = 0
  return [...byId].map(([key, list]) => {
    const group = { key, start, questions: list }
    start += list.length
    return group
  })
})
const questions = computed(() => groups.value.flatMap(group => group.questions))
const question = computed(() => questions.value[currentIndex.value])
const currentGroupIndex = computed(() => Math.max(0, groups.value.findIndex(group => currentIndex.value >= group.start && currentIndex.value < group.start + group.questions.length)))
const currentGroupLabel = computed(() => {
  const group = groups.value[currentGroupIndex.value]
  return group ? `材料 ${currentGroupIndex.value + 1} / ${groups.value.length} · 本组第 ${currentIndex.value - group.start + 1} / ${group.questions.length} 题` : ''
})
const categoryLabel = computed(() => categories.find(item => item.value === category.value)?.label ?? '')
const selection = computed(() => question.value ? selections.value[question.value.id] : undefined)
const isSubmitted = computed(() => Boolean(question.value && submitted.value[question.value.id]))
const isCorrect = computed(() => !!question.value && selection.value === question.value.correctIndex)
const hasWork = computed(() => Object.keys(selections.value).length > 0 || currentIndex.value > 0)
const submittedCount = computed(() => Object.keys(submitted.value).length)

function groupLabel(index: number, group: Group) {
  const sample = group.questions[0]
  const label = category.value === 'vocab' ? `第 ${index + 1} 题` : `材料 ${index + 1} · ${group.questions.length} 题`
  // 听力只显示问题，不在题目选择器中泄露听力原文。
  const text = category.value === 'reading' ? sample?.passage : sample?.prompt
  const preview = text?.replace(/\s+/gu, ' ').trim().slice(0, 28)
  return preview ? `${label} · ${preview}` : label
}
function resetAnswers() {
  stopAudio()
  currentIndex.value = 0
  selections.value = {}
  submitted.value = {}
  audioProblem.value = ''
}
function requestLevel(event: Event) {
  const select = event.target as HTMLSelectElement
  const value = select.value as MockExamLevel
  select.value = level.value
  if (value !== level.value && levels.includes(value)) requestChange({ kind: 'level', value })
}
function requestCategory(event: Event) {
  const select = event.target as HTMLSelectElement
  const value = select.value as PracticeCategory
  select.value = category.value
  if (value !== category.value && categories.some(item => item.value === value)) requestChange({ kind: 'category', value })
}
function requestChange(change: Pending) {
  if (hasWork.value) pending.value = change
  else applyChange(change)
}
function applyChange(change: Pending) {
  resetAnswers()
  if (change.kind === 'level') level.value = change.value
  if (change.kind === 'category') category.value = change.value
}
function confirmChange() {
  if (pending.value) applyChange(pending.value)
  pending.value = null
}
function selectAnswer(index: number) {
  if (!question.value || isSubmitted.value || !Number.isInteger(index) || index < 0 || index >= question.value.options.length) return
  selections.value = { ...selections.value, [question.value.id]: index }
}
function submitAnswer() {
  if (!question.value || selection.value === undefined || isSubmitted.value) return
  stopAudio()
  submitted.value = { ...submitted.value, [question.value.id]: true }
}
function goTo(index: number) {
  if (!Number.isInteger(index) || index < 0 || index >= questions.value.length || index === currentIndex.value) return
  stopAudio()
  audioProblem.value = ''
  currentIndex.value = index
}
function chooseGroup(event: Event) {
  const index = Number((event.target as HTMLSelectElement).value)
  const group = groups.value[index]
  if (group) goTo(group.start)
}
function stopAudio() {
  audioRun += 1
  if (playing.value) audio.stop()
  playing.value = false
}
async function playAudio() {
  if (!props.active || category.value !== 'listening' || !question.value?.audioReading) return
  stopAudio()
  audioProblem.value = ''
  const run = audioRun
  const chunks = segmentPracticeAudio(question.value.audioReading)
  if (!chunks.length) { audioProblem.value = '此题没有可用的朗读文本。'; return }
  playing.value = true
  try {
    const done = await playPracticeAudio(chunks, text => audio.speak(text), () => props.active && run === audioRun)
    if (!done && run === audioRun && props.active) audioProblem.value = '听力未能完整播放，请检查设备日语语音服务及本地语音设置。'
  } catch {
    if (run === audioRun) audioProblem.value = '听力无法播放，请检查设备日语语音服务。'
  } finally { if (run === audioRun) playing.value = false }
}
function leave() { stopAudio(); emit('close') }
function onVisibilityChange() { if (document.visibilityState !== 'visible') stopAudio() }
function onProgressReset() { resetAnswers(); pending.value = null }
onMounted(() => {
  document.addEventListener('visibilitychange', onVisibilityChange)
  window.addEventListener(PROGRESS_RESET_EVENT, onProgressReset)
})
watch(() => props.active, active => { if (!active) stopAudio() }, { flush: 'sync' })
onActivated(() => { if (!props.active) stopAudio() })
onDeactivated(stopAudio)
onUnmounted(() => {
  document.removeEventListener('visibilitychange', onVisibilityChange)
  window.removeEventListener(PROGRESS_RESET_EVENT, onProgressReset)
  stopAudio()
})
</script>
