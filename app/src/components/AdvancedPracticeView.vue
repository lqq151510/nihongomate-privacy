<template>
  <div class="p-4 space-y-4 text-xs leading-relaxed" data-testid="advanced-practice">
    <div class="rounded-2xl border border-indigo-100 bg-indigo-50 p-4 space-y-2">
      <h3 class="text-base font-black text-indigo-900">{{ level }} 进阶阅读与听力</h3>
      <p class="text-indigo-900">选择材料后独立作答；内容为原创练习，参考考试题型，不是官方真题。</p>
      <p class="text-slate-600">本机有 {{ levelResultsCount }}/{{ levelPassages.length }} 篇完整练习记录；完成练习不代表已经掌握。内容尚未经教师逐条审校。</p>
    </div>
    <div class="grid grid-cols-2 gap-2" role="group" aria-label="进阶训练类型">
      <button v-for="item in kinds" :key="item.id" @click="kind = item.id" :aria-pressed="kind === item.id" :class="['min-h-11 rounded-xl border px-3 py-2 font-bold', kind === item.id ? 'border-indigo-300 bg-indigo-600 text-white' : 'border-slate-200 bg-white text-slate-600']">{{ item.label }}</button>
    </div>
    <label for="advanced-passage-select" class="block font-bold text-slate-700">选择{{ kind === 'reading' ? '阅读' : '听力' }}材料</label>
    <select id="advanced-passage-select" v-model="selectedId" class="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm">
      <option v-for="item in passages" :key="item.id" :value="item.id">{{ item.title }}{{ results[item.id] ? ' · 有练习记录' : '' }}</option>
    </select>
    <p class="text-slate-500">切换材料、类型或等级会清空本次未完成的作答，已经保存的练习结果保留。</p>
    <template v-if="passage">
      <div class="rounded-2xl bg-white p-4 border border-slate-100 space-y-2">
        <h4 class="text-base font-black text-slate-800">{{ passage.title }}</h4>
        <p class="text-slate-600">{{ passage.context }}</p>
        <p v-if="results[passage.id]" class="text-slate-500">上次练习（当时的题数）：{{ results[passage.id]!.correct }}/{{ results[passage.id]!.total }} 题答对。</p>
      </div>
      <section class="rounded-2xl bg-white p-4 border border-slate-100 space-y-3" :aria-label="kind === 'reading' ? '阅读材料' : '听力材料'">
        <template v-if="kind === 'listening'">
          <p class="font-bold text-indigo-800">先听并思考：</p>
          <p v-for="question in questions" :key="question.id" class="font-bold text-slate-700">{{ question.prompt }}</p>
          <p class="text-slate-500">由设备合成语音逐句朗读；音色与发音因设备而异。没有可用语音时，可以展开文字学习。</p>
        </template>
        <template v-else>
          <p class="font-japanese text-sm text-slate-800 whitespace-pre-line leading-loose">{{ passage.text }}</p>
        </template>
        <div class="flex flex-wrap gap-2">
          <button @click="playPassage" :disabled="playing" class="min-h-10 rounded-xl bg-indigo-600 px-3 py-2 text-white font-bold disabled:opacity-50">{{ playing ? '正在朗读' : kind === 'listening' ? '播放听力' : '朗读文章' }}</button>
          <button @click="stopPlayback" :disabled="!playing" class="min-h-10 rounded-xl bg-slate-100 px-3 py-2 font-bold disabled:opacity-50">停止</button>
          <button @click="showReference = !showReference" :aria-expanded="showReference" class="min-h-10 rounded-xl border border-slate-200 px-3 py-2 font-bold">{{ showReference ? '收起原文与译文' : kind === 'listening' ? '展开原文与译文' : '展开假名与译文' }}</button>
        </div>
        <div v-if="showReference" class="rounded-xl bg-slate-50 p-3 space-y-3">
          <p v-if="kind === 'listening'" class="font-japanese text-sm text-slate-800 whitespace-pre-line">{{ passage.text }}</p>
          <p class="font-japanese text-rose-700 whitespace-pre-line">{{ passage.reading }}</p>
          <p class="text-slate-700 whitespace-pre-line">{{ passage.chinese }}</p>
        </div>
      </section>
      <section class="rounded-2xl bg-white p-4 border border-slate-100 space-y-4" aria-label="进阶理解练习">
        <h4 class="font-black text-slate-800">理解练习 · {{ answeredCount }}/{{ questions.length }} 题</h4>
        <p class="text-slate-600">可以先修改选择；完成整篇所有题后提交，再查看答案、相关原文和解析。</p>
        <div v-for="(question, index) in questions" :key="question.id" class="rounded-xl border border-slate-200 p-3 space-y-2">
          <p class="font-bold text-slate-800">{{ index + 1 }}. {{ question.prompt }}</p>
          <div class="grid gap-2">
            <button v-for="(option, optionIndex) in question.options" :key="optionIndex" @click="choose(question.id, optionIndex)" :disabled="session.submitted" :aria-pressed="session.answers[question.id] === optionIndex" :class="['min-h-10 rounded-lg border px-3 py-2 text-left break-words', optionStyle(question, optionIndex)]">
              {{ option }}<span v-if="session.submitted && optionIndex === question.correctIndex"> ✓ 正确答案</span><span v-else-if="session.submitted && session.answers[question.id] === optionIndex"> ✗ 你的选择</span><span v-else-if="!session.submitted && session.answers[question.id] === optionIndex"> · 已选</span>
            </button>
          </div>
          <div v-if="session.submitted" class="rounded-lg bg-slate-50 p-3 space-y-1 text-slate-700" role="status">
            <p><strong>{{ session.answers[question.id] === question.correctIndex ? '答对了。' : '再看一下。' }}</strong> {{ question.explanation }}</p>
            <p><strong>相关原文片段（请结合上下文）：</strong><span class="font-japanese">{{ question.evidence }}</span></p>
          </div>
        </div>
        <button v-if="!session.submitted" @click="submit" :disabled="!canSubmit" class="min-h-11 w-full rounded-xl bg-indigo-600 px-3 py-2 font-bold text-white disabled:cursor-not-allowed disabled:opacity-50">提交并查看解析</button>
        <div v-if="session.submitted" class="rounded-xl bg-emerald-50 p-3 space-y-2" role="status">
          <p class="font-bold text-emerald-900">本轮答对 {{ correctCount }}/{{ questions.length }} 题</p>
          <p v-if="saveFailed" class="text-red-700">结果未能保存在本机，请检查设备存储后重试。</p>
          <p v-else class="text-emerald-800">本轮练习结果已保存，不代表已经完全掌握。</p>
          <button v-if="saveFailed" @click="persistResult" class="min-h-10 rounded-lg bg-white px-3 py-2 font-bold text-rose-600">重试保存</button>
          <button @click="restart" class="min-h-10 rounded-lg border border-emerald-200 bg-white px-3 py-2 font-bold text-emerald-800">重新练习这篇</button>
        </div>
      </section>
    </template>
    <p v-else class="rounded-xl bg-amber-50 p-3 text-amber-800">此类型暂无可用材料，请切换其他类型。</p>
  </div>
