<template>
  <div class="flex flex-col bg-slate-50 text-slate-800 p-4 space-y-4">
    <div class="grid grid-cols-2 gap-2" role="group" aria-label="学习模式">
      <button @click="setMode('today')" :aria-pressed="mode === 'today'" :class="['rounded-xl py-2 text-xs font-bold', mode === 'today' ? 'bg-rose-500 text-white' : 'bg-white text-slate-600 border border-slate-200']">今日学习</button>
      <button @click="setMode('browse')" :aria-pressed="mode === 'browse'" :class="['rounded-xl py-2 text-xs font-bold', mode === 'browse' ? 'bg-rose-500 text-white' : 'bg-white text-slate-600 border border-slate-200']">浏览全部</button>
    </div>
    <p class="text-[11px] text-slate-500 leading-relaxed">
      {{ mode === 'today' ? `先复习到期词，再学新词。今日各等级合计已学 ${todayNewWordCount}/${DAILY_NEW_WORD_LIMIT} 个新词。` : '浏览本级全部词汇，不修改掌握记录或今日学习次数。' }}
    </p>
    <p v-if="saveError" class="text-xs text-red-600" role="alert">{{ saveError }}</p>
    <!-- 顶部进度与统计 -->
    <div class="flex items-center justify-between bg-white rounded-2xl p-4 shadow-xs border border-slate-100">
      <div>
        <span class="text-xs text-slate-400 font-semibold uppercase tracking-wider">{{ level }} · {{ mode === 'today' ? '今日任务' : '全部词汇' }}</span>
        <div class="flex items-baseline space-x-1 mt-0.5">
          <span class="text-xl font-black text-rose-500 font-mono">{{ Math.min(currentIndex + 1, activeWordIds.length) }}</span>
          <span class="text-xs text-slate-400 font-mono">/ {{ activeWordIds.length }}</span>
        </div>
      </div>

      <!-- 掌握进度 -->
      <div class="text-right">
        <span class="text-xs text-slate-400 font-semibold">已掌握</span>
        <p class="text-sm font-bold text-emerald-600 font-mono">{{ masteredCount }} 词</p>
      </div>
    </div>

    <!-- 闪卡主体 (点击翻转) -->
    <div v-if="currentWord" class="flex-1 flex flex-col justify-center">
      <div 
        @click="isFlipped = !isFlipped"
        class="bg-white rounded-3xl p-6 min-h-[340px] shadow-lg border border-slate-100 flex flex-col items-center justify-between text-center relative cursor-pointer active:scale-98 transition-all duration-300"
      >
        <!-- 考点标签 -->
        <span v-if="currentWord?.examTag" class="absolute top-4 left-4 text-[10px] bg-amber-50 text-amber-700 px-2.5 py-1 rounded-full font-bold border border-amber-200">
          🏷️ {{ currentWord.examTag }}
        </span>

        <!-- 翻转提示标签 -->
        <span class="absolute top-4 right-4 text-[10px] bg-slate-100 text-slate-500 px-2.5 py-1 rounded-full font-medium">
          {{ isFlipped ? '反面 · 释义' : '正面 · 点击翻转 🔄' }}
        </span>

        <!-- 卡片正面 (汉字 + 假名 + 罗马音) -->
        <div v-if="!isFlipped" class="my-auto space-y-3 w-full break-words">
          <span class="text-xs font-mono font-bold text-rose-500 bg-rose-50 px-2.5 py-1 rounded-full">
            {{ currentWord?.partOfSpeech }}
          </span>
          <h2 class="text-4xl font-black font-japanese text-slate-800 tracking-wide mt-2">
            {{ currentWord?.kanji }}
          </h2>
          <p class="text-base font-japanese font-bold text-slate-500">
            {{ currentWord?.reading }}
          </p>
          <span class="text-xs font-mono text-slate-400 block break-all">
            /{{ currentWord?.romaji }}/
          </span>

          <p v-if="currentWord?.collocation" class="text-xs text-slate-400 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100 font-medium">
            搭配：{{ currentWord.collocation }}
          </p>
        </div>

        <!-- 卡片反面 (中文释义 + 例句 + 搭配) -->
        <div v-else class="my-auto space-y-4 w-full text-left animate-in fade-in zoom-in-95">
          <div class="text-center border-b border-slate-100 pb-3">
            <span class="text-xs text-rose-400 font-mono">中文释义</span>
            <h3 class="text-xl font-black text-slate-800 mt-0.5">{{ currentWord?.meaning }}</h3>
            <p v-if="currentWord?.collocation" class="text-xs text-amber-700 font-medium mt-1">
              常用搭配：{{ currentWord.collocation }}
            </p>
          </div>

          <div v-if="currentWord?.example" class="bg-rose-50/70 rounded-2xl p-3 border border-rose-100/70 space-y-1">
            <span class="text-[10px] text-rose-600 font-bold uppercase tracking-wider block">练习例句</span>
            <p class="font-japanese font-bold text-slate-800 text-xs">{{ currentWord.example.japanese }}</p>
            <p class="font-japanese text-[10px] text-rose-500/80">{{ currentWord.example.furigana }}</p>
            <p class="text-xs text-slate-600 font-sans mt-0.5">{{ currentWord.example.chinese }}</p>
          </div>
          <p v-else class="text-[11px] leading-relaxed text-slate-500">本词先练习读音与常用释义；可到“句子精听”继续练习完整句子。</p>
        </div>

        <!-- 播放发音小按钮 -->
        <button 
          @click.stop="playCurrent"
          class="w-12 h-12 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center hover:bg-rose-100 active:scale-95 transition-all mt-4"
          title="设备朗读单词"
        >
          <svg class="w-5 h-5 fill-current" viewBox="0 0 24 24">
            <path d="M14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77zm-2.5 9.77l-4.5-4.5H3v6h4l4.5 4.5v-6z"/>
          </svg>
        </button>
      </div>

      <!-- 记忆熟悉度评价三按钮 -->
      <div v-if="mode === 'today'" class="grid grid-cols-3 gap-3 mt-4">
        <button 
          @click="markWord('hard')"
          class="py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs active:scale-95 transition-all flex flex-col items-center"
        >
          <span>生疏 😓</span>
          <span class="text-[9px] text-slate-400 font-normal">12 小时后复习</span>
        </button>
        <button 
          @click="markWord('good')"
          class="py-3 rounded-2xl bg-amber-50 hover:bg-amber-100 text-amber-700 font-bold text-xs active:scale-95 transition-all border border-amber-200/60 flex flex-col items-center"
        >
          <span>模糊 🤔</span>
          <span class="text-[9px] text-amber-600/70 font-normal">1 天后复习</span>
        </button>
        <button 
          @click="markWord('easy')"
          class="py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs shadow-md shadow-emerald-200 active:scale-95 transition-all flex flex-col items-center"
        >
          <span>已掌握 ✨</span>
          <span class="text-[9px] text-emerald-100 font-normal">记住了</span>
        </button>
      </div>
      <div v-else class="grid grid-cols-2 gap-3 mt-4">
        <button @click="browseStep(-1)" :disabled="currentIndex === 0" class="rounded-xl bg-white border border-slate-200 py-3 text-xs disabled:opacity-40">上一个词</button>
        <button @click="browseStep(1)" :disabled="currentIndex >= words.length - 1" class="rounded-xl bg-white border border-slate-200 py-3 text-xs disabled:opacity-40">下一个词</button>
      </div>
    </div>
    <div v-else class="rounded-3xl bg-white border border-slate-100 p-6 text-center space-y-3" role="status">
      <p class="text-3xl">🌸</p>
      <h2 class="font-bold text-slate-800">{{ mode === 'today' ? '本级当前学习任务已完成' : '本级暂时没有词汇' }}</h2>
      <p class="text-xs text-slate-500 leading-relaxed">已反馈的词会按复习时间再次出现。生疏词 12 小时后、模糊词 1 天后复习；也可以随时浏览全部词汇。</p>
      <button v-if="words.length" @click="setMode('browse')" class="rounded-xl bg-rose-500 text-white px-5 py-2.5 text-xs font-bold">浏览本级全部词汇</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, onActivated, onDeactivated } from 'vue'
