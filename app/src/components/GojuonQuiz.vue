<template>
  <div class="flex flex-col h-full bg-slate-50 p-4 pb-24 overflow-y-auto">
    <!-- 顶部状态栏 -->
    <div class="flex items-center justify-between bg-white rounded-2xl p-4 shadow-xs border border-slate-100">
      <div>
        <span class="text-xs font-semibold text-slate-400 uppercase tracking-wider">今日连对挑战</span>
        <div class="flex items-baseline space-x-1 mt-0.5">
          <span class="text-2xl font-black text-rose-500 font-mono">{{ streak }}</span>
          <span class="text-xs font-medium text-slate-400">连击 🔥</span>
        </div>
      </div>

      <div class="flex items-center space-x-2">
        <span class="text-xs font-semibold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-xl font-mono">
          进度: {{ currentIndex + 1 }} / {{ totalQuestions }}
        </span>
      </div>
    </div>

    <!-- 题目卡片 -->
    <div v-if="!isFinished" class="mt-4 flex-1 flex flex-col justify-center">
      <div class="bg-white rounded-3xl p-6 shadow-md border border-slate-100 flex flex-col items-center justify-center text-center relative overflow-hidden">
        <!-- 装饰背景图案 -->
        <div class="absolute -right-8 -top-8 w-28 h-28 bg-rose-50 rounded-full blur-xl pointer-events-none"></div>

        <!-- 听音大按钮 -->
        <button 
          @click="playCurrentSound"
          class="w-20 h-20 rounded-full bg-rose-500 text-white flex items-center justify-center shadow-lg shadow-rose-200 active:scale-95 transition-all mb-4"
        >
          <svg class="w-8 h-8 fill-current" viewBox="0 0 24 24">
            <path d="M14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77zm-2.5 9.77l-4.5-4.5H3v6h4l4.5 4.5v-6z"/>
          </svg>
        </button>

        <h3 class="text-sm font-semibold text-slate-600">点击小喇叭听发音，选出正确的假名</h3>
        <span class="text-xs text-rose-400 font-mono mt-1">罗马音提示：/{{ currentQuestion?.target.romaji }}/</span>
      </div>

      <!-- 选项按钮列表 -->
      <div class="grid grid-cols-2 gap-3 mt-4">
        <button 
          v-for="(option, idx) in currentQuestion?.options" 
          :key="idx"
          @click="handleAnswer(option)"
          :disabled="selectedAnswer !== null"
          :class="[
            'h-20 rounded-2xl text-3xl font-bold font-japanese border-2 transition-all flex items-center justify-center shadow-xs',
            getOptionClass(option)
          ]"
        >
          <span>{{ option.hiragana }}</span>
          <span class="text-sm font-normal text-slate-400 font-japanese ml-2">({{ option.katakana }})</span>
        </button>
      </div>

      <!-- 下一题按钮 -->
      <div v-if="selectedAnswer !== null" class="mt-4 animate-in fade-in slide-in-from-bottom-2">
        <button 
          @click="nextQuestion"
          class="w-full py-3.5 rounded-2xl bg-slate-800 text-white font-semibold text-sm shadow-md active:scale-98 transition-all"
        >
          {{ currentIndex + 1 >= totalQuestions ? '查看本次测验成绩 🏆' : '下一题 ➔' }}
        </button>
      </div>
    </div>

    <!-- 成绩总结页 -->
    <div v-else class="mt-6 flex-1 flex flex-col items-center justify-center text-center p-6 bg-white rounded-3xl shadow-md border border-slate-100">
      <div class="text-5xl mb-2">🎉</div>
      <h2 class="text-xl font-bold text-slate-800">测验挑战完成！</h2>
      <p class="text-xs text-slate-500 mt-1">恭喜你完成了本轮假名听音辨字训练</p>

      <div class="grid grid-cols-2 gap-4 w-full my-6">
        <div class="bg-rose-50 rounded-2xl p-4 border border-rose-100">
          <span class="text-xs font-semibold text-rose-400">正确率</span>
          <p class="text-3xl font-black text-rose-600 font-mono mt-0.5">
            {{ Math.round((correctCount / totalQuestions) * 100) }}%
          </p>
        </div>
        <div class="bg-slate-50 rounded-2xl p-4 border border-slate-100">
          <span class="text-xs font-semibold text-slate-400">最高连击</span>
          <p class="text-3xl font-black text-slate-700 font-mono mt-0.5">
            {{ maxStreak }} 次
          </p>
        </div>
      </div>

      <button 
        @click="restartQuiz"
        class="w-full py-3.5 rounded-2xl bg-rose-500 text-white font-semibold text-sm shadow-lg shadow-rose-200 active:scale-98 transition-all"
      >
        再来一轮测试
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { SEION_DATA, type KanaItem } from '@/data/gojuon'
import { audio } from '@/utils/audio'
import confetti from 'canvas-confetti'