</template>

<script setup lang="ts">
import { computed, onDeactivated, onUnmounted, ref, watch } from 'vue'
import type { AdvancedQuestion } from '@/data/advancedPracticeTypes'
import { audio } from '@/utils/audio'
import { orderStudyQuestion } from '@/utils/studyQuestionOrder'
import { playPracticeAudio, segmentPracticeAudio } from '@/utils/advancedPracticeAudio'
import { ADVANCED_PRACTICE, getAdvancedPracticeResults, saveAdvancedPracticeResult } from '@/utils/advancedPracticeProgress'
import { canSubmitAdvancedPractice, chooseAdvancedAnswer, createAdvancedPracticeSession, submitAdvancedPractice } from '@/utils/advancedPracticeSession'

const props = defineProps<{ level: 'N2' | 'N1'; active: boolean }>()
const kinds = [{ id: 'reading' as const, label: '📖 长篇阅读' }, { id: 'listening' as const, label: '🎧 情景听力' }]
const kind = ref<'reading' | 'listening'>('reading')
const levelPassages = computed(() => ADVANCED_PRACTICE.filter(item => item.level === props.level))
const passages = computed(() => levelPassages.value.filter(item => item.kind === kind.value))
const selectedId = ref(passages.value[0]?.id ?? '')
const passage = computed(() => passages.value.find(item => item.id === selectedId.value))
const questions = computed<AdvancedQuestion[]>(() => (passage.value?.questions ?? []).map(orderStudyQuestion))
const results = ref(getAdvancedPracticeResults())
const levelResultsCount = computed(() => levelPassages.value.filter(item => results.value[item.id]).length)
const session = ref(createAdvancedPracticeSession())
const showReference = ref(false)
const playing = ref(false)
const saveFailed = ref(false)
let generation = 0
const answeredCount = computed(() => questions.value.filter(q => session.value.answers[q.id] !== undefined).length)
const correctCount = computed(() => questions.value.filter(q => session.value.answers[q.id] === q.correctIndex).length)
const canSubmit = computed(() => canSubmitAdvancedPractice(session.value, questions.value))
function persistResult() {
  if (!session.value.submitted || !passage.value) return
  const saved = saveAdvancedPracticeResult({ passageId: passage.value.id, total: questions.value.length, correct: correctCount.value, completedAt: Date.now() })
  saveFailed.value = !saved
  if (saved) results.value = getAdvancedPracticeResults()
}
function choose(id: string, option: number) {
  session.value = chooseAdvancedAnswer(session.value, questions.value, id, option)
}
function submit() {
  const next = submitAdvancedPractice(session.value, questions.value)
  if (next === session.value) return
  session.value = next
  persistResult()
}
function optionStyle(question: AdvancedQuestion, index: number): string {
  const answer = session.value.answers[question.id]
  if (answer === undefined) return 'border-slate-200 bg-white text-slate-700'
  if (!session.value.submitted) return answer === index ? 'border-indigo-500 bg-indigo-50 text-indigo-900' : 'border-slate-200 bg-white text-slate-700'
  if (index === question.correctIndex) return 'border-emerald-400 bg-emerald-50 text-emerald-800'
  if (answer === index) return 'border-amber-400 bg-amber-50 text-amber-900'
  return 'border-slate-100 bg-slate-50 text-slate-500'
}
function stopPlayback() {
  generation += 1
  if (playing.value) audio.stop()
  playing.value = false
}
async function playPassage() {
  if (!passage.value || !props.active) return
  stopPlayback()
  const run = generation
  const chunks = segmentPracticeAudio(passage.value.reading)
  if (!chunks.length) return
  playing.value = true
  try { await playPracticeAudio(chunks, text => audio.speak(text), () => props.active && run === generation) }
  finally { if (run === generation) playing.value = false }
}
function restart() { session.value = createAdvancedPracticeSession(); saveFailed.value = false }
watch([() => props.level, kind], () => { stopPlayback(); selectedId.value = passages.value[0]?.id ?? ''; results.value = getAdvancedPracticeResults() })
watch(selectedId, () => { stopPlayback(); restart(); showReference.value = false })
watch(() => props.active, active => { if (!active) stopPlayback() })
onDeactivated(stopPlayback)
onUnmounted(stopPlayback)
</script>
