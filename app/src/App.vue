<template>
  <div class="app-viewport flex justify-center bg-slate-900">
    <!-- 移动端外壳容器 (手机尺寸适配，最大宽度 440px 居中) -->
    <div class="w-full max-w-md bg-slate-50 h-full min-h-0 flex flex-col relative shadow-2xl overflow-hidden border-x border-slate-800/40">
      
      <!-- 顶部系统栏与标题 -->
      <header class="app-header bg-white border-b border-slate-100 px-4 pt-3 pb-2.5 flex items-center justify-between gap-2 shrink-0">
        <div class="flex items-center space-x-2 min-w-0">
          <span class="text-xl">🌸</span>
          <div class="min-w-0">
            <h1 class="text-sm font-black text-slate-800 tracking-tight">随身日语伴侣</h1>
            <p class="text-[10px] text-slate-400 font-medium truncate">五十音入门 · 分级练习 · 情景对话</p>
          </div>
        </div>

        <!-- 右侧打卡与目标操作区 -->
        <div class="flex items-center space-x-1.5 shrink-0">
          <!-- 每日打卡激励按钮 -->
          <button 
            @click="showCheckInModal = true"
            :class="[
              'flex items-center space-x-1 px-2.5 py-1 rounded-full text-[11px] font-bold transition-all active:scale-95 border shadow-2xs',
              isCheckedToday 
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                : 'bg-gradient-to-r from-rose-500 to-pink-500 text-white border-transparent animate-pulse'
            ]"
            title="点击每日打卡"
          >
            <span>{{ isCheckedToday ? '🌸 已打卡' : '✨ 打卡' }}</span>
          </button>

          <!-- 当前学习目标气泡 -->
          <div class="flex items-center space-x-1 bg-slate-100 text-slate-700 px-2 py-1 rounded-full text-[11px] font-bold border border-slate-200/60">
            <span class="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
            <span>{{ currentGoal }}</span>
          </div>

          <!-- 本地个人资料快捷入口 -->
          <button 
            @click="handleUserHeaderClick"
            class="w-10 h-10 rounded-full bg-rose-50 hover:bg-rose-100 border border-rose-200 flex items-center justify-center text-sm active:scale-95 transition-all shadow-2xs shrink-0 overflow-hidden"
            :title="'本地资料：' + userProfile.nickname"
          >
            <img 
              v-if="isImageAvatar(userProfile.avatar)" 
              :src="userProfile.avatar" 
              alt="头像" 
              class="w-full h-full object-cover"
            />
            <span v-else>{{ userProfile.avatar || '👤' }}</span>
          </button>
        </div>
      </header>

      <ToastHost />

      <!-- 核心页面视图切换 -->
      <main class="flex-1 min-h-0 overflow-hidden relative">
        <KeepAlive :key="learningCacheVersion" :include="cachedPages" :max="4">
          <component :is="activeComponent" :key="activeTab" />
        </KeepAlive>
      </main>

      <!-- 底部经典移动端 5 项导航栏 -->
      <nav aria-label="主导航" class="app-navigation shrink-0 w-full bg-white/95 backdrop-blur-md border-t border-slate-200/80 px-1 py-1.5 flex items-center justify-around z-40 shadow-lg">
        <button 
          v-for="nav in navItems" 
          :key="nav.id"
          @click="switchTab(nav.id)"
          :aria-current="activeTab === nav.id ? 'page' : undefined"
          :class="[
            'min-h-11 flex-1 min-w-0 flex flex-col items-center justify-center py-1 px-1 rounded-xl transition-all active:scale-92',
            activeTab === nav.id ? 'text-rose-500 font-bold' : 'text-slate-400 font-medium hover:text-slate-600'
          ]"
        >
          <span class="text-base leading-none mb-1">{{ nav.icon }}</span>
          <span class="text-[10px]">{{ nav.label }}</span>
        </button>
      </nav>

      <!-- 每日打卡激励弹窗 -->
      <CheckInModal v-model="showCheckInModal" />

      <!-- 开屏合规隐私政策弹窗 -->
      <PrivacyModal />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue'
import GojuonBoard from '@/components/GojuonBoard.vue'
import CurriculumView from '@/components/CurriculumView.vue'
import ListeningLab from '@/components/ListeningLab.vue'
import ExamPracticeView from '@/components/ExamPracticeView.vue'
import SettingsView from '@/components/SettingsView.vue'
import PrivacyModal from '@/components/PrivacyModal.vue'
import CheckInModal from '@/components/CheckInModal.vue'
import ToastHost from '@/components/ToastHost.vue'
import { studyStorage, PROGRESS_RESET_EVENT } from '@/utils/storage'
import { authManager, type UserProfile } from '@/utils/auth'
import { audio } from '@/utils/audio'

type TabType = 'gojuon' | 'curriculum' | 'listening' | 'quiz' | 'settings'

const activeTab = ref<TabType>('curriculum')
const pageComponents = { gojuon: GojuonBoard, curriculum: CurriculumView, listening: ListeningLab, quiz: ExamPracticeView, settings: SettingsView }
const activeComponent = computed(() => pageComponents[activeTab.value])
const cachedPages = ['GojuonBoard', 'CurriculumView', 'ListeningLab', 'ExamPracticeView']
const learningCacheVersion = ref(0)
const currentGoal = ref('N5')
const showCheckInModal = ref(false)
const userProfile = ref<UserProfile>(authManager.getProfile())

const isCheckedToday = ref(studyStorage.isTodayCheckedIn())

function isImageAvatar(avatarStr?: string): boolean {
  if (!avatarStr) return false
  return avatarStr.startsWith('data:image/')
}

function refreshLocalState() {
  userProfile.value = authManager.getProfile()
  isCheckedToday.value = studyStorage.isTodayCheckedIn()
  currentGoal.value = localStorage.getItem('nihongomate_user_goal') || 'N5'
}

function handleUserHeaderClick() {
  switchTab('settings')
}

function switchTab(tab: TabType) {
  if (activeTab.value === tab) return
  audio.stop()
  activeTab.value = tab
}

function invalidateLearningPages() {
  audio.stop()
  learningCacheVersion.value += 1
  refreshLocalState()
}

const navItems = [
  { id: 'gojuon' as TabType, label: '拼音50音', icon: '🈂️' },
  { id: 'curriculum' as TabType, label: '分级学习', icon: '📖' },
  { id: 'listening' as TabType, label: '情景对话', icon: '🎧' },
  { id: 'quiz' as TabType, label: '模拟练习', icon: '🎯' },
  { id: 'settings' as TabType, label: '设置', icon: '⚙️' },
]

const stateEvents = ['nihongomate:study-updated', 'nihongomate:goal-updated', 'nihongomate:profile-updated', 'focus']
onMounted(() => {
  refreshLocalState()
  stateEvents.forEach(event => window.addEventListener(event, refreshLocalState))
  window.addEventListener(PROGRESS_RESET_EVENT, invalidateLearningPages)
})
onUnmounted(() => {
  stateEvents.forEach(event => window.removeEventListener(event, refreshLocalState))
  window.removeEventListener(PROGRESS_RESET_EVENT, invalidateLearningPages)
})
</script>
