<template>
  <div ref="scrollRoot" class="flex flex-col h-full min-h-0 bg-slate-50 text-slate-800 pb-6 overflow-y-auto">
    <!-- 顶部听力模式导航与控制 -->
    <div class="sticky top-0 z-20 bg-white/95 backdrop-blur-md border-b border-slate-100 p-3 shadow-xs space-y-2.5">
      <div class="flex items-center justify-between">
        <div class="flex items-center space-x-2">
          <span class="text-xl">🎧</span>
          <div>
            <h2 class="text-xs font-bold text-slate-800">日语听力与对话工坊</h2>
            <p class="text-[10px] text-slate-400">设备语音合成 · 可调语速 · 情景会话练习</p>
          </div>
        </div>

        <!-- 听力速度调节器 (0.75x, 1.0x, 1.25x) -->
        <div class="flex items-center space-x-1 bg-slate-100 p-1 rounded-xl text-xs font-mono">
          <button 
            v-for="s in [0.75, 1.0, 1.25]" 
            :key="s"
            @click="playbackRate = s"
            :class="[
              'px-2 py-0.5 rounded-lg font-bold transition-all',
              playbackRate === s ? 'bg-rose-500 text-white shadow-xs' : 'text-slate-500 hover:text-slate-800'
            ]"
          >
            {{ s }}x
          </button>
        </div>
      </div>

      <!-- 模式切换：盲听速辨 vs 情景对话练习 -->
      <div class="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 rounded-xl text-center text-xs font-bold">
        <button 
          @click="listenMode = 'dialogue'"
          :class="[
            'py-1.5 rounded-lg transition-all',
            listenMode === 'dialogue' ? 'bg-white text-rose-600 shadow-xs' : 'text-slate-500 hover:text-slate-800'
          ]"
        >
          🗣️ 情景对话
        </button>
        <button 
          @click="listenMode = 'word'"
          :class="[
            'py-1.5 rounded-lg transition-all',
            listenMode === 'word' ? 'bg-white text-rose-600 shadow-xs' : 'text-slate-500 hover:text-slate-800'
          ]"
        >
          🎯 单词辨音
        </button>
        <button
          @click="listenMode = 'sentence'"
          :class="['py-1.5 rounded-lg transition-all', listenMode === 'sentence' ? 'bg-white text-rose-600 shadow-xs' : 'text-slate-500 hover:text-slate-800']"
        >
          📝 句子精听
        </button>
      </div>

      <!-- 等级选择条 -->
      <div class="flex space-x-1.5 overflow-x-auto no-scrollbar py-0.5">
        <button 
          v-for="lvl in levels" 
          :key="lvl"
          @click="changeLevel(lvl)"
          :class="[
            'px-3 py-1 rounded-xl text-xs font-bold shrink-0 transition-all active:scale-95',
            selectedLevel === lvl 
              ? 'bg-rose-500 text-white shadow-xs' 
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          ]"
        >
          {{ lvl }}
        </button>
      </div>

      <!-- 场景选择胶囊横滑栏 (在长对话模式下) -->
      <div v-if="listenMode === 'dialogue' && levelDialogues.length > 0" class="flex space-x-1.5 overflow-x-auto no-scrollbar pt-0.5">
        <button 
          v-for="(dlg, idx) in levelDialogues" 
          :key="dlg.id"
          @click="selectDialogue(idx)"
          :class="[
            'px-2.5 py-1 rounded-lg text-[11px] font-bold shrink-0 transition-all border flex items-center space-x-1',
            activeDialogueIndex === idx 
              ? 'bg-rose-50 border-rose-400 text-rose-700 shadow-2xs' 
              : 'bg-white border-slate-200 text-slate-600'
          ]"
        >
          <span>📍</span>
          <span>{{ dlg.title.split(' ')[0] }}</span>
        </button>
      </div>
    </div>

    <!-- ================= 模式一：生活与职场对话练习 ================= -->
    <div v-if="listenMode === 'dialogue'" class="p-4 space-y-4 flex-1">
      <p class="text-[11px] text-slate-500 leading-relaxed">本级 {{ levelDialogues.length }} 个练习场景。对话中的人物、时间、地点与服务安排用于语言练习，请以现实服务信息为准。</p>
      <div v-if="currentDialogue" class="space-y-4">
        <div class="rounded-2xl bg-indigo-50 border border-indigo-100 p-3 text-xs text-indigo-900 leading-relaxed">
          <p class="font-bold">这次试着做到：听懂「{{ currentDialogue.title }}」中的关键信息</p>
          <p class="mt-1">先听对话，再完成下方理解题；对照原文找线索，最后换成自己的情况说一句。</p>
        </div>
        
        <!-- 对话场景头部卡片 -->
        <div class="bg-gradient-to-r from-rose-500 to-pink-500 text-white rounded-3xl p-5 shadow-md space-y-2">
          <div class="flex items-center justify-between">
            <span class="text-[10px] font-bold uppercase tracking-wider bg-white/20 px-2.5 py-0.5 rounded-full font-mono">
              {{ currentDialogue.level }} · {{ currentDialogue.scene }}
            </span>
            <span class="text-xs text-white/80 font-medium">共 {{ currentDialogue.sentences.length }} 轮对话</span>
          </div>
          <h3 class="text-base font-black tracking-wide">{{ currentDialogue.title }}</h3>

          <!-- 全文连播与控制 -->
          <div class="pt-2 flex items-center space-x-2">
            <button 
              @click="playWholeDialogue"
              :disabled="isPlayingDialogue"
              :class="[
                'flex-1 py-2 px-3 rounded-2xl text-xs font-bold transition-all flex items-center justify-center space-x-1.5 shadow-sm active:scale-95',
                isPlayingDialogue ? 'bg-white/40 text-white cursor-not-allowed' : 'bg-white text-rose-600 hover:bg-rose-50'
              ]"
            >
              <span>{{ isPlayingDialogue ? '🔊 正在全文连播...' : '▶️ 全文语音朗读' }}</span>
            </button>
            <button 
              v-if="isPlayingDialogue"
              @click="stopDialogueAudio"
              class="py-2 px-3 rounded-2xl bg-white/20 text-white text-xs font-bold active:scale-95"
            >
              ⏹️ 停止
            </button>
          </div>
        </div>

        <!-- 逐句对话气泡流 -->
        <div class="space-y-3">
          <div 
            v-for="(sent, idx) in currentDialogue.sentences" 
            :key="idx"
            :class="[
              'rounded-2xl p-4 border transition-all duration-300 shadow-xs flex items-start justify-between space-x-2',
              playingSentenceIndex === idx 
                ? 'bg-rose-50/90 border-rose-300 ring-2 ring-rose-200' 
                : 'bg-white border-slate-100 hover:border-slate-200'
            ]"
          >
            <div class="space-y-1 flex-1">
              <div class="flex items-center space-x-2">
                <span :class="[
                  'text-[10px] font-bold px-2 py-0.5 rounded-md',
                  getSpeakerBadgeStyle(sent.speaker)
                ]">
                  {{ sent.speaker }}
                </span>
                <span v-if="playingSentenceIndex === idx" class="text-[10px] text-rose-500 font-bold animate-pulse">
                  🔊 朗读中
                </span>
              </div>
              <p class="text-sm font-japanese font-bold text-slate-800 mt-1 leading-snug">{{ sent.japanese }}</p>
              <p class="text-[11px] font-japanese text-rose-500/80">{{ sent.furigana }}</p>
              <p class="text-xs text-slate-600 mt-1 font-sans">{{ sent.chinese }}</p>
            </div>

            <button 
              @click="playSingleSentence(sent.furigana || sent.japanese, idx)"
              class="shrink-0 p-2.5 rounded-xl bg-slate-50 hover:bg-rose-50 text-slate-600 hover:text-rose-600 active:scale-95 transition-all"
              title="单句精听"
            >
              🔊
            </button>
          </div>
        </div>

        <!-- 听力理解随堂测验 -->
        <div class="bg-white rounded-3xl p-5 border border-rose-100 shadow-xs space-y-3">
          <div class="flex items-center justify-between border-b border-slate-100 pb-2">
            <span class="flex items-center space-x-1.5 text-xs font-bold text-rose-600">
              <span>📝</span>
              <span>场景听力理解测验</span>
            </span>
            <span class="text-[10px] text-slate-400">听完朗读后练习</span>
          </div>

          <p class="text-xs font-bold text-slate-800 leading-relaxed">
            {{ currentDialogue.comprehensionQuestion.question }}
          </p>

          <div class="space-y-2">
            <button 
              v-for="(opt, optIdx) in currentDialogue.comprehensionQuestion.options"
              :key="optIdx"
              @click="answerDialogueQuestion(optIdx)"
              :disabled="dialogueAnswered"
              :class="[
                'w-full text-left p-3 rounded-2xl text-xs font-medium border transition-all flex items-center justify-between',
                getDialogueOptStyle(optIdx)
              ]"
            >
              <span>{{ opt }}</span>
              <span v-if="dialogueAnswered && optIdx === currentDialogue.comprehensionQuestion.correctAnswer" class="text-emerald-500 font-bold">✓</span>
              <span v-else-if="dialogueAnswered && selectedDialogueOpt === optIdx && optIdx !== currentDialogue.comprehensionQuestion.correctAnswer" class="text-rose-500 font-bold">✗</span>
            </button>
          </div>

          <!-- 测验深度解析 -->
          <div v-if="dialogueAnswered" class="p-3 bg-slate-50 rounded-2xl text-xs text-slate-600 border border-slate-200 space-y-1 animate-in fade-in">
            <span class="font-bold text-rose-500 block">💡 场景考点解析：</span>
            <p class="leading-relaxed">{{ currentDialogue.comprehensionQuestion.explanation }}</p>
          </div>
        </div>
      </div>

      <div v-else class="text-center py-12 text-slate-400 text-xs">
        当前级别暂无情景长对话，请切换其他等级体验。
      </div>
    </div>

    <!-- ================= 模式二：单句盲听速辨 ================= -->
    <div v-else-if="listenMode === 'word'" class="p-4 space-y-4 flex-1 flex flex-col justify-center">
      <!-- 播放声波卡片 -->
      <div class="bg-white rounded-3xl p-6 shadow-md border border-slate-100 flex flex-col items-center justify-center text-center relative overflow-hidden">
        
        <!-- 连对小徽章 -->
        <div class="absolute top-3 left-4 flex items-center space-x-1 text-xs font-bold text-amber-500">
          <span>🔥 听力连对:</span>
          <span class="font-mono text-sm">{{ streak }}</span>
        </div>

        <!-- 进度条 -->
        <div class="absolute top-3 right-4 text-xs font-mono text-slate-400">
          {{ currentItem ? currentIndex + 1 : 0 }} / {{ activeList.length }}
        </div>

        <!-- 巨型播放小喇叭按钮 -->
        <button 
          @click="replayAudio"
          :disabled="currentOptions.length !== 4"
          :class="[
            'w-24 h-24 rounded-full flex items-center justify-center shadow-xl transition-all my-4 active:scale-92 disabled:opacity-40 disabled:cursor-not-allowed',
            isPlaying 
              ? 'bg-rose-600 text-white scale-105 shadow-rose-300 ring-4 ring-rose-200 animate-pulse' 
              : 'bg-gradient-to-tr from-rose-500 to-pink-500 text-white hover:shadow-rose-200'
          ]"
        >
          <span class="text-3xl">{{ isPlaying ? '🔊' : '▶️' }}</span>
        </button>

        <p class="text-xs text-slate-400 font-medium">点击播放或重听 · 仔细辨别读音</p>
      </div>

      <p v-if="currentOptions.length !== 4" role="status" class="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs leading-relaxed text-amber-800">
        当前词条暂无足够可区分的读音选项，暂不能生成四选一。请切换等级，或使用情景对话、句子精听继续练习。
      </p>

      <!-- 四选一选项卡片 -->
      <div class="space-y-2.5">
        <button 
          v-for="opt in currentOptions" 
          :key="opt.id"
          @click="handleSelect(opt)"
          :disabled="isAnswered"
          :class="[
            'w-full p-4 rounded-2xl border transition-all text-left flex items-center justify-between',
            getOptionStyle(opt)
          ]"
        >
          <div class="flex items-center space-x-3">
            <span class="w-7 h-7 rounded-lg bg-slate-100 text-slate-500 flex items-center justify-center text-xs font-mono">
              {{ opt.partOfSpeech }}
            </span>
            <div>
              <p class="text-sm font-bold font-japanese text-slate-800">{{ opt.kanji }}</p>
              <p class="text-xs text-slate-500">{{ opt.meaning }}</p>
            </div>
          </div>
          <span v-if="isAnswered && opt.id === currentItem?.id" class="text-emerald-500 font-bold">✓</span>
          <span v-else-if="isAnswered && selectedOpt?.id === opt.id && opt.id !== currentItem?.id" class="text-rose-500 font-bold">✗</span>
        </button>
      </div>

      <!-- 下一题按钮 -->
      <div v-if="isAnswered" class="pt-2 animate-in fade-in">
        <button 
          @click="nextItem"
          class="w-full py-3.5 rounded-2xl bg-slate-900 text-white font-bold text-xs shadow-md active:scale-98 transition-all"
        >
          {{ currentIndex + 1 >= activeList.length ? '完成本轮听力测试 🏆' : '下一题 ➔' }}
        </button>
      </div>
    </div>
    <SentenceListening v-show="listenMode === 'sentence'" :level="selectedLevel" :rate="playbackRate" :active="listenMode === 'sentence'" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, onDeactivated } from 'vue'
