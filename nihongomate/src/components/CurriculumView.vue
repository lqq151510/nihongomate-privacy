<template>
  <div ref="scrollRoot" class="flex flex-col h-full min-h-0 bg-slate-50 pb-6 overflow-y-auto">
    <div class="learning-toolbar sticky top-0 z-20">
      <div class="learning-toolbar-heading">
        <h2>分级学习 <span>一步一步，学得扎实</span></h2>
        <button @click="setAsUserGoal" :class="['set-goal-button', { 'is-current': userGoal === activeLevel.level }]" :aria-label="userGoal === activeLevel.level ? activeLevel.level + '已设为学习目标' : '将' + activeLevel.level + '设为学习目标'">
          <Check v-if="userGoal === activeLevel.level" :size="14" aria-hidden="true" />
          <Target v-else :size="14" aria-hidden="true" />
          {{ userGoal === activeLevel.level ? '当前目标' : '设为目标' }}
        </button>
      </div>
      <div class="level-selector" aria-label="选择学习等级">
        <button v-for="lvl in JLPT_CURRICULUM" :key="lvl.level" @click="selectLevel(lvl.level)" :aria-pressed="activeLevel.level === lvl.level" :class="['level-option', { 'is-selected': activeLevel.level === lvl.level }]">
          <strong>{{ lvl.level }}</strong><span>{{ lvl.badge }}</span>
        </button>
      </div>
      <div class="study-tabs" aria-label="学习内容">
        <button v-for="sub in subTabs" :key="sub.id" @click="currentSubTab = sub.id" :aria-pressed="currentSubTab === sub.id" :class="['study-tab', { 'is-selected': currentSubTab === sub.id }]">
          <component :is="sub.icon" :size="16" aria-hidden="true" /><span>{{ sub.name }}</span>
        </button>
      </div>
    </div>

    <div v-if="currentSubTab === 'course'" class="learning-welcome">
      <div>
        <p class="welcome-eyebrow">JLPT {{ activeLevel.level }} · {{ activeLevel.badge }}</p>
        <h3>今天，也向日语靠近一点。</h3>
        <p class="welcome-description">从一个单元开始，把词句用进生活。</p>
      </div>
      <span class="welcome-kana font-japanese" lang="ja" aria-hidden="true">あ</span>
    </div>
    <p class="learning-inventory">{{ activeLevel.level }} 学习内容 <span>·</span> {{ levelWords.length.toLocaleString() }} 个词 <span>·</span> {{ grammarCount }} 个语法点 <span>·</span> {{ activeLevel.level === 'N5' ? 12 : GRADED_COURSES[activeLevel.level].length }} 个单元</p>

    <N5CourseView v-show="currentSubTab === 'course' && activeLevel.level === 'N5'" :active="pageActive && currentSubTab === 'course' && activeLevel.level === 'N5'" />
    <GradedCourseView v-if="activeLevel.level !== 'N5'" v-show="currentSubTab === 'course'" :level="activeLevel.level" :active="pageActive && currentSubTab === 'course'" />
    <AdvancedPracticeView v-if="activeLevel.level === 'N2' || activeLevel.level === 'N1'" v-show="currentSubTab === 'advanced'" :level="activeLevel.level" :active="pageActive && currentSubTab === 'advanced'" />

    <!-- 子模块 1: 闪卡背词器 -->
    <div v-if="currentSubTab === 'flashcards'" class="flex-1">
      <VocabFlashcard :level="activeLevel.level" />
    </div>

    <!-- 子模块 2: 核心语法课 -->
    <div v-else-if="currentSubTab === 'grammar'" class="p-4 space-y-4">
      <div :class="['rounded-3xl p-5 text-white shadow-lg bg-gradient-to-br', activeLevel.colorTheme]">
        <div class="flex items-start justify-between">
          <div>
            <span class="text-xs uppercase tracking-widest font-mono font-bold bg-white/20 px-2.5 py-0.5 rounded-full">
              JLPT {{ activeLevel.level }}
            </span>
            <h3 class="text-lg font-black mt-1.5">{{ activeLevel.title }}</h3>
          </div>
        </div>
        <p class="text-xs text-white/80 mt-2 leading-relaxed">
          {{ activeLevel.levelDesc }}
        </p>
      </div>

      <div v-if="levelLessons.length" class="rounded-2xl border border-emerald-100 bg-white p-3 text-xs leading-relaxed">
        <p class="font-bold text-emerald-800">{{ activeLevel.level }} 互动微课 · {{ levelLessons.length }} 课 / {{ lessonQuestionCount }} 道随堂题</p>
        <p class="mt-1 text-slate-600">看讲解 → 独立作答 → 看错因 → 换场景练习 → 自己造句。</p>
        <p class="mt-1 text-[11px] text-slate-500">本机已有完整练习记录 {{ completedLessonCount }}/{{ levelLessons.length }} 课。记录完成练习，不代表已经掌握；各课均可直接免费学习。</p>
      </div>

      <div class="space-y-3">
        <h4 class="text-xs font-bold text-slate-400 uppercase tracking-wider px-1">句型讲解与示例</h4>
        <input v-model="grammarQuery" type="search" aria-label="搜索本级语法" placeholder="搜索句型、中文含义或接续方式" class="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs focus:ring-2 focus:ring-rose-400" />
        <p v-if="visibleChapters.length === 0" class="py-4 text-center text-xs text-slate-500">本级没有匹配的语法，试试其他关键词或切换等级。</p>

        <div 
          v-for="chapter in visibleChapters"
          :key="chapter.id"
          class="bg-white rounded-2xl p-4 shadow-xs border border-slate-100 space-y-3"
        >
          <div class="flex items-center justify-between border-b border-slate-50 pb-2">
            <h5 class="text-xs font-bold text-slate-800">第 {{ chapter.chapterNum }} 单元 · {{ chapter.title }}</h5>
            <span class="text-[10px] text-slate-400 font-mono">{{ chapter.grammars.length }} 个语法点</span>
          </div>

          <div class="space-y-3">
            <div 
              v-for="gm in chapter.grammars" 
              :key="gm.id"
              class="bg-slate-50/80 rounded-xl p-3 border border-slate-100 space-y-2 text-xs"
            >
              <div class="flex flex-wrap items-baseline justify-between gap-1">
                <span class="font-bold text-rose-600 font-japanese text-sm">{{ gm.pattern }}</span>
                <span class="font-bold text-slate-700">{{ gm.meaning }}</span>
              </div>

              <div class="bg-white rounded-lg p-2 border border-slate-100 text-[11px] text-slate-500 font-mono">
                <span class="font-bold text-slate-700">接续：</span>{{ gm.connection }}
              </div>

              <div class="bg-rose-50/70 rounded-lg p-2.5 text-slate-700 leading-relaxed border border-rose-100/50">
                {{ gm.aiExplanation }}
              </div>

              <div v-for="(example, exampleIndex) in [gm.exampleSentence, ...(gm.extraExamples ?? [])]" :key="exampleIndex" class="flex items-center justify-between gap-2 bg-white rounded-lg p-2.5 border border-slate-100">
                <div>
                  <p class="font-japanese text-xs font-bold text-slate-800">{{ example.japanese }}</p>
                  <p class="text-[10px] text-slate-400 font-japanese mt-0.5">{{ example.furigana }}</p>
                  <p class="text-[11px] text-slate-600 mt-1">{{ example.chinese }}</p>
                </div>
                <button 
                  @click="playVoice(example.furigana)"
                  :aria-label="`朗读例句：${example.japanese}`"
                  class="p-2 rounded-xl text-rose-500 bg-rose-50 active:scale-95"
                >
                  🔊
                </button>
              </div>
              <GrammarLesson
                v-if="GRAMMAR_LESSONS[gm.id] && grammarStates[gm.id]"
                :lesson="GRAMMAR_LESSONS[gm.id]"
                :state="grammarStates[gm.id]"
                :saved-result="grammarResults[gm.id]"
                @update:state="grammarStates[gm.id] = $event"
              />
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 子模块 3: 分级词汇全表 (可搜索与词性筛选) -->
    <div v-else-if="currentSubTab === 'vocabList'" class="p-4 space-y-3">
      <!-- 搜索框 -->
      <div class="relative">
        <input 
          v-model="searchQuery" 
          type="search"
          aria-label="搜索词汇"
          placeholder="汉字、假名、中文或罗马音；可空格分词"
          class="w-full bg-white border border-slate-200 rounded-2xl pl-4 pr-12 py-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-400 shadow-xs"
        />
        <button v-if="searchQuery" @click="searchQuery = ''" aria-label="清空搜索" class="absolute right-2 top-1.5 h-7 w-8 rounded-lg text-xs text-slate-500 hover:bg-slate-100">✕</button>
        <span v-else class="absolute right-3.5 top-2.5 text-slate-400 text-xs" aria-hidden="true">🔍</span>
      </div>

      <div class="grid grid-cols-2 gap-2 text-[11px]">
        <label class="space-y-1 min-w-0">
          <span class="text-slate-500">查询范围</span>
          <select v-model="searchScope" aria-label="查询范围" class="w-full rounded-xl border border-slate-200 bg-white px-2 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-rose-400">
            <option value="current">当前等级 {{ activeLevel.level }}</option>
            <option value="all">全部等级 N5–N1</option>
          </select>
        </label>
        <label class="space-y-1 min-w-0">
          <span class="text-slate-500">学习状态</span>
          <select v-model="selectedStudyState" aria-label="学习状态" class="w-full rounded-xl border border-slate-200 bg-white px-2 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-rose-400">
            <option value="all">全部状态</option>
            <option value="unlearned">未学</option>
            <option value="due">到期复习</option>
            <option value="mastered">已掌握</option>
          </select>
        </label>
      </div>
      <p v-if="searchScope === 'all'" class="text-[10px] text-slate-500">正在查询全部等级；学习目标仍为 {{ userGoal }}。</p>

      <!-- 词性分类过滤条 -->
      <div class="flex space-x-1.5 overflow-x-auto no-scrollbar py-0.5 text-[11px]">
        <button 
          v-for="pos in posOptions" 
          :key="pos"
          @click="selectedPos = pos"
          :aria-pressed="selectedPos === pos"
          :class="[
            'px-2.5 py-1 rounded-xl font-bold shrink-0 transition-all',
            selectedPos === pos ? 'bg-slate-800 text-white' : 'bg-white text-slate-600 border border-slate-200'
          ]"
        >
          {{ pos }}
        </button>
      </div>

      <div class="flex items-center justify-between gap-2">
        <p class="text-[11px] text-slate-500" role="status">{{ searchScope === 'all' ? '全部等级' : activeLevel.level }} · 找到 {{ filteredWords.length }} / {{ scopedWordCount }} 个词</p>
        <button @click="clearFilters" :disabled="!hasFilters" class="shrink-0 rounded-lg px-2 py-1 text-[11px] font-bold text-rose-600 disabled:text-slate-300 disabled:cursor-default">清除条件</button>
      </div>
      <p v-if="filteredWords.length === 0" class="text-xs text-slate-500 py-6 text-center">没有符合当前条件的词。试试其他关键词，或清除条件查看本级词库。</p>
      <div class="space-y-2.5">
        <div
          v-for="word in visibleWords"
          :key="word.id"
          class="bg-white rounded-2xl p-3.5 shadow-xs border border-slate-100 flex items-start justify-between space-x-2"
        >
          <div class="space-y-1 flex-1 min-w-0">
            <div class="flex items-center space-x-2 flex-wrap gap-y-1">
              <span v-if="searchScope === 'all'" class="text-[9px] bg-rose-50 text-rose-600 px-1.5 py-0.5 rounded font-bold">{{ word.level }}</span>
              <span class="font-bold text-base text-slate-800 font-japanese">{{ word.kanji }}</span>
              <span class="text-xs text-rose-500 font-japanese font-bold">{{ word.reading }}</span>
              <span class="text-[10px] text-slate-400 font-mono">({{ word.romaji }})</span>
              <span class="text-[9px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-mono">{{ word.partOfSpeech }}</span>
              <span v-if="word.examTag" class="text-[9px] bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded font-bold border border-amber-200">
                {{ word.examTag }}
              </span>
            </div>

            <span :class="['inline-block rounded px-1.5 py-0.5 text-[10px] font-medium', isVocabDue(studyRecords[word.id], snapshotTime) ? 'bg-amber-50 text-amber-700' : studyRecords[word.id]?.status === 'mastered' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500']">
              {{ getVocabStudyLabel(studyRecords[word.id], snapshotTime) }}
            </span>

            <p class="text-xs text-slate-700 font-medium">{{ word.meaning }}</p>

            <p v-if="word.collocation" class="text-[11px] text-amber-800 bg-amber-50/60 px-2 py-0.5 rounded-md inline-block font-medium">
              搭配：{{ word.collocation }}
            </p>

            <p v-if="word.example" class="text-[10px] text-slate-400 font-japanese mt-0.5">
              {{ word.example.japanese }} - {{ word.example.chinese }}
            </p>
          </div>

          <button 
            @click="playVoice(word.reading)"
            class="w-9 h-9 rounded-xl bg-rose-50 text-rose-500 flex items-center justify-center active:scale-95 transition-all shrink-0 ml-1 mt-0.5"
            title="朗读单词"
          >
            🔊
          </button>
        </div>
      </div>
      <button v-if="visibleWords.length < filteredWords.length" @click="visibleWordLimit += 50" class="min-h-11 w-full rounded-xl border border-rose-200 bg-white text-xs font-bold text-rose-600">再显示 50 个词 · 已显示 {{ visibleWords.length }}/{{ filteredWords.length }}</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onActivated, onDeactivated, onMounted, onUnmounted, watch } from 'vue'