interface Question {
  target: KanaItem
  options: KanaItem[]
}

const totalQuestions = 10
const currentIndex = ref(0)
const streak = ref(0)
const maxStreak = ref(0)
const correctCount = ref(0)
const isFinished = ref(false)
const selectedAnswer = ref<KanaItem | null>(null)
const isCurrentCorrect = ref<boolean | null>(null)
const currentQuestion = ref<Question | null>(null)

// 过滤掉空白占位假名
const validKana = SEION_DATA.filter(k => !k.isEmpty)

onMounted(() => {
  generateQuestion()
})

function generateQuestion() {
  selectedAnswer.value = null
  isCurrentCorrect.value = null

  // 随机挑一个目标
  const target = validKana[Math.floor(Math.random() * validKana.length)]
  
  // 随机挑 3 个干扰项
  const distractors: KanaItem[] = []
  while (distractors.length < 3) {
    const candidate = validKana[Math.floor(Math.random() * validKana.length)]
    if (candidate.id !== target.id && !distractors.some(d => d.id === candidate.id)) {
      distractors.push(candidate)
    }
  }

  // 打乱选项顺序
  const options = [...distractors, target].sort(() => Math.random() - 0.5)

  currentQuestion.value = { target, options }
}

function playCurrentSound() {
  if (currentQuestion.value) {
    audio.speak(currentQuestion.value.target.hiragana)
  }
}

function handleAnswer(option: KanaItem) {
  if (!currentQuestion.value || selectedAnswer.value !== null) return

  selectedAnswer.value = option
  const correct = option.id === currentQuestion.value.target.id
  isCurrentCorrect.value = correct

  if (correct) {
    audio.playCorrect()
    correctCount.value++
    streak.value++
    if (streak.value > maxStreak.value) {
      maxStreak.value = streak.value
    }
  } else {
    audio.playWrong()
    streak.value = 0
  }
}

function getOptionClass(option: KanaItem) {
  if (!selectedAnswer.value || !currentQuestion.value) {
    return 'bg-white border-slate-100 text-slate-800 hover:border-rose-200'
  }

  // 用户已选择，显示红绿反馈
  if (option.id === currentQuestion.value.target.id) {
    return 'bg-emerald-50 border-emerald-500 text-emerald-700 font-bold scale-102 ring-2 ring-emerald-300'
  }
  if (selectedAnswer.value.id === option.id && !isCurrentCorrect.value) {
    return 'bg-rose-50 border-rose-500 text-rose-600 animate-shake'
  }
  return 'bg-slate-50 border-slate-100 text-slate-400 opacity-60'
}

function nextQuestion() {
  if (currentIndex.value + 1 >= totalQuestions) {
    isFinished.value = true
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 }
    })
  } else {
    currentIndex.value++
    generateQuestion()
  }
}

function restartQuiz() {
  currentIndex.value = 0
  streak.value = 0
  maxStreak.value = 0
  correctCount.value = 0
  isFinished.value = false
  generateQuestion()
}
</script>
