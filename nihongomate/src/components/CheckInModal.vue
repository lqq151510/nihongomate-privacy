<template>
  <div v-if="isOpen" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in" role="dialog" aria-modal="true" aria-labelledby="check-in-title">
    <!-- 打卡卡片容器 -->
    <div class="check-in-card w-full max-w-sm bg-white rounded-3xl overflow-hidden shadow-2xl border border-rose-100 flex flex-col relative animate-in zoom-in-95 duration-200">
      
      <!-- 顶部关闭按钮 -->
      <button 
        @click="closeModal" 
        aria-label="关闭每日打卡"
        class="absolute top-3.5 right-3.5 w-7 h-7 rounded-full bg-black/20 hover:bg-black/40 text-white flex items-center justify-center text-xs transition-all z-10"
      >
        ✕
      </button>

      <!-- 顶部和风视觉横幅 -->
      <div class="shrink-0 bg-gradient-to-br from-rose-500 via-pink-500 to-amber-400 p-6 text-white text-center relative overflow-hidden space-y-1.5">
        <!-- 背景装饰符号 -->
        <span class="absolute -right-4 -bottom-4 text-7xl opacity-20 pointer-events-none font-japanese">桜</span>
        <span class="absolute -left-3 -top-3 text-5xl opacity-20 pointer-events-none">⛩️</span>

        <span id="check-in-title" class="text-[11px] font-bold tracking-widest uppercase bg-white/20 px-3 py-0.5 rounded-full inline-block font-mono">
          DAILY CHECK-IN · 每日修行
        </span>
        
        <!-- 连续天数展示 -->
        <div class="pt-2">
          <span class="text-xs text-white/90 font-medium">连续打卡</span>
          <div class="flex items-baseline justify-center space-x-1">
            <span class="text-5xl font-black font-mono tracking-tight">{{ stats.studyStreakDays }}</span>
            <span class="text-sm font-bold">天 🔥</span>
          </div>
        </div>

        <p class="text-[11px] text-white/80">
          已累计打卡坚持 {{ stats.checkInDates.length }} 天
        </p>
      </div>

      <!-- 中间内容区 -->
      <div class="min-h-0 flex-1 overflow-y-auto p-5 space-y-4">
        
        <!-- 最近 7 天打卡周历 -->
        <div class="space-y-1.5">
          <div class="flex items-center justify-between text-xs text-slate-500 font-bold px-1">
            <span>📅 最近 7 天签到历程</span>
            <span class="text-[10px] text-rose-500 font-medium">{{ isCheckedToday ? '今日已打卡' : '今日待打卡' }}</span>
          </div>

          <div class="grid grid-cols-7 gap-1.5 p-2.5 bg-slate-50 rounded-2xl border border-slate-100">
            <div 
              v-for="(day, idx) in recentDays" 
              :key="idx"
              :class="[
                'flex flex-col items-center py-1.5 rounded-xl transition-all',
                day.isToday ? 'bg-white shadow-xs border border-rose-200' : ''
              ]"
            >
              <span class="text-[9px] text-slate-400 font-medium">{{ day.dayLabel }}</span>
              <div 
                :class="[
                  'w-7 h-7 rounded-full flex items-center justify-center my-1 text-xs font-bold transition-all',
                  day.isChecked 
                    ? 'bg-rose-500 text-white shadow-xs shadow-rose-200' 
                    : day.isToday 
                      ? 'bg-rose-100 text-rose-600 animate-pulse' 
                      : 'bg-slate-200/70 text-slate-400'
                ]"
              >
                {{ day.isChecked ? '🌸' : (day.isToday ? '今' : '·') }}
              </div>
              <span :class="['text-[9px] font-mono', day.isToday ? 'text-rose-600 font-bold' : 'text-slate-400']">
                {{ day.dateStr.split('-')[2] }}
              </span>
            </div>
          </div>
        </div>

        <!-- 每日日语励志名言 (配朗读) -->
        <div class="bg-rose-50/70 rounded-2xl p-3.5 border border-rose-100/70 space-y-1 relative">
          <div class="flex items-center justify-between">
            <span class="text-[10px] font-bold text-rose-500 uppercase tracking-wider">今日日文箴言</span>
            <button 
              @click="playMottoAudio"
              class="w-6 h-6 rounded-full bg-white text-rose-500 flex items-center justify-center text-xs shadow-xs active:scale-95 hover:bg-rose-100 transition-all"
              title="朗读箴言"
            >
              🔊
            </button>
          </div>
          <p class="text-xs font-bold font-japanese text-slate-800 leading-snug">{{ todayMotto.japanese }}</p>
          <p class="text-[10px] font-japanese text-rose-500/80">{{ todayMotto.furigana }}</p>
          <p class="text-xs text-slate-600 font-sans mt-0.5">{{ todayMotto.chinese }}</p>
        </div>

        <!-- 今日学习简报 -->
        <div class="grid grid-cols-2 gap-2 text-center text-xs">
          <div class="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
            <span class="text-[10px] text-slate-400 font-medium">今日学词次数</span>
            <p class="text-base font-black text-slate-800 font-mono mt-0.5">{{ stats.todayReviewCount || 0 }} 次</p>
          </div>
          <div class="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
            <span class="text-[10px] text-slate-400 font-medium">练习作答</span>
            <p class="text-base font-black text-slate-800 font-mono mt-0.5">{{ stats.todayExamQuestionsCount || 0 }} 题</p>
          </div>
        </div>

        <!-- 打卡核心动作按钮 -->
        <div class="space-y-2 pt-1">
          <p v-if="actionError" class="text-xs text-red-600" role="alert">{{ actionError }}</p>
          <button 
            @click="handleCheckIn"
            :disabled="isCheckedToday"
            :class="[
              'w-full py-3.5 rounded-2xl text-xs font-bold transition-all shadow-md flex items-center justify-center space-x-1.5 active:scale-98',
              isCheckedToday 
                ? 'bg-emerald-500 text-white cursor-default shadow-emerald-200' 
                : 'bg-gradient-to-r from-rose-500 to-pink-500 text-white shadow-rose-200 hover:shadow-rose-300'
            ]"
          >
            <span>{{ isCheckedToday ? '✓ 今日打卡已达成' : '🌸 立即打卡签到' }}</span>
          </button>

          <!-- 复制成就分享 -->
          <button 
            v-if="isCheckedToday"
            @click="copyShareText"
            class="w-full py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-[11px] font-bold transition-all active:scale-98"
          >
            {{ copySuccess ? '✓ 已复制今日打卡心得！' : '📋 复制打卡战报' }}
          </button>
        </div>

      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { studyStorage, STUDY_UPDATED_EVENT, type UserStudyStats } from '@/utils/storage'