import { COMPREHENSIVE_VOCAB, type VocabItem } from '@/data/vocab'
import { audio } from '@/utils/audio'
import { localDateKey, studyStorage } from '@/utils/storage'
import { buildStudyQueue, DAILY_NEW_WORD_LIMIT } from '@/utils/studyQueue'
import confetti from 'canvas-confetti'

const props = defineProps<{
  level: 'N5' | 'N4' | 'N3' | 'N2' | 'N1'
}>()

const currentIndex = ref(0)
const isFlipped = ref(false)
const masteredCount = ref(0)
const mode = ref<'today' | 'browse'>('today')
const todayQueue = ref<string[]>([])
const todayNewWordCount = ref(0)
const saveError = ref('')
let sessionDate = localDateKey()
let pageActive = true

const words = computed(() => {
  return COMPREHENSIVE_VOCAB.filter(w => w.level === props.level)
})

const activeWordIds = computed(() => mode.value === 'today' ? todayQueue.value : words.value.map(word => word.id))
const currentWord = computed<VocabItem | undefined>(() => words.value.find(word => word.id === activeWordIds.value[currentIndex.value]))

watch(() => props.level, loadSession)

onMounted(() => {
  loadSession()
  window.addEventListener('focus', refreshForNewDay)
  document.addEventListener('visibilitychange', refreshForNewDay)
})
onUnmounted(() => {
  if (pageActive) audio.stop()
  window.removeEventListener('focus', refreshForNewDay)
  document.removeEventListener('visibilitychange', refreshForNewDay)
})
onActivated(() => {
  pageActive = true
  todayNewWordCount.value = studyStorage.getStats().todayNewWordIds.length
  loadMastered()
  refreshForNewDay()
})
onDeactivated(() => { pageActive = false; audio.stop() })