import { Check, Target, BookOpen, Layers, Library, Languages, FileText } from 'lucide-vue-next'
import { JLPT_CURRICULUM, type LevelCurriculum } from '@/data/curriculum'
import { COMPREHENSIVE_VOCAB } from '@/data/vocab'
import { audio } from '@/utils/audio'
import { studyStorage, STUDY_UPDATED_EVENT, type WordStudyRecord } from '@/utils/storage'
import { filterVocabulary, getVocabStudyLabel, isVocabDue, VOCAB_POS_OPTIONS, type VocabPartOfSpeech, type VocabStudyFilter } from '@/utils/vocabFilter'
import VocabFlashcard from '@/components/VocabFlashcard.vue'
import { usePageScroll } from '@/utils/pageScroll'
import { saveLearningGoal } from '@/utils/learningGoal'
import { notifyUser } from '@/utils/feedback'
import GrammarLesson from '@/components/GrammarLesson.vue'
import { GRAMMAR_LESSONS } from '@/data/grammarLessons'
import { createGrammarLearningState, type GrammarLearningState } from '@/utils/grammarSession'
import { getGrammarLessonResults, GRAMMAR_PROGRESS_UPDATED_EVENT } from '@/utils/grammarProgress'
import N5CourseView from '@/components/N5CourseView.vue'
import GradedCourseView from '@/components/GradedCourseView.vue'
import { GRADED_COURSES } from '@/data/gradedCourses'
import AdvancedPracticeView from '@/components/AdvancedPracticeView.vue'

