<template>
  <section class="rounded-2xl border border-indigo-100 bg-indigo-50 p-4 space-y-3" aria-label="单元加强训练" data-testid="n5-supplement">
    <div class="flex items-center justify-between gap-2">
      <div><h4 class="text-sm font-black text-indigo-900">单元加强训练</h4><p class="text-slate-600">补充讲解、听力、阅读和练习，与原单元成绩分别保存。</p></div>
      <button @click="toggle" :aria-expanded="open" class="min-h-10 shrink-0 rounded-xl bg-white px-3 py-2 font-bold text-indigo-700">{{ open ? '收起' : '展开' }}</button>
    </div>
    <p v-if="savedResult" class="text-slate-600">上次加强训练：{{ savedResult.correct }}/{{ savedResult.total }} 题答对；完成不代表已经掌握。</p>
    <template v-if="open && supplement && practice">
      <div class="rounded-xl bg-white p-3 space-y-3">
        <h5 class="font-black text-slate-800">补充知识点</h5>
        <div v-for="(step, index) in supplement.steps" :key="index" class="rounded-lg bg-slate-50 p-3"><p class="font-bold">{{ step.title }}</p><p class="mt-1 whitespace-pre-line">{{ step.explanation }}</p></div>
        <div v-for="(example, index) in supplement.examples" :key="index" class="flex items-center justify-between gap-2 rounded-lg border border-indigo-100 p-3">
          <p><strong class="font-japanese">{{ example.japanese }}</strong><br><span class="text-rose-600">{{ example.reading }}</span><br>{{ example.chinese }}</p>
          <button @click="playOne(example.reading)" :aria-label="`朗读补充例句 ${example.japanese}`" class="shrink-0 rounded-lg bg-rose-50 px-3 py-2 text-rose-600">🔊</button>
        </div>
      </div>
      <div class="rounded-xl bg-white p-3 space-y-2">
        <h5 class="font-black text-slate-800">听力 · {{ practice.listening.title }}</h5>
        <p>{{ practice.listening.situation }}</p>
        <p class="font-bold text-indigo-800">先听并思考：</p>
        <p v-for="question in practice.listening.questions" :key="question.id" class="text-indigo-900">{{ question.prompt }}</p>
        <p class="text-slate-500">设备合成语音；没有可用音色时可展开原文阅读。</p>
        <div class="flex flex-wrap gap-2">
          <button @click="playListening" :disabled="playing" class="min-h-10 rounded-lg bg-indigo-600 px-3 py-2 font-bold text-white disabled:opacity-50">{{ playing ? '正在朗读' : '播放补充对话' }}</button>
          <button @click="stopPlayback" :disabled="!playing" class="min-h-10 rounded-lg bg-slate-100 px-3 py-2 font-bold disabled:opacity-50">停止</button>
          <button @click="showTranscript = !showTranscript" :aria-expanded="showTranscript" class="min-h-10 rounded-lg border border-slate-200 px-3 py-2 font-bold">{{ showTranscript ? '隐藏对话' : '展开对话' }}</button>
        </div>
        <div v-if="showTranscript" class="space-y-2">
          <div v-for="(line, index) in practice.listening.lines" :key="index" class="flex justify-between gap-2 rounded-lg bg-slate-50 p-3">
            <p><strong>{{ line.speaker }}：</strong>{{ line.japanese }}<br><span class="text-rose-600">{{ line.reading }}</span><br>{{ line.chinese }}</p>
            <button @click="playOne(line.reading)" :aria-label="`朗读补充对话第 ${index + 1} 句`" class="shrink-0 text-rose-600">🔊</button>
          </div>
        </div>
      </div>
      <div class="rounded-xl bg-white p-3 space-y-2">
        <h5 class="font-black text-slate-800">阅读 · {{ practice.reading.title }}</h5>
        <p class="font-japanese text-sm font-semibold whitespace-pre-line">{{ practice.reading.text }}</p>
        <details><summary class="cursor-pointer py-2 font-bold text-indigo-700">展开阅读假名与译文</summary><p class="font-japanese whitespace-pre-line">{{ practice.reading.reading }}</p><p class="mt-2 whitespace-pre-line">{{ practice.reading.chinese }}</p></details>
        <button @click="playOne(practice.reading.reading)" class="min-h-10 rounded-lg bg-rose-50 px-3 py-2 font-bold text-rose-600">🔊 朗读补充短文</button>
      </div>
      <div class="rounded-xl bg-white p-3 space-y-4" aria-label="加强训练题">
        <h5 class="font-black text-slate-800">加强训练 · {{ answeredCount }}/{{ questions.length }} 题</h5>
        <p>先独立作答，再查看解析；完成全部加强题后保存本轮成绩。</p>
        <div v-for="(question, index) in questions" :key="question.id" class="rounded-xl border border-slate-200 p-3 space-y-2">
          <p class="font-bold">{{ index + 1 }}. {{ question.label }}：{{ question.prompt }}</p>
          <div class="grid gap-2">
            <button v-for="(option, optionIndex) in question.options" :key="optionIndex" @click="choose(question.id, optionIndex)" :disabled="answers[question.id] !== undefined" :class="['min-h-10 rounded-lg border px-3 py-2 text-left break-words', optionStyle(question, optionIndex)]">{{ option }}<span v-if="answers[question.id] !== undefined && optionIndex === question.correctIndex"> ✓ 正确答案</span><span v-else-if="answers[question.id] === optionIndex"> ✗ 你的选择</span></button>
          </div>
          <p v-if="answers[question.id] !== undefined" role="status" class="rounded-lg bg-slate-50 p-2"><strong>{{ answers[question.id] === question.correctIndex ? '答对了。' : '再看一下。' }}</strong> {{ question.explanation }}</p>
        </div>
        <div v-if="completed" role="status" class="rounded-xl bg-emerald-50 p-3 space-y-2">
          <p class="font-bold">加强训练答对 {{ correctCount }}/{{ questions.length }} 题</p>
          <p v-if="saveFailed" class="text-red-700">结果未能保存在本机，请检查设备存储并重试。</p>
          <p v-else class="text-emerald-800">本轮加强训练结果已保存，不代表已完全掌握。</p>
          <button v-if="saveFailed" @click="persistResult" class="min-h-10 rounded-lg bg-white px-3 py-2 font-bold text-rose-600">重试保存</button>
          <button @click="restart" class="min-h-10 rounded-lg border border-emerald-200 bg-white px-3 py-2 font-bold text-emerald-800">重新做加强训练</button>
        </div>
      </div>
    </template>
    <p v-else-if="open" class="rounded-lg bg-amber-50 p-3">本单元加强内容暂不完整，请稍后再试。</p>
  </section>