import { COMPREHENSIVE_VOCAB, type VocabItem } from '@/data/vocab'
import { REAL_LISTENING_SCENARIOS, type ListeningDialogue } from '@/data/listeningScenarios'
import { EXTRA_LISTENING_SCENARIOS } from '@/data/extraListeningScenarios'
import SentenceListening from '@/components/SentenceListening.vue'
import { audio } from '@/utils/audio'
import confetti from 'canvas-confetti'
import { usePageScroll } from '@/utils/pageScroll'
import { notifyUser } from '@/utils/feedback'
import { buildListeningOptions } from '@/utils/listeningOptions'

const { scrollRoot } = usePageScroll()

const levels: ('N5' | 'N4' | 'N3' | 'N2' | 'N1')[] = ['N5', 'N4', 'N3', 'N2', 'N1']
const selectedLevel = ref<'N5' | 'N4' | 'N3' | 'N2' | 'N1'>('N5')
const playbackRate = ref<number>(1.0)
const listenMode = ref<'dialogue' | 'word' | 'sentence'>('dialogue')

// 模式一状态 (长对话)
const activeDialogueIndex = ref(0)
const isPlayingDialogue = ref(false)
const playingSentenceIndex = ref<number | null>(null)
const dialogueAnswered = ref(false)
const selectedDialogueOpt = ref<number | null>(null)
let playbackRun = 0