type SubTab = 'course' | 'advanced' | 'flashcards' | 'grammar' | 'vocabList'

const currentSubTab = ref<SubTab>('course')
const activeLevel = ref<LevelCurriculum>(JLPT_CURRICULUM[0])
const userGoal = ref('N5')
const searchQuery = ref('')
const grammarQuery = ref('')
const visibleWordLimit = ref(50)
const selectedPos = ref<VocabPartOfSpeech>('全部词性')
const searchScope = ref<'current' | 'all'>('current')
const selectedStudyState = ref<VocabStudyFilter>('all')
const studyRecords = ref<Record<string, WordStudyRecord>>({})
// Parent-owned state survives grammar subtab and level switches as well as KeepAlive navigation.
const grammarStates = ref<Record<string, GrammarLearningState>>(Object.fromEntries(Object.keys(GRAMMAR_LESSONS).map(id => [id, createGrammarLearningState()])))
const grammarResults = ref(getGrammarLessonResults())
const snapshotTime = ref(Date.now())
const posOptions = VOCAB_POS_OPTIONS
const { scrollRoot } = usePageScroll()
const pageActive = ref(true)

function refreshUserGoal() {
  try {
    const saved = localStorage.getItem('nihongomate_user_goal')
    userGoal.value = JLPT_CURRICULUM.find(level => level.level === saved)?.level ?? 'N5'
  } catch { /* 存储受限时保留最近一次已知目标。 */ }
}

