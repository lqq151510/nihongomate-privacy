<template>
  <div ref="scrollRoot" class="flex flex-col h-full min-h-0 bg-slate-50 text-slate-800 pb-6 overflow-y-auto">
    <!-- 顶部控制与模式切换 -->
    <div class="sticky top-0 z-20 bg-white/95 backdrop-blur-md border-b border-slate-100 p-3 shadow-xs space-y-2.5">
      <div class="flex items-center justify-between">
        <div class="flex items-center space-x-2">
          <span class="text-xl">🎯</span>
          <div>
            <h2 class="text-xs font-bold text-slate-800">日语模拟练习</h2>
            <p class="text-[10px] text-slate-400">文字词汇 · 语法星号题 · 听解即时应答</p>
          </div>
        </div>

        <!-- 连对计数徽章 -->
        <div v-if="practiceMode !== 'mock' && practiceMode !== 'special'" class="flex items-center space-x-1.5 bg-amber-50 text-amber-700 px-2.5 py-1 rounded-full text-[11px] font-bold border border-amber-200">
          <span>🔥 连对:</span>
          <span class="font-mono text-sm">{{ streak }}</span>
        </div>
      </div>

      <!-- 模式切换：模拟练习 vs 错题集 vs 五十音测验 -->
      <div class="practice-mode-tabs grid grid-cols-5 gap-1 p-1 bg-slate-100 rounded-xl text-center text-xs font-bold">
        <button @click="changeMode('mock')" :class="['py-1.5 rounded-lg transition-all', practiceMode === 'mock' ? 'bg-white text-rose-600 shadow-xs' : 'text-slate-500 hover:text-slate-800']">⏱️ 模拟考场</button>
        <button @click="changeMode('special')" :aria-pressed="practiceMode === 'special'" :class="['py-1.5 rounded-lg transition-all', practiceMode === 'special' ? 'bg-white text-rose-600 shadow-xs' : 'text-slate-500 hover:text-slate-800']">📚 专项练习</button>
        <button 
          @click="changeMode('exam')"
          :class="[
            'py-1.5 rounded-lg transition-all',
            practiceMode === 'exam' ? 'bg-white text-rose-600 shadow-xs' : 'text-slate-500 hover:text-slate-800'
          ]"
        >
          📝 即时练习
        </button>
        <button 
          @click="changeMode('mistakes')"
          :class="[
            'py-1.5 rounded-lg transition-all flex items-center justify-center space-x-1',
            practiceMode === 'mistakes' ? 'bg-white text-rose-600 shadow-xs' : 'text-slate-500 hover:text-slate-800'
          ]"
        >
          <span>📕 错题本</span>
          <span v-if="mistakeIds.length > 0" class="w-4 h-4 rounded-full bg-rose-500 text-white text-[9px] flex items-center justify-center">
            {{ mistakeIds.length }}
          </span>
        </button>
        <button 
          @click="changeMode('gojuon')"
          :class="[
            'py-1.5 rounded-lg transition-all',
            practiceMode === 'gojuon' ? 'bg-white text-rose-600 shadow-xs' : 'text-slate-500 hover:text-slate-800'
          ]"
        >
          🈂️ 假名测验
        </button>
      </div>

      <!-- 仅在模拟练习模式下展示：等级筛选与题型筛选 -->
      <div v-if="practiceMode === 'exam'" class="space-y-1.5">
        <!-- 等级水平滑动标签栏 (全部 / N5 ~ N1) -->
        <div class="flex space-x-1.5 overflow-x-auto no-scrollbar py-0.5">
          <button 
            @click="filterLevel = 'ALL'"
            :class="[
              'px-2.5 py-1 rounded-xl text-[11px] font-bold shrink-0 transition-all active:scale-95',
              filterLevel === 'ALL' ? 'bg-rose-500 text-white shadow-xs' : 'bg-slate-100 text-slate-600'
            ]"
          >
            全部等级
          </button>
          <button 
            v-for="lvl in ['N5', 'N4', 'N3', 'N2', 'N1'] as const" 
            :key="lvl"
            @click="filterLevel = lvl"
            :class="[
              'px-2.5 py-1 rounded-xl text-[11px] font-bold shrink-0 transition-all active:scale-95',
              filterLevel === lvl ? 'bg-rose-500 text-white shadow-xs' : 'bg-slate-100 text-slate-600'
            ]"
          >
            {{ lvl }}
          </button>
        </div>

        <!-- 题型分类过滤栏 -->
        <div class="flex space-x-1 overflow-x-auto no-scrollbar text-[10px] font-medium text-slate-500">
          <button 
            v-for="cat in categoryOptions" 
            :key="cat.id"
            @click="filterCategory = cat.id"
            :class="[
              'px-2 py-1 rounded-lg shrink-0 transition-all',
              filterCategory === cat.id ? 'bg-slate-800 text-white font-bold' : 'bg-white border border-slate-200'
            ]"
          >
            {{ cat.label }}
          </button>
        </div>
      </div>
      <p v-if="practiceMode === 'exam' || practiceMode === 'mistakes'" class="text-[10px] text-slate-500">
        {{ isRetryRound ? '本轮错题重练' : '本轮题目已固定' }} · 切换等级、题型或模式会开始新一轮
      </p>
    </div>

    <!-- ================= 模式一：模拟练习实训与错题模式 ================= -->
    <div v-if="practiceMode === 'exam' || practiceMode === 'mistakes'" class="p-4 space-y-4 flex-1 flex flex-col justify-center">
      <p v-if="feedbackMessage" :role="feedbackIsError ? 'alert' : 'status'" :class="['rounded-xl border px-3 py-2 text-xs', feedbackIsError ? 'border-rose-200 bg-rose-50 text-rose-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700']">
        {{ feedbackMessage }}
      </p>

      <!-- 题目卡片 -->
      <div v-if="currentQuestion && !isCompleted" class="space-y-4">
        <div class="bg-white rounded-3xl p-5 shadow-md border border-slate-100 relative space-y-3.5">
          
          <!-- 题目标签头 -->
          <div class="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <div class="flex items-center space-x-1.5">
              <span class="text-[10px] bg-rose-50 text-rose-600 font-bold px-2 py-0.5 rounded-md border border-rose-100">
                {{ currentQuestion.level }}
              </span>
              <span class="text-[10px] bg-slate-100 text-slate-600 font-medium px-2 py-0.5 rounded-md">
                {{ currentQuestion.categoryName }}
              </span>
            </div>
            
            <div class="flex items-center space-x-2">
              <span class="text-[10px] text-slate-400 font-mono">
                {{ currentIndex + 1 }} / {{ activeQuestionList.length }}
              </span>
              <button 
                v-if="currentIsMistake"
                @click="removeCurrentMistake"
                class="text-[10px] text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 active:scale-95"
                title="移出收藏后仍保留本轮题目"
              >
                移出错题本
              </button>
            </div>
          </div>

          <!-- 模拟练习来源标签 -->
          <div class="text-[11px] text-amber-600 bg-amber-50/80 px-2.5 py-1 rounded-xl border border-amber-200/60 font-medium flex items-center space-x-1">
            <span>🏛️</span>
            <span>{{ currentQuestion.yearSource }}</span>
          </div>

          <!-- 题型指示 -->
          <p class="text-xs font-bold text-slate-600">
            {{ currentQuestion.promptTitle }}
          </p>

          <!-- 题目正文 -->
          <div class="bg-slate-50/90 rounded-2xl p-4 border border-slate-100 space-y-2">
            <h3 class="text-base font-bold font-japanese text-slate-800 leading-relaxed">
              {{ currentQuestion.questionText }}
            </h3>

            <!-- 听力播放按钮 (若有音频内容) -->
            <div v-if="currentQuestion.audioText" class="pt-1">
              <button 
                @click="playAudioPrompt"
                class="flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-rose-500 text-white text-xs font-bold shadow-xs active:scale-95 transition-all"
              >
                <span>🔊</span>
                <span>播放题目朗读 (设备日语合成语音)</span>
              </button>
            </div>
          </div>

          <!-- 4 个备选选项 -->
          <div class="space-y-2.5 pt-1">
            <button 
              v-for="(opt, idx) in currentQuestion.options" 
              :key="idx"
              @click="selectOption(idx)"
              :disabled="selectedOptionIndex !== null"
              :class="[
                'w-full p-3 rounded-2xl text-xs font-bold text-left transition-all border-2 flex items-center justify-between',
                getOptionStyle(idx)
              ]"
            >
              <div class="flex items-center space-x-2.5">
                <span class="w-6 h-6 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center font-mono text-xs shrink-0">
                  {{ idx + 1 }}
                </span>
                <span class="font-japanese text-sm">{{ opt }}</span>
              </div>
              <span v-if="selectedOptionIndex !== null && idx === currentQuestion.correctIndex" class="text-emerald-500 text-base">
                ✓
              </span>
              <span v-else-if="selectedOptionIndex === idx && idx !== currentQuestion.correctIndex" class="text-rose-500 text-base">
                ✗
              </span>
            </button>
          </div>
        </div>

        <!-- 练习解析与错题解析卡片 (答完题后展开) -->
        <div v-if="selectedOptionIndex !== null" class="bg-white rounded-3xl p-5 shadow-md border border-slate-100 space-y-3 animate-in fade-in zoom-in-98">
          <div class="flex items-center justify-between border-b border-slate-100 pb-2">
            <span class="text-xs font-bold text-slate-800 flex items-center space-x-1">
              <span>💡</span>
              <span>考点练习解析</span>
            </span>
            <span :class="['text-xs font-bold', isAnswerCorrect ? 'text-emerald-600' : 'text-rose-500']">
              {{ isAnswerCorrect ? '回答正确 ✨' : '回答错误 ❌' }}
            </span>
          </div>
          <p class="text-[11px] text-slate-500">{{ currentIsMistake ? '已收录错题本；掌握后可自行移出。' : '当前题目未收藏在错题本中。' }}</p>

          <!-- 中文全译 -->
          <div class="bg-slate-50 rounded-xl p-3 text-xs text-slate-700 leading-relaxed border border-slate-100">
            <span class="font-bold text-slate-800 block mb-0.5">中文精译：</span>
            {{ currentQuestion.explanation.sentenceTranslation }}
          </div>

          <!-- 考点精讲 -->
          <div class="text-xs text-slate-600 leading-relaxed space-y-1.5">
            <p><span class="font-bold text-slate-800">考点解析：</span>{{ currentQuestion.explanation.analysis }}</p>
            <p v-if="currentQuestion.explanation.grammarPoint">
              <span class="font-bold text-rose-600">语法法则：</span>{{ currentQuestion.explanation.grammarPoint }}
            </p>
            <p v-if="currentQuestion.explanation.trapTip" class="text-amber-700 bg-amber-50/70 p-2 rounded-lg border border-amber-100">
              <span class="font-bold">避坑指南：</span>{{ currentQuestion.explanation.trapTip }}
            </p>
          </div>

          <!-- 下一题按钮 -->
          <button 
            @click="nextQuestion"
            class="w-full py-3.5 rounded-2xl bg-slate-900 text-white font-bold text-xs shadow-md active:scale-98 transition-all mt-2"
          >
            {{ currentIndex + 1 >= activeQuestionList.length ? '查看本次实训报告 🏆' : '下一题 ➔' }}
          </button>
        </div>
      </div>

      <!-- 当前范围没有题目 -->
      <div v-else-if="activeQuestionList.length === 0" class="text-center p-8 bg-white rounded-3xl shadow-sm border border-slate-100 space-y-3">
        <span class="text-4xl">🎉</span>
        <h3 class="text-base font-bold text-slate-800">{{ practiceMode === 'mistakes' ? '错题本暂无可练题目' : '当前筛选暂无题目' }}</h3>
        <p class="text-xs text-slate-500">{{ practiceMode === 'mistakes' ? '练习中答错的题会收录到这里。' : '请切换等级或题型，继续练习。' }}</p>
        <button 
          v-if="practiceMode === 'mistakes'"
          @click="changeMode('exam')"
          class="px-5 py-2.5 rounded-xl bg-rose-500 text-white text-xs font-bold shadow-xs active:scale-95"
        >
          返回模拟练习训练
        </button>
      </div>

      <!-- 成绩报告单 -->
      <div v-else-if="isCompleted" class="bg-white rounded-3xl p-6 shadow-md border border-slate-100 text-center space-y-5">
        <div class="text-5xl">🏆</div>
        <div>
          <h3 class="text-lg font-black text-slate-800">本轮模拟练习实训完成！</h3>
          <p class="text-xs text-slate-500 mt-1">本轮已答 {{ summary.answeredCount }} / {{ summary.total }} 题，答对 {{ summary.correctCount }} 题</p>
        </div>

        <div class="grid grid-cols-3 gap-2">
          <div class="bg-rose-50 rounded-2xl p-3 border border-rose-100">
            <span class="text-[10px] text-rose-500 font-bold">正确率</span>
            <p class="text-2xl font-black text-rose-600 font-mono mt-0.5">
              {{ summary.accuracy }}%
            </p>
          </div>
          <div class="bg-amber-50 rounded-2xl p-3 border border-amber-100">
            <span class="text-[10px] text-amber-600 font-bold">最高连击</span>
            <p class="text-2xl font-black text-amber-700 font-mono mt-0.5">
              {{ maxStreak }} 次
            </p>
          </div>
          <div class="bg-slate-50 rounded-2xl p-3 border border-slate-100">
            <span class="text-[10px] text-slate-500 font-bold">本轮答错</span>
            <p class="text-2xl font-black text-slate-700 font-mono mt-0.5">
              {{ summary.wrongQuestionIds.length }} 题
            </p>
          </div>
        </div>

        <p class="text-xs text-slate-500">历史错题本共 {{ mistakeIds.length }} 题，答对不会自动移出收藏。</p>
        <button
          v-if="summary.wrongQuestionIds.length > 0"
          @click="retryRoundMistakes"
          class="w-full py-3 rounded-2xl bg-slate-800 text-white font-bold text-xs active:scale-98"
        >
          只重练本轮错题 ({{ summary.wrongQuestionIds.length }})
        </button>
        <p v-else class="text-xs font-bold text-emerald-700">本轮全部答对，无需重练错题。</p>
        <div class="flex space-x-2">
          <button 
            @click="restartExam"
            class="flex-1 py-3.5 rounded-2xl bg-rose-500 text-white font-bold text-xs shadow-md shadow-rose-200 active:scale-98"
          >
            再刷一轮
          </button>
          <button 
            v-if="mistakeIds.length > 0"
            @click="changeMode('mistakes')"
            class="flex-1 py-3.5 rounded-2xl bg-slate-800 text-white font-bold text-xs shadow-md active:scale-98"
          >
            查看历史错题 ({{ mistakeIds.length }})
          </button>
        </div>
      </div>
    </div>

    <!-- ================= 模式二：经典五十音假名速测 ================= -->
    <div v-else-if="practiceMode === 'gojuon'" class="flex-1">
      <GojuonQuiz />
    </div>
    <MockExamView v-else-if="practiceMode === 'mock'" :active="pageActive" @close="changeMode('exam')" />
    <QuestionBankPracticeView v-if="specialMounted" v-show="practiceMode === 'special'" :active="pageActive && practiceMode === 'special'" @close="changeMode('exam')" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, onActivated, onDeactivated } from 'vue'