</template>

<script setup lang="ts">
import { computed, onDeactivated, onUnmounted, ref, watch } from 'vue'
import { N5_COURSE_SUPPLEMENTS } from '@/data/n5CourseSupplement'
import { N5_COURSE_PRACTICE_EXTRA } from '@/data/n5CoursePracticeExtra'
import { audio } from '@/utils/audio'
import { expectedSupplementCount, getN5SupplementResults, saveN5SupplementResult } from '@/utils/n5SupplementProgress'

interface Question { id: string; label: string; prompt: string; options: string[]; correctIndex: number; explanation: string }
const props = defineProps<{ unitId: string; active: boolean }>()
const supplement = computed(() => N5_COURSE_SUPPLEMENTS.find(item => item.unitId === props.unitId))
const practice = computed(() => N5_COURSE_PRACTICE_EXTRA.find(item => item.unitId === props.unitId))
const results = ref(getN5SupplementResults())
const savedResult = computed(() => results.value[props.unitId])
const open = ref(false)
const showTranscript = ref(false)
const playing = ref(false)
const answers = ref<Record<string, number>>({})
const saveFailed = ref(false)
let generation = 0
const questions = computed<Question[]>(() => {
  if (!supplement.value || !practice.value) return []
  return [
    ...practice.value.listening.questions.map(q => ({ ...q, label: '听力' })),
    ...practice.value.reading.questions.map(q => ({ ...q, label: '阅读' })),
    ...supplement.value.questions.map(q => ({ ...q, label: '句型' })),
  ]
})
const answeredCount = computed(() => questions.value.filter(q => answers.value[q.id] !== undefined).length)
const correctCount = computed(() => questions.value.filter(q => answers.value[q.id] === q.correctIndex).length)
const completed = computed(() => questions.value.length > 0 && questions.value.length === expectedSupplementCount(props.unitId) && answeredCount.value === questions.value.length)
function persistResult() {
  if (!completed.value) return
  const saved = saveN5SupplementResult({ unitId: props.unitId, total: questions.value.length, correct: correctCount.value, completedAt: Date.now() })
  saveFailed.value = !saved
  if (saved) results.value = getN5SupplementResults()
}
function choose(id: string, option: number) {
  const question = questions.value.find(q => q.id === id)
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
function playOne(text: string) { stopPlayback(); if (props.active) void audio.speak(text) }
async function playListening() {
  if (!practice.value || !props.active) return
  stopPlayback()
  const run = generation
  const lines = [...practice.value.listening.lines]
  playing.value = true
  for (const line of lines) if (run !== generation || !await audio.speak(line.reading)) break
  if (run === generation) playing.value = false
}
function restart() { answers.value = {}; saveFailed.value = false }
function toggle() { open.value = !open.value; if (!open.value) stopPlayback() }
watch(() => props.unitId, () => { stopPlayback(); restart(); open.value = false; showTranscript.value = false; results.value = getN5SupplementResults() })
watch(() => props.active, active => { if (!active) stopPlayback() })
onDeactivated(stopPlayback)
onUnmounted(stopPlayback)
</script>