function loadSession() {
  sessionDate = localDateKey()
  todayNewWordCount.value = studyStorage.getStats().todayNewWordIds.length
  todayQueue.value = buildStudyQueue(
    words.value.map(word => word.id),
    Object.keys(studyStorage.getAllRecords()),
    studyStorage.getDueReviewWordIds(),
    DAILY_NEW_WORD_LIMIT - todayNewWordCount.value
  )
  currentIndex.value = 0
  isFlipped.value = false
  saveError.value = ''
  loadMastered()
}

function setMode(next: 'today' | 'browse') {
  mode.value = next
  loadSession()
}

function refreshForNewDay() {
  // 返回完成页时补入新到期任务；同日正在阅读的卡片及浏览位置保持不变。
  if (pageActive && !document.hidden && mode.value === 'today' && (sessionDate !== localDateKey() || !currentWord.value)) loadSession()
}

function browseStep(step: number) {
  currentIndex.value = Math.max(0, Math.min(words.value.length - 1, currentIndex.value + step))
  isFlipped.value = false
}

function loadMastered() {
  masteredCount.value = studyStorage.getMasteredCount(props.level)
}

function playCurrent() {
  if (currentWord.value) {
    audio.speak(currentWord.value.reading)
  }
}

function markWord(type: 'hard' | 'good' | 'easy') {
  if (sessionDate !== localDateKey()) {
    loadSession()
    return
  }
  if (mode.value !== 'today' || !currentWord.value) return

  const statusMap = {
    hard: 'unfamiliar',
    good: 'vague',
    easy: 'mastered'
  } as const

  try {
    studyStorage.recordWordState(currentWord.value.id, props.level, statusMap[type])
  } catch {
    saveError.value = '学习记录无法读取或保存，请检查设备存储后重试；如仍失败，请先保留现有数据。'
    return
  }
  saveError.value = ''
  todayNewWordCount.value = studyStorage.getStats().todayNewWordIds.length
  loadMastered()

  if (type === 'easy') {
    audio.playCorrect()
  }

  isFlipped.value = false

  currentIndex.value++
  if (currentIndex.value >= todayQueue.value.length) {
    confetti({ particleCount: 70, spread: 60 })
  }
}
</script>