// 模式二状态 (单词盲听)
const currentIndex = ref(0)
const streak = ref(0)
const isPlaying = ref(false)
const isAnswered = ref(false)
const selectedOpt = ref<VocabItem | null>(null)
const currentOptions = ref<VocabItem[]>([])

const activeList = computed(() => {
  return COMPREHENSIVE_VOCAB.filter(v => v.level === selectedLevel.value)
})

const currentItem = computed(() => {
  return activeList.value[currentIndex.value]
})

// 当前等级下的所有情景对话列表
const levelDialogues = computed<ListeningDialogue[]>(() => {
  return [...REAL_LISTENING_SCENARIOS, ...EXTRA_LISTENING_SCENARIOS].filter(d => d.level === selectedLevel.value)
})

const currentDialogue = computed<ListeningDialogue | undefined>(() => {
  return levelDialogues.value[activeDialogueIndex.value] || levelDialogues.value[0]
})

onMounted(() => {
  loadQuestion()
})
onUnmounted(stopDialogueAudio)
onDeactivated(stopDialogueAudio)
watch(listenMode, stopDialogueAudio)

watch(selectedLevel, () => {
  activeDialogueIndex.value = 0
  dialogueAnswered.value = false
  selectedDialogueOpt.value = null
  stopDialogueAudio()
})