function refreshStudyState() {
  if (!pageActive.value) return
  studyRecords.value = studyStorage.getAllRecords() || {}
  grammarResults.value = getGrammarLessonResults()
  snapshotTime.value = Date.now()
}

function onVisibilityChange() {
  if (document.visibilityState === 'visible') refreshStudyState()
}

const subTabs = computed(() => [
  { id: 'course' as SubTab, name: '系统课', icon: BookOpen },
  ...(activeLevel.value.level === 'N2' || activeLevel.value.level === 'N1' ? [{ id: 'advanced' as SubTab, name: '篇章', icon: FileText }] : []),
  { id: 'flashcards' as SubTab, name: '背单词', icon: Layers },
  { id: 'grammar' as SubTab, name: '语法', icon: Languages },
  { id: 'vocabList' as SubTab, name: '词库', icon: Library },
])

onMounted(() => {
  refreshStudyState()
  window.addEventListener(STUDY_UPDATED_EVENT, refreshStudyState)
  window.addEventListener(GRAMMAR_PROGRESS_UPDATED_EVENT, refreshStudyState)
  window.addEventListener('nihongomate:goal-updated', refreshUserGoal)
  window.addEventListener('focus', refreshStudyState)
  document.addEventListener('visibilitychange', onVisibilityChange)
  refreshUserGoal()
  const initialLevel = JLPT_CURRICULUM.find(level => level.level === userGoal.value)
  if (initialLevel) activeLevel.value = initialLevel
})

