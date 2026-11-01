<template>
  <section :data-testid="`grammar-lesson-${lesson.grammarId}`" :aria-label="`随堂微课：${lesson.goal}`" class="min-w-0 rounded-xl border border-emerald-100 bg-white p-3 space-y-3 text-xs break-words">
    <div class="space-y-1">
      <p class="text-[10px] font-bold text-emerald-700">学会怎么用 · 随堂微课</p>
      <p class="font-semibold leading-relaxed text-slate-800">{{ lesson.goal }}</p>
      <p v-if="savedResult && !state.round" class="text-[10px] leading-relaxed text-slate-500">最近一次完整练习：独立答对 {{ savedResult.independentCorrect }}/{{ savedResult.total }}，提示后答对 {{ savedResult.hintedCorrect }} 题，答错 {{ savedResult.wrongCount }} 题。</p>
    </div>
    <button @click="update({ expanded: !state.expanded })" :aria-expanded="state.expanded" :aria-controls="`${lesson.grammarId}-teaching`" class="min-h-10 rounded-lg bg-emerald-50 px-3 py-2 font-bold text-emerald-700">
      {{ state.expanded ? '收起微课' : '展开讲解与练习' }}
    </button>

    <div v-if="state.expanded" :id="`${lesson.grammarId}-teaching`" class="space-y-4">
      <ol class="space-y-2">
        <li v-for="(step, index) in lesson.steps" :key="index" class="rounded-lg bg-slate-50 p-2.5 leading-relaxed">
          <p class="font-bold text-slate-700">{{ index + 1 }}. {{ step.title }}</p>
          <p class="mt-1 text-slate-600">{{ step.explanation }}</p>
        </li>
      </ol>
      <div class="rounded-lg border border-amber-100 bg-amber-50/60 p-2.5 space-y-1.5 leading-relaxed">
        <p class="font-bold text-amber-800">易错对比 · 留意本题语境</p>
        <p class="font-japanese text-slate-800">✓ {{ lesson.contrast.correct }}</p>
        <p class="font-japanese text-slate-600">✗ {{ lesson.contrast.incorrect }}</p>
        <p class="text-amber-900">{{ lesson.contrast.explanation }}</p>
      </div>

      <div v-if="!state.round" class="space-y-2">
        <p class="text-slate-500">先识别用法，再换个场景应用。可以看提示，结果会区分独立作答与提示后作答。</p>
        <button @click="startFirstRound" class="min-h-11 w-full rounded-xl bg-emerald-600 px-3 py-2.5 font-bold text-white">开始随堂练习 · {{ lesson.questions.length }} 题</button>
      </div>

      <div v-else class="space-y-3 border-t border-slate-100 pt-3">
        <p v-if="state.saveError" class="rounded-lg bg-red-50 p-2 text-red-700" role="alert">
          本轮结果仍在当前页面，但未能保存到本机。
          <button @click="retrySave" class="ml-1 min-h-9 underline font-bold">重试保存结果</button>
        </p>

        <template v-if="!state.round.completed && currentQuestion">
          <p class="font-bold text-emerald-700">{{ state.mode === 'retry' ? '错题订正' : '首次作答' }} · {{ state.round.currentIndex + 1 }}/{{ state.round.questionIds.length }} · {{ currentQuestion.kind === 'recognition' ? '识别用法' : '换场景应用' }}</p>
          <p :id="`${lesson.grammarId}-question`" class="font-semibold text-sm leading-relaxed text-slate-800 whitespace-pre-line">{{ currentQuestion.prompt }}</p>
          <button v-if="!answer && !hintVisible" @click="showHint" class="min-h-10 rounded-lg border border-amber-200 px-3 py-2 font-bold text-amber-800">给我一点提示</button>
          <p v-if="hintVisible" class="rounded-lg bg-amber-50 p-2.5 leading-relaxed text-amber-900">提示：{{ currentQuestion.hint }}</p>
          <div class="grid grid-cols-1 gap-2" :aria-labelledby="`${lesson.grammarId}-question`">
            <button
              v-for="(option, index) in currentQuestion.options"
              :key="index"
              @click="chooseOption(index)"
              :disabled="Boolean(answer)"
              :class="['min-h-11 w-full rounded-xl border px-3 py-2.5 text-left font-japanese whitespace-normal break-words', optionClass(index)]"
            >
              {{ index + 1 }}. {{ option }}
              <span v-if="answer && index === currentQuestion.correctIndex"> ✓ 正确答案</span>
              <span v-else-if="answer && index === answer.selectedOptionIndex"> ✗ 你的选择</span>
            </button>
          </div>
          <div v-if="answer" class="rounded-xl bg-slate-50 p-3 space-y-2 leading-relaxed" role="status" aria-live="polite">
            <p :class="['font-bold', answer.correct ? 'text-emerald-700' : 'text-amber-800']">{{ answer.correct ? (answer.hintUsed ? '提示后答对了' : state.mode === 'retry' ? '这次订正正确' : '这题独立答对了') : '再看一下这个选择的原因' }}</p>
            <p class="text-slate-700"><strong>你的选择：</strong>{{ currentQuestion.optionFeedback[answer.selectedOptionIndex] }}</p>
            <p class="text-slate-700"><strong>判断依据：</strong>{{ currentQuestion.explanation }}</p>
            <p v-if="!answer.correct" class="text-slate-600">先回看上面的易错对比；完成这一轮后，可以只重练错题。</p>
            <button @click="nextQuestion" class="min-h-11 w-full rounded-xl bg-emerald-600 px-3 py-2.5 font-bold text-white">{{ state.round.currentIndex + 1 === state.round.questionIds.length ? '查看本轮结果' : '下一道随堂题' }}</button>
          </div>
        </template>

        <div v-else-if="firstSummary && roundSummary" class="space-y-3" role="status">
          <p class="text-sm font-bold text-slate-800">{{ state.mode === 'retry' ? '错题订正完成' : '本课练习完成' }}</p>
          <div class="rounded-xl bg-emerald-50 p-3 space-y-1 text-emerald-900">
            <p class="font-bold">首次作答：独立答对 {{ firstSummary.independentCorrect }}/{{ firstSummary.total }}</p>
            <p>提示后答对 {{ firstSummary.hintedCorrect }} 题 · 答错 {{ firstSummary.wrongCount }} 题</p>
            <p v-if="state.mode === 'retry'">已订正 {{ state.correctedQuestionIds.length }}/{{ firstSummary.wrongCount }} 道首轮错题；本次订正答对 {{ roundSummary.independentCorrect + roundSummary.hintedCorrect }}/{{ roundSummary.total }}。</p>
          </div>
          <p class="text-[11px] text-slate-500 leading-relaxed">{{ state.saved ? '首次结果已保存到本机。' : '首次结果尚未保存到本机。' }} 随堂练习单独记录，不计入学词或模拟题次数；两道题的结果不代表长期掌握。</p>
          <button v-if="roundSummary.wrongCount" @click="startRetryRound" class="min-h-11 w-full rounded-xl bg-amber-100 px-3 py-2.5 font-bold text-amber-900">只重练本轮错题 · {{ roundSummary.wrongCount }} 题</button>
          <p v-else class="text-emerald-700">这一轮没有待订正题，可以试着自己造句。</p>
          <button @click="startFirstRound" class="min-h-10 rounded-lg border border-slate-200 px-3 py-2 text-slate-600">重新练习全部 {{ lesson.questions.length }} 题</button>
        </div>
      </div>

      <div class="border-t border-slate-100 pt-3 space-y-2">
        <label :for="`${lesson.grammarId}-draft`" class="block font-bold text-slate-700">试着自己说一句</label>
        <p class="leading-relaxed text-slate-600">{{ lesson.outputTask.prompt }}</p>
        <textarea :id="`${lesson.grammarId}-draft`" :value="state.draft" @input="updateDraft" maxlength="300" rows="2" placeholder="先在这里写一句，再展开参考表达自查" class="block w-full min-w-0 resize-y rounded-xl border border-slate-200 bg-white p-2.5 text-sm font-japanese text-slate-800" />
        <p class="text-[10px] text-slate-500">草稿仅在当前会话保留；此处不自动批改或计分。</p>
        <button @click="update({ referenceVisible: !state.referenceVisible })" :aria-expanded="state.referenceVisible" class="min-h-10 rounded-lg bg-slate-100 px-3 py-2 font-semibold text-slate-600">{{ state.referenceVisible ? '收起参考表达' : '展开参考表达自查' }}</button>
        <div v-if="state.referenceVisible" class="rounded-lg bg-slate-50 p-2.5 space-y-1 leading-relaxed">
          <p class="font-japanese font-bold text-slate-800">{{ lesson.outputTask.reference }}</p>
          <p class="font-japanese text-[11px] text-slate-500">{{ lesson.outputTask.reading }}</p>
          <p class="text-slate-600">{{ lesson.outputTask.translation }}</p>
          <p class="text-[10px] text-slate-500">这是一个参考表达，换用合适的词语也可以成立。</p>
        </div>
      </div>
      <details class="text-[10px] leading-relaxed text-slate-500">
        <summary class="cursor-pointer py-2">语法核对资料</summary>
        <p>题目与中文讲解独立编写，以下资料用于核对语法规则；打开链接需要网络。</p>
        <a v-for="source in sources" :key="source.url" :href="source.url" target="_blank" rel="noopener noreferrer" class="block py-1 text-emerald-700 underline">{{ source.title }}</a>
      </details>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { GRAMMAR_LESSON_SOURCES, type GrammarLesson as Lesson } from '@/data/grammarLessons'
