<template>
  <div class="h-full min-h-0 overflow-y-auto bg-slate-50 p-4 pb-8 space-y-4 text-sm text-slate-800" data-testid="mock-exam">
    <div class="flex items-center justify-between gap-2">
      <h2 class="font-black text-base">模拟考场</h2>
      <button class="min-h-10 rounded-xl px-3 text-rose-600 font-bold" @click="leave">返回练习</button>
    </div>
    <p v-if="storageProblem" role="alert" class="rounded-xl bg-amber-50 p-3 text-amber-900">{{ storageProblem }} <button v-if="exam" @click="persist" class="underline font-bold">重试保存</button></p>

    <template v-if="!exam">
      <div class="rounded-2xl bg-white border border-slate-100 p-4 space-y-3">
        <h3 class="font-bold">考前说明</h3>
        <p>各科时长参考 JLPT，当前题量少于正式考试；题目为原创或既有练习，并非官方真题，结果也不是官方成绩或合格判定。</p>
        <p>每次新开考场会从题库抽取题组；开始后本场题目固定，重新进入不会换题。</p>
        <p>听力由设备语音合成，可手动播放与重听，与正式考试连续真人录音不同。请确认系统有日语语音；若不可用，听力题可能无法作答。</p>
        <label class="block font-bold" for="mock-level">选择等级</label>
        <select id="mock-level" v-model="level" class="w-full rounded-xl border border-slate-200 bg-white px-3 py-3">
          <option v-for="item in levels" :key="item" :value="item">{{ item }}</option>
        </select>
        <div v-if="preview" class="space-y-2" aria-label="各科题量与时间">
          <div v-for="section in preview" :key="section.id" class="rounded-xl bg-slate-50 p-3 flex justify-between gap-2">
            <span>{{ section.label }}</span><span>{{ section.questions.length }} 题 · {{ section.durationMinutes }} 分钟</span>
          </div>
        </div>
        <p v-else class="text-amber-700">当前等级题目不完整，暂时无法开始。</p>
        <p>开始后当前科目按真实经过时间倒计时；离开页面或关闭应用不会暂停。每科交卷后手动开始下一科。</p>
        <button :disabled="!preview || damagedRecord" @click="begin" class="min-h-11 w-full rounded-xl bg-rose-500 px-3 py-2 font-bold text-white disabled:opacity-50">开始本次模拟</button>
        <button v-if="damagedRecord" @click="confirmDiscard = true" class="min-h-11 w-full rounded-xl border border-amber-300 px-3 py-2 font-bold text-amber-800">处理无法恢复的考场记录</button>
      </div>
    </template>

    <template v-else-if="exam.phase === 'running' && section && question">
      <div class="sticky top-0 z-10 rounded-2xl border border-rose-100 bg-white p-3 shadow-sm space-y-2">
        <div class="flex justify-between gap-3 font-bold"><span>{{ exam.level }} · {{ section.label }}</span><span class="font-mono text-rose-600" role="timer" aria-label="当前科目剩余时间">{{ remaining }}</span></div>
        <p class="text-xs text-slate-500">已作答 {{ answeredCount }}/{{ section.questions.length }} · 本科目 {{ section.durationMinutes }} 分钟</p>
      </div>
      <div class="rounded-2xl bg-white p-4 border border-slate-100 space-y-4">
        <div class="flex items-center justify-between gap-2"><h3 class="font-black">第 {{ currentIndex + 1 }}/{{ section.questions.length }} 题</h3><button @click="toggleFlag" :aria-pressed="isFlagged" class="rounded-lg border border-slate-200 px-3 py-2 text-xs">{{ isFlagged ? '取消标记' : '标记稍后检查' }}</button></div>
        <div v-if="question.passage" class="max-h-64 overflow-y-auto whitespace-pre-line rounded-xl bg-slate-50 p-3 font-japanese leading-relaxed">{{ question.passage }}</div>
        <p class="font-bold whitespace-pre-line">{{ question.prompt }}</p>
        <div v-if="sectionIsListening" class="space-y-2 rounded-xl bg-indigo-50 p-3">
          <p class="text-xs text-indigo-900">设备合成朗读，手动播放，可重听；与真实考试录音不同。</p>
          <div class="flex gap-2"><button @click="playAudio" :disabled="playing || !question.audioReading" class="min-h-10 rounded-lg bg-indigo-600 px-3 py-2 font-bold text-white disabled:opacity-50">{{ playing ? '正在播放' : '播放听力' }}</button><button @click="stopAudio" :disabled="!playing" class="min-h-10 rounded-lg bg-white px-3 py-2 font-bold disabled:opacity-50">停止</button></div>
          <p v-if="audioProblem" role="status" class="text-amber-800 text-xs">{{ audioProblem }}</p>
        </div>
        <div class="grid gap-2" role="group" aria-label="选择答案">
          <button v-for="(option,index) in question.options" :key="index" @click="choose(index)" :aria-pressed="section.answers[question.id] === index" :class="['min-h-11 rounded-xl border p-3 text-left break-words', section.answers[question.id] === index ? 'border-indigo-500 bg-indigo-50 text-indigo-900 font-bold' : 'border-slate-200 bg-white']">{{ String.fromCharCode(65 + index) }}. {{ option }}</button>
        </div>
        <div class="grid grid-cols-2 gap-2"><button @click="goTo(currentIndex - 1)" :disabled="currentIndex === 0" class="min-h-11 rounded-xl bg-slate-100 font-bold disabled:opacity-40">上一题</button><button @click="goTo(currentIndex + 1)" :disabled="currentIndex >= section.questions.length - 1" class="min-h-11 rounded-xl bg-slate-100 font-bold disabled:opacity-40">下一题</button></div>
      </div>
      <div class="rounded-2xl bg-white p-4 border border-slate-100 space-y-3">
        <h3 class="font-bold">答题卡</h3><p class="text-xs text-slate-500">深色表示已答，橙色圆点表示已标记；点击可跳题。</p>
        <div class="grid grid-cols-6 gap-2"><button v-for="(q,index) in section.questions" :key="q.id" @click="goTo(index)" :aria-label="`第${index + 1}题，${section.answers[q.id] === undefined ? '未作答' : '已作答'}${flags[q.id] ? '，已标记' : ''}`" :aria-current="currentIndex === index ? 'true' : undefined" :class="['relative min-h-10 rounded-lg border text-xs font-bold', currentIndex === index ? 'ring-2 ring-rose-400' : '', section.answers[q.id] === undefined ? 'bg-white text-slate-600 border-slate-200' : 'bg-indigo-600 text-white border-indigo-600']">{{ index + 1 }}<span v-if="flags[q.id]" class="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-orange-400" aria-hidden="true"></span></button></div>
        <button @click="confirmSubmit = true" class="min-h-11 w-full rounded-xl bg-rose-500 px-3 py-2 font-bold text-white">交本节答卷</button>
        <button @click="confirmDiscard = true" class="min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 font-bold text-slate-600">放弃本次模拟</button>
      </div>
    </template>

    <template v-else-if="exam.phase === 'break' && section">
      <div class="rounded-2xl bg-white p-4 border border-slate-100 space-y-3">
        <h3 class="font-black text-base">本科已交卷</h3>
        <p v-if="section.submitReason === 'timeout'">考试时间到，本节已自动交卷。</p><p v-else>已提前交卷，本节答案已锁定。</p>
        <p>下一科：{{ nextSection?.label }} · {{ nextSection?.durationMinutes }} 分钟 · {{ nextSection?.questions.length }} 题。开始下一科后计时。</p>
        <button @click="nextSectionStart" class="min-h-11 w-full rounded-xl bg-indigo-600 px-3 py-2 text-white font-bold">开始下一科</button>
        <button @click="confirmDiscard = true" class="min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 font-bold text-slate-600">放弃本次模拟</button>
      </div>
    </template>

    <template v-else-if="exam.phase === 'complete'">
      <div class="rounded-2xl bg-white p-4 border border-slate-100 space-y-3">
        <h3 class="font-black text-base">本次模拟结束</h3>
        <p class="text-xs text-slate-600">以下仅是本次原创练习的答对题数，不是 JLPT 官方分数，也不用于判断考试合格。</p>
        <div v-for="item in summary" :key="item.id" class="rounded-xl bg-slate-50 p-3"><strong>{{ item.label }}</strong> · 答对 {{ item.correct }}/{{ item.total }} · 已答 {{ item.answered }}/{{ item.total }}</div>
        <button @click="confirmDiscard = true" class="min-h-11 w-full rounded-xl bg-rose-500 px-3 py-2 font-bold text-white">结束回顾，开始新模拟</button>
      </div>
      <div class="rounded-2xl bg-white p-4 border border-slate-100 space-y-3">
        <h3 class="font-black">筛选答案回顾</h3>
        <div class="grid grid-cols-2 gap-2 sm:grid-cols-4" role="group" aria-label="筛选回顾题目">
          <button v-for="filter in reviewFilters" :key="filter.value" type="button" @click="reviewFilter = filter.value" :aria-pressed="reviewFilter === filter.value" :class="['min-h-11 rounded-xl border px-3 py-2 font-bold', reviewFilter === filter.value ? 'border-indigo-600 bg-indigo-50 text-indigo-900' : 'border-slate-200 bg-white text-slate-600']">{{ filter.label }} {{ reviewCounts[filter.value] }}</button>
        </div>
        <p class="text-xs text-slate-500" role="status">{{ reviewFilters.find(item => item.value === reviewFilter)?.label }}：{{ reviewCounts[reviewFilter] }} 题。结束回顾后本次考场记录会清除。</p>
      </div>
      <p v-if="reviewCounts[reviewFilter] === 0" class="rounded-2xl bg-white p-4 text-slate-600" role="status">当前筛选没有题目，请选择其他分类。</p>
      <div v-for="resultSection in filteredReviewSections" :key="resultSection.id" class="rounded-2xl bg-white p-4 border border-slate-100 space-y-3">
        <h3 class="font-black">{{ resultSection.label }} · 答案回顾</h3>
        <details v-for="entry in resultSection.entries" :key="entry.item.id" class="rounded-xl border border-slate-200 p-3">
          <summary class="cursor-pointer font-bold py-1">第 {{ entry.index + 1 }} 题 · {{ entry.status === 'unanswered' ? '未答' : entry.status === 'correct' ? '答对' : '答错' }}</summary>
          <div class="mt-3 space-y-2"><p v-if="entry.item.passage" class="whitespace-pre-line rounded-lg bg-slate-50 p-2">{{ entry.item.passage }}</p><p class="font-bold whitespace-pre-line">{{ entry.item.prompt }}</p><p>你的答案：{{ entry.answer === undefined ? '未作答' : entry.item.options[entry.answer] }}</p><p>正确答案：{{ entry.item.options[entry.item.correctIndex] }}</p><p class="text-slate-600">{{ entry.item.explanation }}</p><p v-if="entry.item.transcript" class="whitespace-pre-line text-slate-600">听力原文：{{ entry.item.transcript }}</p><p v-if="entry.item.translation" class="whitespace-pre-line text-slate-600">参考译文：{{ entry.item.translation }}</p></div>
        </details>
      </div>
    </template>

    <div v-if="confirmSubmit || confirmDiscard" role="dialog" aria-modal="true" aria-labelledby="mock-confirm-title" class="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4">
      <div class="w-full max-w-sm rounded-2xl bg-white p-5 space-y-3 shadow-lg">
        <h3 id="mock-confirm-title" class="font-black">{{ confirmSubmit ? '确认交卷' : '确认清除此考场记录' }}</h3>
        <p v-if="confirmSubmit">还有 {{ section ? section.questions.length - answeredCount : 0 }} 题未答。交卷后本节不能修改。</p><p v-else>这会删除本次考场记录，已保存的课程与其他学习记录不受影响。</p>
        <div class="flex gap-2"><button @click="confirmSubmit = false; confirmDiscard = false" class="min-h-11 flex-1 rounded-xl bg-slate-100 font-bold">取消</button><button @click="confirmSubmit ? submit() : discard()" class="min-h-11 flex-1 rounded-xl bg-rose-500 text-white font-bold">确认</button></div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { audio } from '@/utils/audio'