onUnmounted(() => {
  if (pageActive.value) audio.stop()
  window.removeEventListener(STUDY_UPDATED_EVENT, refreshStudyState)
  window.removeEventListener(GRAMMAR_PROGRESS_UPDATED_EVENT, refreshStudyState)
  window.removeEventListener('nihongomate:goal-updated', refreshUserGoal)
  window.removeEventListener('focus', refreshStudyState)
  document.removeEventListener('visibilitychange', onVisibilityChange)
})

onActivated(() => {
  pageActive.value = true
  refreshUserGoal()
  refreshStudyState()
})
onDeactivated(() => { pageActive.value = false; audio.stop() })

watch(currentSubTab, tab => {
  audio.stop()
  if (tab === 'vocabList') refreshStudyState()
})

const levelWords = computed(() => {
  return COMPREHENSIVE_VOCAB.filter(w => w.level === activeLevel.value.level)
})

const grammarCount = computed(() => activeLevel.value.chapters.reduce((count, chapter) => count + chapter.grammars.length, 0))
const visibleChapters = computed(() => {
  const query = grammarQuery.value.normalize('NFKC').toLowerCase().trim()
  if (!query) return activeLevel.value.chapters
  return activeLevel.value.chapters.map(chapter => ({
    ...chapter,
    grammars: chapter.grammars.filter(grammar => [grammar.pattern, grammar.meaning, grammar.connection].join(' ').normalize('NFKC').toLowerCase().includes(query)),
  })).filter(chapter => chapter.grammars.length > 0)
})
const levelLessons = computed(() => activeLevel.value.chapters.flatMap(chapter => chapter.grammars).map(grammar => GRAMMAR_LESSONS[grammar.id]).filter(Boolean))
const lessonQuestionCount = computed(() => levelLessons.value.reduce((count, lesson) => count + lesson.questions.length, 0))
const completedLessonCount = computed(() => levelLessons.value.filter(lesson => grammarResults.value[lesson.grammarId]).length)

const scopedWordCount = computed(() => searchScope.value === 'all' ? COMPREHENSIVE_VOCAB.length : levelWords.value.length)
const hasFilters = computed(() => Boolean(searchQuery.value) || selectedPos.value !== '全部词性' || selectedStudyState.value !== 'all' || searchScope.value !== 'current')
const filteredWords = computed(() => filterVocabulary(COMPREHENSIVE_VOCAB, {
  level: searchScope.value === 'all' ? 'all' : activeLevel.value.level,
  query: searchQuery.value,
  partOfSpeech: selectedPos.value,
  studyState: selectedStudyState.value,
  records: studyRecords.value,
  now: snapshotTime.value,
}))
const visibleWords = computed(() => filteredWords.value.slice(0, visibleWordLimit.value))
watch([searchQuery, searchScope, selectedPos, selectedStudyState, () => activeLevel.value.level], () => { visibleWordLimit.value = 50 })

function clearFilters() {
  searchQuery.value = ''
  selectedPos.value = '全部词性'
  selectedStudyState.value = 'all'
  searchScope.value = 'current'
  refreshStudyState()
}

function selectLevel(level: 'N5' | 'N4' | 'N3' | 'N2' | 'N1') {
  const found = JLPT_CURRICULUM.find(l => l.level === level)
  if (found) {
    activeLevel.value = found
    if (level !== 'N2' && level !== 'N1' && currentSubTab.value === 'advanced') currentSubTab.value = 'course'
  }
}

function setAsUserGoal() {
  if (!saveLearningGoal(activeLevel.value.level)) {
    notifyUser('学习目标未保存，请检查设备存储后重试。', 'error')
    return
  }
  userGoal.value = activeLevel.value.level
  window.dispatchEvent(new Event('nihongomate:goal-updated'))
  notifyUser(`学习目标已设为 JLPT ${activeLevel.value.level}。`, 'success')
}

function playVoice(text: string) {
  audio.speak(text)
}
</script>