import { JLPT_FULL_EXAM_BANK, type ExamQuestion } from '@/data/examQuestions'
import { audio } from '@/utils/audio'
import { studyStorage, STUDY_UPDATED_EVENT } from '@/utils/storage'
import { createPracticeSession, answerPracticeQuestion, advancePracticeQuestion, summarizePracticeSession } from '@/utils/practiceSession'
import confetti from 'canvas-confetti'
import GojuonQuiz from '@/components/GojuonQuiz.vue'
import { usePageScroll } from '@/utils/pageScroll'
import MockExamView from '@/components/MockExamView.vue'
import QuestionBankPracticeView from '@/components/QuestionBankPracticeView.vue'

type PracticeMode = 'exam' | 'mistakes' | 'gojuon' | 'mock' | 'special'
type LevelFilter = 'ALL' | 'N5' | 'N4' | 'N3' | 'N2' | 'N1'

const practiceMode = ref<PracticeMode>('exam')
const specialMounted = ref(false)
const filterLevel = ref<LevelFilter>('ALL')
const filterCategory = ref('ALL')
const mistakeIds = ref<string[]>([])
const session = ref(createPracticeSession([]))
const isRetryRound = ref(false)
const feedbackMessage = ref('')
const feedbackIsError = ref(false)
const { scrollRoot } = usePageScroll()
const pageActive = ref(true)
const questionById = new Map(JLPT_FULL_EXAM_BANK.map(question => [question.id, question]))
const activeQuestionList = computed<ExamQuestion[]>(() => session.value.questionIds.map(id => questionById.get(id)!))
const currentIndex = computed(() => session.value.currentIndex)
const currentQuestion = computed(() => activeQuestionList.value[currentIndex.value])
const currentAnswer = computed(() => currentQuestion.value ? session.value.answers[currentQuestion.value.id] : undefined)
const selectedOptionIndex = computed(() => currentAnswer.value?.selectedOptionIndex ?? null)
const isAnswerCorrect = computed(() => currentAnswer.value?.correct ?? false)
const currentIsMistake = computed(() => !!currentQuestion.value && mistakeIds.value.includes(currentQuestion.value.id))
const isCompleted = computed(() => session.value.completed)
const summary = computed(() => summarizePracticeSession(session.value))
const streak = computed(() => summary.value.streak)
const maxStreak = computed(() => summary.value.maxStreak)