function changeLevel(lvl: 'N5' | 'N4' | 'N3' | 'N2' | 'N1') {
  selectedLevel.value = lvl
  currentIndex.value = 0
  streak.value = 0
  dialogueAnswered.value = false
  selectedDialogueOpt.value = null
  loadQuestion()
}

function selectDialogue(index: number) {
  stopDialogueAudio()
  activeDialogueIndex.value = index
  dialogueAnswered.value = false
  selectedDialogueOpt.value = null
  playingSentenceIndex.value = null
}

function loadQuestion() {
  isAnswered.value = false
  selectedOpt.value = null
  currentOptions.value = buildListeningOptions(currentItem.value, activeList.value)
}

async function replayAudio() {
  if (!currentItem.value || currentOptions.value.length !== 4) return
  stopDialogueAudio()
  const run = playbackRun
  isPlaying.value = true
  await audio.speak(currentItem.value.reading, playbackRate.value)
  if (run === playbackRun) isPlaying.value = false
}

function handleSelect(opt: VocabItem) {
  if (isAnswered.value || !currentItem.value || currentOptions.value.length !== 4 || !currentOptions.value.some(option => option.id === opt.id)) return

  selectedOpt.value = opt
  isAnswered.value = true

  if (opt.id === currentItem.value.id) {
    audio.playCorrect()
    streak.value++
  } else {
    audio.playWrong()
    streak.value = 0
  }
}

