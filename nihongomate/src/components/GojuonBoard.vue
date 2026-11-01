<template>
  <div ref="scrollRoot" class="flex flex-col h-full min-h-0 bg-slate-50 text-slate-800 pb-6 overflow-y-auto">
    <!-- 顶部状态与筛选栏 -->
    <div class="sticky top-0 z-20 bg-white/95 backdrop-blur-md border-b border-slate-100 p-3 shadow-xs space-y-2.5">
      <div class="flex items-center justify-between">
        <div class="flex items-center space-x-2">
          <span class="text-base">🀄</span>
          <div>
            <h3 class="text-xs font-bold text-slate-800">汉语拼音对照 · 五十音图</h3>
            <p class="text-[10px] text-slate-400">声母 (辅音) × 韵母 (元音) 拼读矩阵</p>
          </div>
        </div>

        <!-- 平假名 / 片假名 切换器 -->
        <div class="inline-flex p-1 bg-slate-100 rounded-xl space-x-1 border border-slate-200/50">
          <button 
            v-for="m in modes" 
            :key="m.id"
            @click="displayMode = m.id"
            :class="[
              'px-2.5 py-1 rounded-lg text-xs font-semibold transition-all',
              displayMode === m.id 
                ? 'bg-rose-500 text-white shadow-xs' 
                : 'text-slate-600 hover:text-slate-900'
            ]"
          >
            {{ m.name }}
          </button>
        </div>
      </div>

      <!-- 拼音拼读规律提示 -->
      <div class="flex items-center justify-between text-[11px] bg-rose-50/70 border border-rose-100/60 rounded-xl px-2.5 py-1.5 text-rose-700">
        <span class="flex items-center space-x-1">
          <span class="w-2 h-2 rounded-full bg-amber-400"></span>
          <span>标金黄色为<strong>特殊音</strong> (如 し=xi、ち=qi、つ=ci、ふ=hu)</span>
        </span>
        <span class="text-[10px] text-rose-500">点声母可听整行 🎵</span>
      </div>
    </div>

    <p class="px-3 pt-3 text-[11px] text-slate-500">拼音和中文谐音仅辅助记忆，不等于日语发音，请结合日语朗读与口型学习。</p>

    <!-- 核心拼音表格容器 -->
    <div class="p-3">
      <div class="bg-white rounded-2xl shadow-xs border border-slate-200 overflow-hidden">
        
        <!-- 表格头部：韵母 (元音列) -->
        <div class="grid grid-cols-6 bg-slate-100/80 border-b border-slate-200 text-center font-bold text-xs py-2 text-slate-600">
          <div class="text-[10px] text-slate-400 flex items-center justify-center font-mono">
            声母 \ 韵母
          </div>
          <div class="text-rose-600">a<span class="text-[10px] block font-normal text-slate-400">[阿]</span></div>
          <div class="text-rose-600">i<span class="text-[10px] block font-normal text-slate-400">[衣]</span></div>
          <div class="text-rose-600">u<span class="text-[10px] block font-normal text-slate-400">[乌]</span></div>
          <div class="text-rose-600">e<span class="text-[10px] block font-normal text-slate-400">[诶]</span></div>
          <div class="text-rose-600">o<span class="text-[10px] block font-normal text-slate-400">[喔]</span></div>
        </div>

        <!-- 表格主体：声母行逐行渲染 -->
        <div class="divide-y divide-slate-100">
          <div 
            v-for="row in PINYIN_SEION_ROWS" 
            :key="row.key"
            class="grid grid-cols-6 items-center min-h-16 hover:bg-slate-50/50 transition-colors"
          >
            <!-- 左侧声母表头 (点击可整行朗读) -->
            <button 
              @click="playWholeRow(row)"
              class="h-full flex flex-col items-center justify-center bg-slate-50/70 border-r border-slate-100 p-1 active:bg-rose-50 text-slate-600 hover:text-rose-600 transition-all"
              title="点击整行连读"
            >
              <span class="text-xs font-mono font-black">{{ row.consonant }}</span>
              <span class="text-[9px] text-slate-400 scale-90">{{ row.name.slice(0, 3) }}</span>
              <svg class="w-3 h-3 text-rose-400 mt-0.5 opacity-70" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 5v14l11-7z"/>
              </svg>
            </button>

            <!-- 5个假名拼读单元格 -->
            <template v-for="(item, colIdx) in row.items" :key="item.id || colIdx">
              <!-- 空白占位格 (如 ya行的 yi/ye) -->
              <div v-if="item.isEmpty" class="h-full bg-slate-50/30 flex items-center justify-center border-r border-slate-50">
                <span class="text-slate-200 text-xs">·</span>
              </div>

              <!-- 正常假名格 -->
              <button 
                v-else
                @click="handleSelectKana(item)"
                :class="[
                  'h-full flex flex-col items-center justify-center p-1.5 border-r border-slate-100 transition-all active:scale-95 relative group',
                  selectedItem?.id === item.id 
                    ? 'bg-rose-500 text-white shadow-inner font-bold' 
                    : item.isSpecial 
                      ? 'bg-amber-50/40 hover:bg-amber-50 text-slate-800' 
                      : 'hover:bg-rose-50/30 text-slate-800'
                ]"
              >
                <!-- 特殊发音小角标 -->
                <span 
                  v-if="item.isSpecial && selectedItem?.id !== item.id" 
                  class="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-amber-500 ring-2 ring-amber-100"
                  title="特殊发音"
                ></span>

                <!-- 假名大字 -->
                <span class="text-xl font-bold font-japanese leading-none my-0.5">
                  {{ displayMode === 'katakana' ? item.katakana : item.hiragana }}
                </span>

                <!-- 拼音与拟音提示 -->
                <div 
                  :class="[
                    'text-[9px] font-mono leading-tight tracking-tight mt-0.5',
                    selectedItem?.id === item.id ? 'text-rose-100' : item.isSpecial ? 'text-amber-700 font-bold' : 'text-slate-400'
                  ]"
                >
                  {{ item.pinyin }}
                </div>
              </button>
            </template>
          </div>
        </div>

        <!-- 底部拨音单独一行展示 -->
        <div class="bg-rose-50/40 p-3 border-t border-slate-200 flex items-center justify-between">
          <div class="flex items-center space-x-3">
            <button 
              @click="handleSelectKana(HATSUON_ITEM)"
              :class="[
                'w-14 h-14 rounded-2xl flex flex-col items-center justify-center border transition-all active:scale-95 shadow-xs',
                selectedItem?.id === HATSUON_ITEM.id ? 'bg-rose-500 text-white border-rose-500' : 'bg-white text-slate-800 border-rose-200'
              ]"
            >
              <span class="text-2xl font-bold font-japanese leading-none">
                {{ displayMode === 'katakana' ? HATSUON_ITEM.katakana : HATSUON_ITEM.hiragana }}
              </span>
              <span class="text-[9px] font-mono mt-0.5 text-slate-400">n [嗯]</span>
            </button>
            <div>
              <div class="flex items-center space-x-2">
                <span class="text-xs font-bold text-slate-800">唯一单辅音：拨音 (ん / ン)</span>
                <span class="text-[10px] bg-amber-100 text-amber-800 font-bold px-1.5 py-0.5 rounded">鼻腔音</span>
              </div>
              <p class="text-[11px] text-slate-500 mt-0.5">相当于汉语拼音的前后鼻音尾音(n/ng)，独立占一拍时长。</p>
            </div>
          </div>

          <button 
            @click="playVoice(HATSUON_ITEM.hiragana)"
            class="text-xs font-semibold px-3 py-2 bg-white text-rose-600 border border-rose-200 rounded-xl active:scale-95 shadow-xs"
          >
            听发音 🔊
          </button>
        </div>
      </div>
    </div>

    <!-- 底部选定假名详情卡片 (弹层解析拼读秘籍与例词) -->
    <div 
      v-if="selectedItem && !selectedItem.isEmpty"
      class="fixed left-0 right-0 z-30 mx-4 mb-2 bg-white/95 backdrop-blur-xl rounded-2xl p-4 shadow-2xl border border-rose-100 animate-in slide-in-from-bottom-6 duration-200 max-w-md md:mx-auto"
      style="bottom: calc(4rem + env(safe-area-inset-bottom))"
    >
      <div class="flex items-start justify-between">
        <div class="flex items-center space-x-3">
          <div class="w-14 h-14 rounded-2xl bg-rose-50 flex items-center justify-center text-3xl font-japanese font-black text-rose-500 shadow-inner">
            {{ selectedItem.hiragana }}
          </div>
          <div>
            <div class="flex items-baseline space-x-2">
              <span class="text-xl font-bold text-slate-800 font-japanese">{{ selectedItem.katakana }}</span>
              <span class="text-xs font-mono font-bold text-rose-500">拼读: {{ selectedItem.pinyin }}</span>
            </div>
            <p class="text-[11px] text-slate-500 flex items-center space-x-1 mt-0.5">
              <span>汉字字源：</span>
              <span class="font-semibold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded">{{ selectedItem.kanjiOrigin }}</span>
            </p>
          </div>
        </div>

        <div class="flex items-center space-x-2">
          <button 
            @click="playVoice(selectedItem.hiragana)"
            class="p-2.5 rounded-xl bg-rose-500 text-white shadow-md shadow-rose-200 active:scale-95 transition-all"
            title="设备朗读"
          >
            <svg class="w-4 h-4 fill-current" viewBox="0 0 24 24">
              <path d="M14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77zm-2.5 9.77l-4.5-4.5H3v6h4l4.5 4.5v-6z"/>
            </svg>
          </button>
          <button 
            @click="selectedItem = null" 
            class="p-1.5 rounded-full text-slate-400 hover:text-slate-600 active:scale-95"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>
      </div>

      <!-- 避坑指南与记忆口诀 -->
      <div class="mt-3 pt-3 border-t border-slate-100 space-y-2 text-xs">
        <div v-if="selectedItem.specialTip" class="bg-amber-50 text-amber-800 rounded-xl p-2.5 border border-amber-200/60 leading-relaxed">
          <span class="font-bold">⚠️ 避坑提醒：</span>{{ selectedItem.specialTip }}
        </div>

        <div class="flex items-start space-x-1.5">
          <span class="text-amber-500 shrink-0 mt-0.5">💡</span>
          <p class="text-slate-600 leading-snug">{{ selectedItem.mnemonic }}</p>
        </div>

        <!-- 典型例词 -->
        <div v-if="selectedItem.example.word" class="bg-slate-50 rounded-xl p-2.5 flex items-center justify-between">
          <div>
            <div class="flex items-baseline space-x-1.5">
              <span class="font-bold text-slate-800 font-japanese text-sm">{{ selectedItem.example.word }}</span>
              <span class="text-[11px] text-slate-500 font-japanese">({{ selectedItem.example.reading }})</span>
            </div>
            <p class="text-[11px] text-slate-600 mt-0.5">{{ selectedItem.example.meaning }}</p>
          </div>
          <button 
            @click="playVoice(selectedItem.example.word)"
            class="text-xs text-rose-600 font-semibold px-2.5 py-1 bg-white rounded-lg border border-slate-200 active:scale-95 shadow-xs"
          >
            发音例词 🔊
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onDeactivated, onUnmounted } from 'vue'
import { PINYIN_SEION_ROWS, HATSUON_ITEM, type KanaItem, type PinyinRowMeta } from '@/data/gojuon'
import { audio } from '@/utils/audio'
import { usePageScroll } from '@/utils/pageScroll'
import { createSequencePlayer } from '@/utils/sequencePlayback'

type DisplayMode = 'hiragana' | 'katakana' | 'both'

const displayMode = ref<DisplayMode>('hiragana')
const selectedItem = ref<KanaItem | null>(null)
const { scrollRoot } = usePageScroll()
const rowPlayer = createSequencePlayer<KanaItem>({
  playItem: item => audio.speak(item.hiragana),
  stopAudio: () => audio.stop(),
  onItem: item => { selectedItem.value = item },
  pause: () => new Promise(resolve => setTimeout(resolve, 200)),
})
onDeactivated(rowPlayer.stop)
onUnmounted(rowPlayer.stop)
watch(displayMode, rowPlayer.stop)

const modes = [
  { id: 'hiragana' as DisplayMode, name: '平假名' },
  { id: 'katakana' as DisplayMode, name: '片假名' },
]

function handleSelectKana(item: KanaItem) {
  selectedItem.value = item
  playVoice(item.hiragana)
}

function playVoice(text: string) {
  rowPlayer.stop()
  audio.speak(text)
}

// 整行连读逻辑
async function playWholeRow(row: PinyinRowMeta) {
  await rowPlayer.play(row.items.filter(item => !item.isEmpty))
}
</script>