const categoryOptions = [
  { id: 'ALL', label: '全部题型' },
  { id: 'vocab', label: '🔤 文字词汇' },
  { id: 'grammar', label: '📝 句型文法' },
  { id: 'star_grammar', label: '★ 星号排序' },
  { id: 'listening', label: '🎧 听解听力' },
]

function loadMistakes() {
  if (!pageActive.value) return
  mistakeIds.value = studyStorage.getExamMistakes().filter(id => questionById.has(id))
}

function setFeedback(message: string, isError = false) {
  feedbackMessage.value = message
  feedbackIsError.value = isError
}

function startRound(ids: readonly string[], retry = false) {
  audio.stop()
  session.value = createPracticeSession(ids.filter(id => questionById.has(id)))
  isRetryRound.value = retry
  setFeedback('')
}

function restartExam() {
  loadMistakes()
  const questions = practiceMode.value === 'mistakes'
    ? JLPT_FULL_EXAM_BANK.filter(question => mistakeIds.value.includes(question.id))
    : JLPT_FULL_EXAM_BANK.filter(question =>
      (filterLevel.value === 'ALL' || question.level === filterLevel.value) &&
      (filterCategory.value === 'ALL' || question.category === filterCategory.value))
  startRound(practiceMode.value === 'gojuon' || practiceMode.value === 'mock' || practiceMode.value === 'special' ? [] : questions.map(question => question.id))
}