import { segmentPracticeAudio, playPracticeAudio } from '@/utils/advancedPracticeAudio'
import { orderStudyQuestion } from '@/utils/studyQuestionOrder'
import { MOCK_EXAM_BANK } from '@/data/mockExamBank'
import type { MockExamLevel } from '@/data/mockExamBlueprint'
import { MOCK_EXAM_SESSION_KEY, PROGRESS_RESET_EVENT } from '@/utils/storage'
import { answerMockExam, createMockExam, planMockExamSections, restoreMockExamState, startNextMockExamSection, submitMockExamSection, summarizeMockExam, tickMockExam, type MockExamState } from '@/utils/mockExam'

const props = withDefaults(defineProps<{ active?: boolean }>(), { active: true })
const emit = defineEmits<{ close: [] }>()
const levels: MockExamLevel[] = ['N5', 'N4', 'N3', 'N2', 'N1']
const level = ref<MockExamLevel>('N5')
const orderedBank = MOCK_EXAM_BANK.map(orderStudyQuestion)
function newExamSeed(previous?: number): number {
  let value: number
  try { value = crypto.getRandomValues(new Uint32Array(1))[0]! }
  catch { value = Math.floor(Math.random() * 0x100000000) }
  return value === previous ? (value + 1) >>> 0 : value
}
const selectionSeed = ref(newExamSeed())
const preview = computed(() => planMockExamSections(level.value, orderedBank, selectionSeed.value))
const exam = ref<MockExamState | null>(null)
const currentIndex = ref(0)
const flags = ref<Record<string, boolean>>({})
const confirmSubmit = ref(false)
const confirmDiscard = ref(false)
const damagedRecord = ref(false)
const storageProblem = ref('')
const audioProblem = ref('')
const playing = ref(false)
const observedNow = ref(Date.now())
let audioRun = 0
let interval: ReturnType<typeof setInterval> | undefined
let lastSaveAt = 0
let suppressSave = false
const section = computed(() => exam.value?.sections[exam.value.sectionIndex])
const question = computed(() => section.value?.questions[currentIndex.value])
const nextSection = computed(() => exam.value?.sections[exam.value.sectionIndex + 1])
const sectionIsListening = computed(() => section.value?.id === 'listening')
const answeredCount = computed(() => section.value ? Object.keys(section.value.answers).length : 0)
const isFlagged = computed(() => Boolean(question.value && flags.value[question.value.id]))
const summary = computed(() => exam.value ? summarizeMockExam(exam.value)?.sections ?? [] : [])
type ReviewStatus = 'correct' | 'wrong' | 'unanswered'
type ReviewFilter = 'all' | ReviewStatus
const reviewFilter = ref<ReviewFilter>('all')
const reviewFilters: { value: ReviewFilter; label: string }[] = [
  { value: 'all', label: '全部' }, { value: 'wrong', label: '答错' },
  { value: 'unanswered', label: '未答' }, { value: 'correct', label: '答对' },
]
// 先记录原始序号再筛选，避免题号在不同视图中变化。
const reviewSections = computed(() => {
  if (exam.value?.phase !== 'complete') return []
  return exam.value.sections.map(item => ({
    id: item.id,
    label: item.label,
    entries: item.questions.map((question, index) => {
      const answer = item.answers[question.id]
      const status: ReviewStatus = answer === undefined ? 'unanswered' : answer === question.correctIndex ? 'correct' : 'wrong'
      return { item: question, index, answer, status }
    }),
  }))
})
const reviewCounts = computed<Record<ReviewFilter, number>>(() => {
  const counts: Record<ReviewFilter, number> = { all: 0, wrong: 0, unanswered: 0, correct: 0 }
  for (const item of reviewSections.value) for (const entry of item.entries) {
    counts.all += 1
    counts[entry.status] += 1
  }
  return counts
})
const filteredReviewSections = computed(() => reviewSections.value
  .map(item => ({ ...item, entries: item.entries.filter(entry => reviewFilter.value === 'all' || entry.status === reviewFilter.value) }))
  .filter(item => item.entries.length > 0))
