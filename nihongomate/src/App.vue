<template>
  <div class="app-viewport">
    <div class="app-shell">
      <header class="app-header">
        <div class="app-brand">
          <span class="brand-mark" aria-hidden="true"><Flower2 :size="25" :stroke-width="1.6" /></span>
          <div class="min-w-0">
            <h1>随身日语伴侣</h1>
            <p>把日语，学进日常。</p>
          </div>
        </div>
        <div class="header-actions">
          <span class="goal-indicator" :aria-label="'当前学习目标 ' + currentGoal"><span>学习目标</span><strong>{{ currentGoal }}</strong></span>
          <button @click="showCheckInModal = true" :class="['checkin-button', { 'is-checked': isCheckedToday }]" :aria-label="isCheckedToday ? '今日已打卡，查看打卡' : '每日打卡'">
            <CalendarCheck2 :size="17" aria-hidden="true" />
            <span>{{ isCheckedToday ? '已打卡' : '每日打卡' }}</span>
          </button>
          <button @click="handleUserHeaderClick" class="profile-button" :aria-label="'打开我的资料：' + userProfile.nickname" :title="'本地资料：' + userProfile.nickname">
            <img v-if="isImageAvatar(userProfile.avatar)" :src="userProfile.avatar" alt="" class="w-full h-full object-cover" />
            <span v-else>{{ userProfile.avatar || '🌸' }}</span>
          </button>
        </div>
      </header>

      <ToastHost class="app-feedback" />

      <main id="learning-main" class="app-main" :aria-label="navItems.find(item => item.id === activeTab)?.label">
        <KeepAlive :key="learningCacheVersion" :include="cachedPages" :max="4">
          <component :is="activeComponent" :key="activeTab" />
        </KeepAlive>
      </main>

      <nav aria-label="主导航" class="app-navigation">
        <div class="nav-caption">我的学习</div>
        <button v-for="nav in navItems" :key="nav.id" @click="switchTab(nav.id)" :aria-current="activeTab === nav.id ? 'page' : undefined" :class="['nav-item', { 'is-active': activeTab === nav.id }]">
          <span class="nav-icon"><component :is="nav.icon" :size="21" :stroke-width="activeTab === nav.id ? 2.2 : 1.7" aria-hidden="true" /></span>
          <span>{{ nav.label }}</span>
          <span v-if="activeTab === nav.id" class="nav-active-dot" aria-hidden="true"></span>
        </button>
        <div class="nav-note"><Flower2 :size="20" :stroke-width="1.4" aria-hidden="true" /><p>一词一句，<br />都是进步。</p><span>学习记录保存在本机</span></div>
      </nav>
      <CheckInModal v-model="showCheckInModal" />
      <PrivacyModal />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { Flower2, CalendarCheck2, BookOpen, Headphones, ScanLine, ListChecks, UserRound, UsersRound } from 'lucide-vue-next'
import GojuonBoard from '@/components/GojuonBoard.vue'
import CurriculumView from '@/components/CurriculumView.vue'
import ListeningLab from '@/components/ListeningLab.vue'
import ExamPracticeView from '@/components/ExamPracticeView.vue'
import SettingsView from '@/components/SettingsView.vue'
import SocialView from '@/components/SocialView.vue'
import PrivacyModal from '@/components/PrivacyModal.vue'
import CheckInModal from '@/components/CheckInModal.vue'
import ToastHost from '@/components/ToastHost.vue'
import { studyStorage, PROGRESS_RESET_EVENT } from '@/utils/storage'
import { authManager, type UserProfile } from '@/utils/auth'
import { audio } from '@/utils/audio'

type TabType = 'gojuon' | 'curriculum' | 'listening' | 'quiz' | 'social' | 'settings'

const activeTab = ref<TabType>('curriculum')
const pageComponents = { gojuon: GojuonBoard, curriculum: CurriculumView, listening: ListeningLab, quiz: ExamPracticeView, social: SocialView, settings: SettingsView }
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
  { id: 'gojuon' as TabType, label: '五十音', icon: ScanLine },
  { id: 'curriculum' as TabType, label: '分级学习', icon: BookOpen },
  { id: 'listening' as TabType, label: '情景对话', icon: Headphones },
  { id: 'quiz' as TabType, label: '模拟练习', icon: ListChecks },
  { id: 'social' as TabType, label: '搭子', icon: UsersRound },
  { id: 'settings' as TabType, label: '我的', icon: UserRound },
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