import { audio } from '@/utils/audio'
import confetti from 'canvas-confetti'

const props = defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
}>()

const isOpen = computed({
  get: () => props.modelValue,
  set: (val: boolean) => emit('update:modelValue', val)
})

const stats = ref<UserStudyStats>(studyStorage.getStats())
const isCheckedToday = ref(false)
const copySuccess = ref(false)
const actionError = ref('')
let copyTimer: ReturnType<typeof setTimeout> | undefined
let copyRun = 0
let mottoRun = 0
const MOTTO_AUDIO_ERROR = '日语朗读暂不可用，请检查系统日语语音或隐私选择后重试。'

// 丰富经典日文名言库
const DAILY_MOTTOS = [
  {
    japanese: '継続は力なり。',
    furigana: 'けいぞくはちからなり。',
    chinese: '坚持就是力量。（日式经典励志名言）'
  },
  {
    japanese: '千里の道も一歩から始まる。',
    furigana: 'せんりのみちもいっぽからはじまる。',
    chinese: '千里之行，始于足下。'
  },
  {
    japanese: '七転び八起き、諦めない心が道を開く。',
    furigana: 'ななころびやおき、あきらめないこころがみちをひらく。',
    chinese: '百折不挠，坚韧不拔的心灵终将开启道路。'
  },
  {
    japanese: '雨降って地固まる。',
    furigana: 'あめふってじかたまる。',
    chinese: '风雨过后土地更坚固。（历经考验更加成熟）'
  },
  {
    japanese: '夢見ることができれば、それは実現できる。',
    furigana: 'ゆめみることができれば、それはじつげんできる。',
    chinese: '只要心怀梦想，就必定能将之实现。'
  },
  {
    japanese: '日々の積み重ねが、大きな奇跡を生む。',
    furigana: 'ひびのつみかさねが、おおきなきせきをうむ。',
    chinese: '每一天的微小积累，终将铸就伟大的奇迹。'
  }
]