watch([practiceMode, filterLevel, filterCategory], restartExam, { flush: 'sync' })

function changeMode(mode: PracticeMode) {
  if (mode === 'special') specialMounted.value = true
  if (practiceMode.value === mode && isCompleted.value) restartExam()
  else practiceMode.value = mode
}

function selectOption(index: number) {
  const question = currentQuestion.value
  if (selectedOptionIndex.value !== null || !question || isCompleted.value) return
  const nextSession = answerPracticeQuestion(session.value, question.id, index, question.correctIndex)
  if (nextSession === session.value) return
  audio.stop()
  if (!studyStorage.recordExamAnswer(question.id, index === question.correctIndex)) {
    // 存储失败不锁定答案或推进题目，恢复后重试仅计一次作答。
    loadMistakes()
    setFeedback('本次作答未保存，请检查设备存储后重试。当前题目尚未计入本轮成绩。', true)
    return
  }
  session.value = nextSession
  loadMistakes()
  setFeedback('')
  if (isAnswerCorrect.value) audio.playCorrect()
  else audio.playWrong()
}

function nextQuestion() {
  const nextSession = advancePracticeQuestion(session.value)
  if (nextSession === session.value) return
  audio.stop()
  session.value = nextSession
  setFeedback('')
  if (isCompleted.value) confetti({ particleCount: 80, spread: 70 })
}

