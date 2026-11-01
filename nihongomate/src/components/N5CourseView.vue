<template>
  <div ref="courseRoot" class="course-content p-4 space-y-4 text-sm leading-relaxed" data-testid="n5-course">
    <section class="course-overview rounded-2xl bg-white border border-slate-100 p-4 space-y-2" aria-label="课程概览">
      <div class="flex items-center justify-between gap-3">
        <div>
          <h3 class="font-black text-lg text-slate-800">N5 系统课程</h3>
        </div>
        <p class="shrink-0 text-sm text-slate-600"><strong class="text-rose-700">{{ completedUnitCount }}</strong> / {{ N5_COURSE.length }} 单元</p>
      </div>
      <progress class="course-progress block w-full h-2 overflow-hidden rounded-full accent-rose-600" :value="completedUnitCount" :max="N5_COURSE.length" aria-label="已完成单元练习进度" />
      <p class="text-xs text-slate-500">完成记录表示做完单元练习，不代表已经掌握。</p>
      <details class="text-sm text-slate-600">
        <summary class="min-h-11 cursor-pointer py-1 font-semibold text-slate-700">课程说明与学习建议</summary>
        <div class="space-y-2 pb-1">
          <p>全部课程免费，可自由选择单元，逐步学习词汇、句型、听力、阅读和练习。</p>
          <p>每课末尾有“单元加强训练”，成绩与原单元分别保存。</p>
          <p>内容为学习参考，部分内容尚未经过日语教师逐条审校；不代表 JLPT 官方完整考纲。</p>
        </div>
      </details>
    </section>
    <div class="space-y-2">
      <label class="block font-bold text-slate-700" for="n5-unit-select">选择课程单元</label>
      <select id="n5-unit-select" v-model="selectedId" class="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm">
      <option v-for="item in N5_COURSE" :key="item.id" :value="item.id">{{ item.title }}{{ results[item.id] ? ' · 已完成练习' : '' }}</option>
      </select>
      <p class="text-xs text-slate-500">切换单元会清空未完成作答和草稿；已保存的结果保留。</p>
    </div>
    <template v-if="unit && listening && reading">
      <nav class="course-section-nav grid grid-cols-3 sm:grid-cols-6 gap-2" aria-label="本单元内容">
        <button v-for="section in courseSections" :key="section.id" type="button" @click="goToSection(section.id)" :aria-controls="'n5-course-' + section.id" class="min-h-11 rounded-xl border border-rose-100 bg-white px-2 py-2 font-semibold text-rose-700 hover:bg-rose-50 focus-visible:bg-rose-50">
          {{ section.label }}
        </button>
      </nav>
      <div class="rounded-2xl bg-white p-4 border border-slate-100 space-y-2">
        <h4 class="text-base font-black text-slate-800">{{ unit.title }}</h4>
        <p class="font-bold text-emerald-700">学习目标：{{ unit.goal }}</p>
        <p v-if="results[unit.id]" class="text-slate-500">上次完整练习：{{ results[unit.id]!.correct }}/{{ results[unit.id]!.total }} 题答对。</p>
      </div>
      <section id="n5-course-vocabulary" data-course-section="vocabulary" tabindex="-1" class="course-section rounded-2xl bg-white p-4 border border-slate-100 space-y-3" aria-label="重点词汇">
        <h4 class="font-black text-slate-800">① 重点词汇</h4>
        <div v-for="word in unit.vocabulary" :key="word.japanese + word.reading" class="rounded-xl bg-slate-50 p-3 flex items-center justify-between gap-2">
          <p><strong class="font-japanese text-sm">{{ word.japanese }}</strong> <span class="text-rose-600">{{ word.reading }}</span><br><span class="text-slate-600">{{ word.chinese }}</span></p>
          <button @click="playOne(word.reading)" :aria-label="`朗读词语 ${word.japanese}`" class="shrink-0 min-h-11 min-w-11 rounded-xl bg-rose-50 px-3 py-2 text-rose-600">🔊</button>
        </div>
      </section>
      <section id="n5-course-patterns" data-course-section="patterns" tabindex="-1" class="course-section rounded-2xl bg-white p-4 border border-slate-100 space-y-3" aria-label="句型与例句">
        <h4 class="font-black text-slate-800">② 讲解与例句</h4>
        <div v-for="(step, index) in unit.steps" :key="index" class="rounded-xl bg-slate-50 p-3 text-slate-700">
          <p class="font-bold">{{ index + 1 }}. {{ step.title }}</p><p class="mt-1 whitespace-pre-line">{{ step.explanation }}</p>
        </div>
        <div v-for="(example, index) in unit.examples" :key="index" class="rounded-xl border border-rose-100 p-3 flex items-center justify-between gap-2">
          <p><strong class="font-japanese text-sm">{{ example.japanese }}</strong><br><span class="text-rose-600">{{ example.reading }}</span><br>{{ example.chinese }}</p>
          <button @click="playOne(example.reading)" :aria-label="`朗读例句 ${example.japanese}`" class="shrink-0 min-h-11 min-w-11 rounded-xl bg-rose-50 px-3 py-2 text-rose-600">🔊</button>
        </div>
      </section>
      <section id="n5-course-listening" data-course-section="listening" tabindex="-1" class="course-section rounded-2xl bg-white p-4 border border-slate-100 space-y-3" aria-label="听力练习">
        <h4 class="font-black text-slate-800">③ 听力 · {{ listening.title }}</h4>
        <p class="text-slate-600">{{ listening.situation }}</p>
        <p class="font-bold text-emerald-800">先听并思考：{{ listening.question.prompt }}</p>
        <p class="text-slate-500">由设备语音合成朗读，音色和发音因设备而异。没有可用语音时，可直接展开文字学习。</p>
        <div class="flex flex-wrap gap-2">
          <button @click="playListening" :disabled="playing" class="min-h-11 rounded-xl bg-emerald-600 px-3 py-2 text-white font-bold disabled:opacity-50">{{ playing ? '正在朗读' : '播放对话' }}</button>
          <button @click="stopPlayback" :disabled="!playing" class="min-h-11 rounded-xl bg-slate-100 px-3 py-2 font-bold disabled:opacity-50">停止</button>
          <button @click="showTranscript = !showTranscript" :aria-expanded="showTranscript" class="min-h-11 rounded-xl border border-slate-200 px-3 py-2 font-bold">{{ showTranscript ? '隐藏原文' : '展开原文' }}</button>
        </div>
        <div v-if="showTranscript" class="space-y-2">
          <div v-for="(line, index) in listening.lines" :key="index" class="rounded-xl bg-slate-50 p-3 flex gap-2 justify-between">
            <p><strong>{{ line.speaker }}：</strong><span class="font-japanese">{{ line.japanese }}</span><br><span class="text-rose-600">{{ line.reading }}</span><br>{{ line.chinese }}</p>
            <button @click="playOne(line.reading)" :aria-label="`朗读第 ${index + 1} 句`" class="shrink-0 min-h-11 min-w-11 rounded-xl text-rose-600">🔊</button>
          </div>
        </div>
      </section>
      <section id="n5-course-reading" data-course-section="reading" tabindex="-1" class="course-section rounded-2xl bg-white p-4 border border-slate-100 space-y-2" aria-label="阅读练习">
        <h4 class="font-black text-slate-800">④ 阅读 · {{ reading.title }}</h4>
        <p class="font-japanese text-sm font-semibold text-slate-800 whitespace-pre-line">{{ reading.text }}</p>
        <details class="text-slate-600"><summary class="min-h-11 cursor-pointer py-3 text-emerald-700 font-bold">展开假名与译文</summary><p class="font-japanese whitespace-pre-line">{{ reading.reading }}</p><p class="mt-2 whitespace-pre-line">{{ reading.chinese }}</p></details>
        <button @click="playOne(reading.reading)" class="min-h-11 rounded-xl bg-rose-50 px-3 py-2 font-bold text-rose-600">🔊 朗读短文</button>
      </section>
      <section id="n5-course-practice" data-course-section="practice" tabindex="-1" class="course-section rounded-2xl bg-white p-4 border border-slate-100 space-y-4" aria-label="单元练习">
        <h4 class="font-black text-slate-800">⑤ 单元练习 · {{ answeredCount }}/{{ questions.length }} 题</h4>
        <p class="text-slate-600">包含听力、阅读和句型练习。先独立作答，再看解析；答完本单元所有题后保存本轮结果。</p>
        <div v-for="(question, index) in questions" :key="question.id" class="rounded-xl border border-slate-200 p-3 space-y-2">
          <p class="font-bold text-slate-800">{{ index + 1 }}. {{ question.label }}：{{ question.prompt }}</p>
          <div class="grid gap-2">
            <button v-for="(option, optionIndex) in question.options" :key="optionIndex" @click="choose(question.id, optionIndex)" :disabled="answers[question.id] !== undefined" :class="['min-h-11 rounded-lg border px-3 py-2 text-left break-words', optionStyle(question, optionIndex)]">
              {{ option }}<span v-if="answers[question.id] !== undefined && optionIndex === question.correctIndex"> ✓ 正确答案</span><span v-else-if="answers[question.id] === optionIndex"> ✗ 你的选择</span>
            </button>
          </div>
          <p v-if="answers[question.id] !== undefined" class="rounded-lg bg-slate-50 p-2 text-slate-700" role="status"><strong>{{ answers[question.id] === question.correctIndex ? '答对了。' : '再看一下。' }}</strong> {{ question.explanation }}</p>
        </div>
        <div v-if="completed" class="rounded-xl bg-emerald-50 p-3 space-y-2" role="status">
          <p class="font-bold text-emerald-900">本轮答对 {{ correctCount }}/{{ questions.length }} 题</p>
          <p v-if="saveFailed" class="text-red-700">本轮结果未能保存到本机，检查设备存储后可重试。</p>
          <p v-else class="text-emerald-800">本轮练习结果已保存，结果不代表已完全掌握。</p>
          <button v-if="saveFailed" @click="persistResult" class="min-h-11 rounded-lg bg-white px-3 py-2 text-rose-600 font-bold">重试保存</button>
          <button @click="restart" class="min-h-11 rounded-lg border border-emerald-200 bg-white px-3 py-2 text-emerald-800 font-bold">重新练习本单元</button>
        </div>
      </section>
      <section id="n5-course-expression" data-course-section="expression" tabindex="-1" class="course-section rounded-2xl bg-white p-4 border border-slate-100 space-y-2" aria-label="自己表达">
        <h4 class="font-black text-slate-800">⑥ 自己说一说</h4>
        <p>{{ unit.output.prompt }}</p>
        <textarea v-model="draft" rows="2" maxlength="300" aria-label="自己写一句" placeholder="先写下你的句子，再展开参考自查" class="w-full rounded-xl border border-slate-200 p-3 text-sm font-japanese" />
        <p class="text-slate-500">草稿只在当前单元页面保留，不自动打分。</p>
        <details><summary class="min-h-11 cursor-pointer py-3 text-emerald-700 font-bold">展开参考表达</summary><p class="font-japanese font-bold">{{ unit.output.reference }}</p><p>{{ unit.output.reading }}</p><p>{{ unit.output.chinese }}</p></details>
      </section>
      <N5Supplement :unit-id="selectedId" :active="active" />
    </template>
    <p v-else class="rounded-xl bg-amber-50 p-3 text-amber-800">此单元数据暂不完整，请切换其他单元。</p>
  </div>