// 根据日期哈希出当天的固定名言，每日一更
const todayMotto = computed(() => {
  const dayNum = Number(stats.value.lastStudyDate.split('-')[2])
  return DAILY_MOTTOS[dayNum % DAILY_MOTTOS.length]
})

const recentDays = ref(studyStorage.getRecentWeekDays())

watch(() => props.modelValue, (open) => {
  if (open) {
    actionError.value = ''
    refreshData()
  } else {
    copyRun += 1
    mottoRun += 1
    clearTimeout(copyTimer)
    copySuccess.value = false
    audio.stop()
  }
})

onMounted(() => {
  refreshData()
  window.addEventListener(STUDY_UPDATED_EVENT, refreshData)
})
onUnmounted(() => {
  copyRun += 1
  mottoRun += 1
  clearTimeout(copyTimer)
  audio.stop()
  window.removeEventListener(STUDY_UPDATED_EVENT, refreshData)
})

function refreshData() {
  stats.value = studyStorage.getStats()
  isCheckedToday.value = studyStorage.isTodayCheckedIn()
  recentDays.value = studyStorage.getRecentWeekDays()
}

function closeModal() {
  mottoRun += 1
  isOpen.value = false
}

function handleCheckIn() {
  if (isCheckedToday.value) return

  const res = studyStorage.performCheckIn()
  if (!res.success) {
    actionError.value = '打卡未能保存，请检查设备存储空间后重试。'
    return
  }
  actionError.value = ''
  refreshData()
  audio.playCorrect()

  confetti({
    particleCount: 90,
    spread: 75,
    origin: { y: 0.6 }
  })
}

async function playMottoAudio() {
  const run = ++mottoRun
  if (actionError.value === MOTTO_AUDIO_ERROR) actionError.value = ''
  const spoken = await audio.speak(todayMotto.value.japanese)
  if (run !== mottoRun || !isOpen.value) return
  if (!spoken) actionError.value = MOTTO_AUDIO_ERROR
  else if (actionError.value === MOTTO_AUDIO_ERROR) actionError.value = ''
}

async function copyShareText() {
  const run = ++copyRun
  clearTimeout(copyTimer)
  const text = `🌸【随身日语伴侣】每日打卡
我已连续打卡第 ${stats.value.studyStreakDays} 天！
今日箴言：「${todayMotto.value.japanese}」（${todayMotto.value.chinese}）
今日学词：${stats.value.todayReviewCount || 0} 次 | 练习：${stats.value.todayExamQuestionsCount || 0} 题
离线自学，日拱一卒！`

  try {
    if (!navigator.clipboard) throw new Error('Clipboard unavailable')
    await navigator.clipboard.writeText(text)
    if (run !== copyRun) return
    actionError.value = ''
    copySuccess.value = true
    copyTimer = setTimeout(() => {
      copySuccess.value = false
    }, 2000)
  } catch {
    if (run !== copyRun) return
    copySuccess.value = false
    actionError.value = '复制失败，当前设备可能不支持剪贴板访问。'
  }
}
</script>

<style scoped>
.check-in-card {
  max-height: calc(100vh - 2rem);
  max-height: calc(100dvh - 2rem);
}
</style>