function getOptionStyle(opt: VocabItem) {
  if (!isAnswered.value) {
    return 'bg-white border-slate-100 hover:border-rose-200 active:bg-rose-50'
  }

  if (opt.id === currentItem.value?.id) {
    return 'bg-emerald-50 border-emerald-500 text-emerald-700 ring-2 ring-emerald-200'
  }
  if (selectedOpt.value?.id === opt.id) {
    return 'bg-rose-50 border-rose-500 text-rose-700'
  }
  return 'bg-slate-50 border-slate-100 text-slate-400 opacity-60'
}

function nextItem() {
  stopDialogueAudio()
  if (currentIndex.value + 1 >= activeList.value.length) {
    confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 } })
    notifyUser(`已完成 JLPT ${selectedLevel.value} 的听力速测，可以再练一轮。`, 'success')
    currentIndex.value = 0
  } else {
    currentIndex.value++
  }
  loadQuestion()
}

// 长对话模式函数
async function playWholeDialogue() {
  if (!currentDialogue.value || isPlayingDialogue.value) return
  stopDialogueAudio()
  const run = playbackRun
  const sentences = currentDialogue.value.sentences
  isPlayingDialogue.value = true

  for (let i = 0; i < sentences.length; i++) {
    if (run !== playbackRun) break
    playingSentenceIndex.value = i
    const sentence = sentences[i]
    const played = await audio.speak(sentence.furigana || sentence.japanese, playbackRate.value)
    if (!played || run !== playbackRun) break
    await new Promise(r => setTimeout(r, 450))
  }

  if (run === playbackRun) {
    playingSentenceIndex.value = null
    isPlayingDialogue.value = false
  }
}

function stopDialogueAudio() {
  playbackRun++
  isPlayingDialogue.value = false
  isPlaying.value = false
  playingSentenceIndex.value = null
  audio.stop()
}

async function playSingleSentence(text: string, idx: number) {
  stopDialogueAudio()
  const run = playbackRun
  playingSentenceIndex.value = idx
  await audio.speak(text, playbackRate.value)
  if (run === playbackRun) playingSentenceIndex.value = null
}

function answerDialogueQuestion(idx: number) {
  selectedDialogueOpt.value = idx
  dialogueAnswered.value = true
  if (currentDialogue.value && idx === currentDialogue.value.comprehensionQuestion.correctAnswer) {
    audio.playCorrect()
  } else {
    audio.playWrong()
  }
}

function getDialogueOptStyle(idx: number) {
  if (!dialogueAnswered.value) {
    return 'bg-white border-slate-200 hover:bg-slate-50'
  }
  if (currentDialogue.value && idx === currentDialogue.value.comprehensionQuestion.correctAnswer) {
    return 'bg-emerald-50 border-emerald-500 text-emerald-800 font-bold'
  }
  if (selectedDialogueOpt.value === idx) {
    return 'bg-rose-50 border-rose-500 text-rose-800'
  }
  return 'bg-slate-50 border-slate-100 text-slate-400'
}

function getSpeakerBadgeStyle(speaker: string): string {
  if (speaker.includes('店員') || speaker.includes('駅員') || speaker.includes('フロント') || speaker.includes('窓口') || speaker.includes('薬剤師')) {
    return 'bg-blue-50 text-blue-600 border border-blue-200'
  }
  if (speaker.includes('課長') || speaker.includes('部長') || speaker.includes('社長') || speaker.includes('上司') || speaker.includes('専務')) {
    return 'bg-purple-50 text-purple-600 border border-purple-200'
  }
  return 'bg-rose-50 text-rose-600 border border-rose-200'
}
</script>