const remaining = computed(() => {
  if (!exam.value || exam.value.deadline === null) return '--:--'
  const seconds = Math.max(0, Math.ceil((exam.value.deadline - Math.max(observedNow.value, exam.value.lastObservedAt)) / 1000))
  const hours = Math.floor(seconds / 3600), minutes = Math.floor(seconds % 3600 / 60), secs = seconds % 60
  return hours ? `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}` : `${minutes}:${String(secs).padStart(2, '0')}`
})

function persist() {
  if (!exam.value || suppressSave || damagedRecord.value) return false
  try {
    localStorage.setItem(MOCK_EXAM_SESSION_KEY, JSON.stringify({ version: 1, state: exam.value, flags: flags.value, currentIndex: currentIndex.value }))
    storageProblem.value = ''
    lastSaveAt = Date.now()
    return true
  } catch {
    storageProblem.value = '本次考场记录未能保存。当前可继续作答，但关闭页面后可能丢失，请检查设备存储。'
    return false
  }
}
function stopAudio() {
  audioRun += 1
  if (playing.value) audio.stop()
  playing.value = false
}
function syncTime(forceSave = false) {
  observedNow.value = Date.now()
  if (!exam.value) return
  const oldPhase = exam.value.phase
  const next = tickMockExam(exam.value, observedNow.value)
  exam.value = next
  if (next.phase !== oldPhase) {
    confirmSubmit.value = false
    stopAudio()
    persist()
  } else if (forceSave || observedNow.value - lastSaveAt >= 15000) persist()
}
function begin() {
  if (damagedRecord.value) return
  const created = createMockExam(level.value, orderedBank, Date.now(), selectionSeed.value)
  if (!created) { storageProblem.value = '题目不完整，无法开始本次模拟。'; return }
  suppressSave = false
  reviewFilter.value = 'all'
  exam.value = created
  currentIndex.value = 0
  flags.value = {}
  observedNow.value = Date.now()
  persist()
}
function choose(option: number) {
  if (!exam.value || !question.value) return
  const beforePhase = exam.value.phase
  exam.value = answerMockExam(exam.value, question.value.id, option, Date.now())
  if (exam.value.phase !== beforePhase) { stopAudio(); confirmSubmit.value = false }
  persist()
}
function goTo(index: number) {
  syncTime()
  if (!exam.value || exam.value.phase !== 'running' || !section.value || index < 0 || index >= section.value.questions.length) return
  stopAudio()
  audioProblem.value = ''
  currentIndex.value = index
  persist()
}
function toggleFlag() {
  syncTime()
  if (exam.value?.phase !== 'running' || !question.value) return
  flags.value = { ...flags.value, [question.value.id]: !flags.value[question.value.id] }
  persist()
}
function submit() {
  confirmSubmit.value = false
  if (!exam.value) return
  stopAudio()
  exam.value = submitMockExamSection(exam.value, Date.now())
  persist()
}
function nextSectionStart() {
  if (!exam.value) return
  stopAudio()
  exam.value = startNextMockExamSection(exam.value, Date.now())
  observedNow.value = Date.now()
  currentIndex.value = 0
  audioProblem.value = ''
  persist()
}
function discard() {
  try {
    localStorage.removeItem(MOCK_EXAM_SESSION_KEY)
    stopAudio()
    exam.value = null
    reviewFilter.value = 'all'
    flags.value = {}
    currentIndex.value = 0
    damagedRecord.value = false
    selectionSeed.value = newExamSeed(selectionSeed.value)
    storageProblem.value = ''
    confirmDiscard.value = false
  } catch {
    storageProblem.value = '考场记录未能清除，请检查设备存储后重试。'
    confirmDiscard.value = false
  }
}
async function playAudio() {
  syncTime()
  if (!props.active || !exam.value || exam.value.phase !== 'running' || !question.value?.audioReading) return
  stopAudio()
  audioProblem.value = ''
  const run = audioRun
  const chunks = segmentPracticeAudio(question.value.audioReading)
  if (!chunks.length) { audioProblem.value = '此题没有可用的朗读文本。'; return }
  playing.value = true
  try {
    const done = await playPracticeAudio(chunks, text => audio.speak(text), () => props.active && run === audioRun && exam.value?.phase === 'running')
    if (!done && run === audioRun && props.active) audioProblem.value = '听力未能完整播放，请检查设备日语语音服务。'
  } catch {
    if (run === audioRun) audioProblem.value = '听力无法播放，请检查设备日语语音服务。'
  } finally { if (run === audioRun) playing.value = false }
}
function leave() { syncTime(true); stopAudio(); emit('close') }
function onVisibilityChange() { syncTime(true); if (document.visibilityState !== 'visible') stopAudio() }
function onProgressReset() {
  suppressSave = true
  stopAudio()
  reviewFilter.value = 'all'
  exam.value = null
  flags.value = {}
  damagedRecord.value = false
  confirmSubmit.value = false
  confirmDiscard.value = false
  storageProblem.value = ''
}
function restore() {
  let raw: string | null
  try {
    raw = localStorage.getItem(MOCK_EXAM_SESSION_KEY)
  } catch {
    storageProblem.value = '设备存储暂不可用，无法恢复先前考场记录；重新开始后也可能无法保存。'
    return
  }
  if (!raw) return
  try {
    const wrapper: unknown = JSON.parse(raw)
    if (!wrapper || typeof wrapper !== 'object' || Array.isArray(wrapper)) throw new Error('invalid')
    const saved = wrapper as { version?: unknown; state?: unknown; flags?: unknown; currentIndex?: unknown }
    if (saved.version !== 1) throw new Error('version')
    const restored = restoreMockExamState(saved.state, Date.now())
    if (!restored) throw new Error('invalid state')
    exam.value = restored
    level.value = restored.level
    const ids = new Set(restored.sections.flatMap(item => item.questions.map(q => q.id)))
    if (saved.flags && typeof saved.flags === 'object' && !Array.isArray(saved.flags)) flags.value = Object.fromEntries(Object.entries(saved.flags).filter(([id, value]) => ids.has(id) && value === true))
    const count = restored.sections[restored.sectionIndex]?.questions.length ?? 0
    currentIndex.value = typeof saved.currentIndex === 'number' && Number.isInteger(saved.currentIndex) && saved.currentIndex >= 0 && saved.currentIndex < count ? saved.currentIndex : 0
    observedNow.value = Date.now()
    persist()
  } catch {
    damagedRecord.value = true
    storageProblem.value = '已有考场记录无法读取或恢复。原记录未覆盖；如需重新开始，请先处理该记录。'
  }
}
onMounted(() => {
  restore()
  interval = setInterval(() => syncTime(), 1000)
  document.addEventListener('visibilitychange', onVisibilityChange)
  window.addEventListener('focus', onVisibilityChange)
  window.addEventListener(PROGRESS_RESET_EVENT, onProgressReset)
})
watch(() => props.active, active => { if (!active) { syncTime(true); stopAudio() } else syncTime() })
onUnmounted(() => {
  if (interval) clearInterval(interval)
  document.removeEventListener('visibilitychange', onVisibilityChange)
  window.removeEventListener('focus', onVisibilityChange)
  window.removeEventListener(PROGRESS_RESET_EVENT, onProgressReset)
  if (!suppressSave) syncTime(true)
  stopAudio()
})
</script>