import { saveGrammarLessonResult, type GrammarLessonResult } from '@/utils/grammarProgress'
import {
  advanceGrammarQuestion, answerGrammarQuestion, createGrammarRetry, createGrammarSession,
  revealGrammarHint, summarizeGrammarSession, type GrammarLearningState,
} from '@/utils/grammarSession'

const props = defineProps<{ lesson: Lesson; state: GrammarLearningState; savedResult?: GrammarLessonResult }>()
const emit = defineEmits<{ (e: 'update:state', value: GrammarLearningState): void }>()
const currentQuestion = computed(() => props.lesson.questions.find(question => question.id === props.state.round?.questionIds[props.state.round.currentIndex]))
const answer = computed(() => currentQuestion.value ? props.state.round?.answers[currentQuestion.value.id] : undefined)
const hintVisible = computed(() => Boolean(currentQuestion.value && props.state.round?.hintedQuestionIds.includes(currentQuestion.value.id)))
const firstSummary = computed(() => props.state.firstResult ? summarizeGrammarSession(props.state.firstResult) : null)
const roundSummary = computed(() => props.state.round ? summarizeGrammarSession(props.state.round) : null)
const sources = computed(() => props.lesson.sourceIds.map(id => GRAMMAR_LESSON_SOURCES[id]).filter(Boolean))