function playAudioPrompt() {
  if (currentQuestion.value?.audioText) void audio.speak(currentQuestion.value.audioText)
}

function removeCurrentMistake() {
  const question = currentQuestion.value
  if (!question || !currentIsMistake.value) return
  if (!studyStorage.removeExamMistake(question.id)) {
    setFeedback('未能移出错题本，请检查设备存储后重试。', true)
    return
  }
  loadMistakes()
  setFeedback('已移出错题本；当前题目和本轮题序保持不变。')
}

function retryRoundMistakes() {
  const ids = summary.value.wrongQuestionIds
  if (ids.length > 0) startRound(ids, true)
}

function getOptionStyle(idx: number): string {
  if (selectedOptionIndex.value === null) {
    return 'bg-white border-slate-100 hover:border-rose-200 text-slate-800 active:scale-98'
  }
  if (idx === currentQuestion.value?.correctIndex) return 'bg-emerald-50 border-emerald-400 text-emerald-800'
  if (selectedOptionIndex.value === idx) return 'bg-rose-50 border-rose-400 text-rose-800'
  return 'bg-slate-50 border-slate-100 text-slate-400 opacity-60'
}

onMounted(() => {
  restartExam()
  window.addEventListener(STUDY_UPDATED_EVENT, loadMistakes)
  window.addEventListener('focus', loadMistakes)
})
onUnmounted(() => {
  if (pageActive.value) audio.stop()
  window.removeEventListener(STUDY_UPDATED_EVENT, loadMistakes)
  window.removeEventListener('focus', loadMistakes)
})
onActivated(() => { pageActive.value = true; loadMistakes() })
onDeactivated(() => { pageActive.value = false; audio.stop() })
</script>