</template>

<script setup lang="ts">
import { computed, onDeactivated, onUnmounted, ref, watch } from 'vue'
import { N5_COURSE } from '@/data/n5Course'
import { N5_COURSE_LISTENING } from '@/data/n5CourseListening'
import { N5_COURSE_READINGS } from '@/data/n5CourseReading'
import { audio } from '@/utils/audio'
import { expectedQuestionCount, getN5CourseResults, saveN5CourseResult } from '@/utils/n5CourseProgress'
import N5Supplement from '@/components/N5Supplement.vue'

interface Question { id: string; label: string; prompt: string; options: string[]; correctIndex: number; explanation: string }
const props = withDefaults(defineProps<{ active?: boolean }>(), { active: true })
const selectedId = ref(N5_COURSE[0]?.id ?? '')
const unit = computed(() => N5_COURSE.find(item => item.id === selectedId.value))
const listening = computed(() => N5_COURSE_LISTENING.find(item => item.unitId === selectedId.value))
const reading = computed(() => N5_COURSE_READINGS.find(item => item.unitId === selectedId.value))
const results = ref(getN5CourseResults())
const completedUnitCount = computed(() => N5_COURSE.filter(item => results.value[item.id]).length)
const courseRoot = ref<HTMLElement | null>(null)
const courseSections = [
  { id: 'vocabulary', label: '词汇' },
  { id: 'patterns', label: '句型' },
  { id: 'listening', label: '听力' },
  { id: 'reading', label: '阅读' },
  { id: 'practice', label: '练习' },
  { id: 'expression', label: '表达' },
] as const
function goToSection(id: string) {
  const section = courseRoot.value?.querySelector<HTMLElement>(`[data-course-section="${id}"]`)
  if (!section) return
  const toolbar = courseRoot.value?.parentElement?.querySelector<HTMLElement>(':scope > .sticky')
  const toolbarHeight = toolbar && window.getComputedStyle(toolbar).position === 'sticky' ? toolbar.getBoundingClientRect().height : 0
  section.style.scrollMarginTop = `${toolbarHeight + 16}px`
  section.scrollIntoView({ block: 'start', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })
  section.focus({ preventScroll: true })
}
const answers = ref<Record<string, number>>({})
const showTranscript = ref(false)
const playing = ref(false)
const draft = ref('')
const saveFailed = ref(false)
let generation = 0
const questions = computed<Question[]>(() => {
  if (!unit.value || !listening.value || !reading.value) return []
  return [
    { ...listening.value.question, id: `${unit.value.id}:listening`, label: '听力' },
    ...reading.value.questions.map(item => ({ ...item, label: '阅读' })),
    ...unit.value.questions.map(item => ({ ...item, label: '句型' })),
  ]
})
const answeredCount = computed(() => questions.value.filter(question => answers.value[question.id] !== undefined).length)
const correctCount = computed(() => questions.value.filter(question => answers.value[question.id] === question.correctIndex).length)
const completed = computed(() => questions.value.length > 0 && questions.value.length === expectedQuestionCount(selectedId.value) && answeredCount.value === questions.value.length)
function persistResult() {
  if (!completed.value) return
  const saved = saveN5CourseResult({ unitId: selectedId.value, total: questions.value.length, correct: correctCount.value, completedAt: Date.now() })
  saveFailed.value = !saved
  if (saved) results.value = getN5CourseResults()
}
function choose(id: string, option: number) {
  const question = questions.value.find(item => item.id === id)
  if (!question || answers.value[id] !== undefined || !Number.isInteger(option) || option < 0 || option >= question.options.length) return
  answers.value = { ...answers.value, [id]: option }
  if (completed.value) persistResult()
}
function optionStyle(question: Question, index: number): string {
  const answer = answers.value[question.id]
  if (answer === undefined) return 'border-slate-200 bg-white text-slate-700'
  if (index === question.correctIndex) return 'border-emerald-400 bg-emerald-50 text-emerald-800'
  if (answer === index) return 'border-amber-400 bg-amber-50 text-amber-900'
  return 'border-slate-100 bg-slate-50 text-slate-500'
}
function stopPlayback() { generation += 1; playing.value = false; audio.stop() }
function playOne(text: string) { stopPlayback(); void audio.speak(text) }
async function playListening() {
  if (!listening.value || !props.active) return
  stopPlayback()
  const run = generation
  const lines = [...listening.value.lines]
  playing.value = true
  for (const line of lines) {
    if (run !== generation || !await audio.speak(line.reading)) break
  }
  if (run === generation) playing.value = false
}
function restart() { answers.value = {}; saveFailed.value = false }
watch(selectedId, () => { stopPlayback(); restart(); showTranscript.value = false; draft.value = '' })
watch(() => props.active, active => { if (!active) stopPlayback() })
onDeactivated(stopPlayback)
onUnmounted(stopPlayback)
</script>