function update(patch: Partial<GrammarLearningState>) { emit('update:state', { ...props.state, ...patch }) }
function updateDraft(event: Event) { update({ draft: (event.target as HTMLTextAreaElement).value }) }
function startFirstRound() {
  update({ round: createGrammarSession(props.lesson.questions.map(q => q.id)), firstResult: null, mode: 'initial', correctedQuestionIds: [], completedAt: null, saved: false, saveError: false })
}
function showHint() {
  if (props.state.round) update({ round: revealGrammarHint(props.state.round) })
}
function chooseOption(index: number) {
  if (!props.state.round || !currentQuestion.value) return
  const round = answerGrammarQuestion(props.state.round, currentQuestion.value, index)
  if (round === props.state.round) return
  const id = currentQuestion.value.id
  const correctedQuestionIds = props.state.mode === 'retry' && round.answers[id]?.correct
    ? [...new Set([...props.state.correctedQuestionIds, id])]
    : props.state.correctedQuestionIds
  update({ round, correctedQuestionIds })
}
function persistFirstResult(state: GrammarLearningState): GrammarLearningState {
  if (!state.firstResult?.completed || state.completedAt === null) return state
  const summary = summarizeGrammarSession(state.firstResult)
  const saved = saveGrammarLessonResult({
    grammarId: props.lesson.grammarId, total: summary.total, independentCorrect: summary.independentCorrect,
    hintedCorrect: summary.hintedCorrect, wrongCount: summary.wrongCount, completedAt: state.completedAt,
  })
  return { ...state, saved, saveError: !saved }
}
function nextQuestion() {
  if (!props.state.round) return
  const round = advanceGrammarQuestion(props.state.round)
  if (round === props.state.round) return
  let next: GrammarLearningState = { ...props.state, round }
  if (round.completed && next.mode === 'initial') next = persistFirstResult({ ...next, firstResult: round, completedAt: Date.now() })
  emit('update:state', next)
}
function retrySave() { emit('update:state', persistFirstResult(props.state)) }
function startRetryRound() {
  if (!props.state.round) return
  const round = createGrammarRetry(props.state.round)
  if (round) update({ round, mode: 'retry' })
}
function optionClass(index: number) {
  if (!answer.value) return 'border-slate-200 bg-white text-slate-700 hover:border-emerald-400 active:bg-emerald-50'
  if (index === currentQuestion.value?.correctIndex) return 'border-emerald-400 bg-emerald-50 text-emerald-800'
  if (index === answer.value.selectedOptionIndex) return 'border-amber-400 bg-amber-50 text-amber-900'
  return 'border-slate-100 bg-slate-50 text-slate-500'
}
</script>
