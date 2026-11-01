<template>
  <div class="flex flex-col h-full bg-slate-50 p-4 pb-6 overflow-y-auto space-y-4 [&>*]:shrink-0">
    <section aria-label="我的个人主页" class="profile-home-card shrink-0 overflow-hidden rounded-3xl border border-slate-100 bg-white">
      <div class="relative overflow-hidden px-5 pt-5 pb-11" :style="{ backgroundColor: profileTheme.background, color: profileTheme.accent }">
        <span class="pointer-events-none absolute -right-2 -bottom-7 select-none font-japanese text-8xl" :style="{ color: profileTheme.decoration }" aria-hidden="true">あ</span>
        <div class="relative flex items-center justify-between gap-3">
          <p class="text-xs font-semibold">我的日语手帖</p>
          <button @click="showEditProfile = true" class="min-h-11 rounded-xl border border-current bg-white/80 px-3 py-2 text-xs font-semibold">自定义主页</button>
        </div>
      </div>
      <div class="relative px-5 pb-5">
        <div class="flex min-w-0 items-end justify-between gap-3">
          <button @click="handleAvatarClick" aria-label="更换个人头像" class="-mt-7 flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full border-4 border-white bg-white text-3xl" :style="{ backgroundColor: profileTheme.background }">
            <img v-if="isImageAvatar(userProfile.avatar)" :src="userProfile.avatar" alt="头像" class="h-full w-full object-cover" />
            <span v-else>{{ userProfile.avatar || '🌸' }}</span>
          </button>
          <span class="pb-1 text-[11px] text-slate-500">本地资料 · {{ profileTheme.label }}</span>
        </div>
        <h2 class="mt-3 break-words text-xl font-bold text-slate-800">{{ userProfile.nickname }}</h2>
        <p v-if="userProfile.bio" class="mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed text-slate-600">{{ userProfile.bio }}</p>
        <button v-else @click="showEditProfile = true" class="mt-1 min-h-11 text-left text-xs text-slate-500">写一句自己的学习宣言</button>
        <p class="mt-3 text-[11px] text-slate-400">头像、昵称、简介与封面配色，只保存在当前设备</p>
        <button @click="openVoiceSettings" class="mt-3 min-h-11 w-full rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">更换朗读声音</button>
      </div>
    </section>

    <!-- 统计仪表盘 -->
    <div class="grid grid-cols-3 gap-2.5">
      <div 
        @click="showCheckIn = true"
        class="bg-white rounded-2xl p-3 shadow-xs border border-rose-100 text-center cursor-pointer active:scale-95 transition-all hover:bg-rose-50/40"
      >
        <span class="text-[10px] text-rose-500 font-semibold flex items-center justify-center space-x-0.5">
          <span>🔥 打卡</span>
          <span class="text-[9px]">➔</span>
        </span>
        <p class="text-base font-black text-rose-500 font-mono mt-0.5">{{ stats.studyStreakDays }} 天</p>
      </div>
      <div class="bg-white rounded-2xl p-3 shadow-xs border border-slate-100 text-center">
        <span class="text-[10px] text-slate-400 font-semibold">今日学词次数</span>
        <p class="text-base font-black text-indigo-600 font-mono mt-0.5">{{ stats.todayReviewCount }} 次</p>
      </div>
      <div class="bg-white rounded-2xl p-3 shadow-xs border border-slate-100 text-center">
        <span class="text-[10px] text-slate-400 font-semibold">累计学习</span>
        <p class="text-base font-black text-emerald-600 font-mono mt-0.5">{{ stats.totalLearnedWords }} 词</p>
      </div>
    </div>

    <!-- 运行模式卡片 -->
    <div class="bg-emerald-50/70 border border-emerald-100 rounded-2xl p-4 text-xs space-y-1.5">
      <div class="flex items-center space-x-1.5 text-emerald-800 font-bold">
        <span>⚡</span>
        <span>本地学习模式</span>
      </div>
      <p class="text-emerald-700/80 leading-relaxed">
        课程文字、练习及学习进度保存在本机，无需账号。朗读可选设备声音，或自行配置 Azure 联网多音色；是否联网取决于当前选择、语音引擎和语音包。
      </p>
    </div>

    <section aria-labelledby="learning-preferences-title" class="shrink-0 rounded-2xl border border-slate-100 bg-white p-4 text-xs space-y-3">
      <div class="flex items-center justify-between gap-2">
        <h3 id="learning-preferences-title" class="font-bold text-slate-800">学习偏好</h3>
        <span class="text-slate-500">当前目标 {{ learningGoal }}</span>
      </div>
      <div class="grid grid-cols-5 gap-1.5" aria-label="选择学习目标">
        <button v-for="level in learningLevels" :key="level" @click="setLearningGoal(level)" :aria-label="'学习目标 ' + level" :aria-pressed="learningGoal === level" :class="['min-h-11 rounded-xl border px-1 py-2 font-semibold transition-colors', learningGoal === level ? 'border-rose-500 bg-rose-50 text-rose-700' : 'border-slate-200 bg-white text-slate-600']">{{ level }}</button>
      </div>
      <p class="text-[11px] leading-relaxed text-slate-500">点击即可保存学习目标，各等级课程均可自由学习。</p>
    </section>

    <SpeechSettings />

    <!-- 设置选项列表 -->
    <h3 class="px-1 text-xs font-bold text-slate-600">资料与数据管理</h3>
    <div class="bg-white rounded-2xl shadow-xs border border-slate-100 overflow-hidden divide-y divide-slate-50 text-xs">
      <!-- 重置隐私协议确认 -->
      <button 
        @click="viewPrivacy"
        class="w-full px-4 py-3.5 flex items-center justify-between text-left hover:bg-slate-50 active:bg-slate-100 transition-all"
      >
        <div class="flex items-center space-x-2.5">
          <span class="text-base">📜</span>
          <span class="font-medium text-slate-700">隐私政策与本地使用选择</span>
        </div>
        <span class="text-slate-400 text-xs">➔</span>
      </button>

      <button @click="showSources = true" class="w-full px-4 py-3.5 flex items-center justify-between text-left hover:bg-slate-50 active:bg-slate-100 transition-all">
        <span class="font-medium text-slate-700">📚 词库来源与许可</span>
        <span class="text-slate-400">➔</span>
      </button>

      <!-- 编辑个人资料 (自定义头像/昵称/简介) -->
      <button 
        @click="showEditProfile = true"
        class="w-full px-4 py-3.5 flex items-center justify-between text-left hover:bg-slate-50 active:bg-slate-100 transition-all"
      >
        <div class="flex items-center space-x-2.5">
          <span class="text-base">✏️</span>
          <span class="font-medium text-slate-700">编辑头像、昵称、简介与配色</span>
        </div>
        <span class="text-slate-400 text-xs">去修改 ➔</span>
      </button>

      <!-- 重置学习进度 -->
      <button 
        @click="resetProgress"
        class="w-full px-4 py-3.5 flex items-center justify-between text-left hover:bg-slate-50 active:bg-slate-100 transition-all text-rose-600"
      >
        <div class="flex items-center space-x-2.5">
          <span class="text-base">🔄</span>
          <span class="font-medium">清除本地学习记录</span>
        </div>
        <span class="text-rose-400 text-xs">重置</span>
      </button>

      <button
        @click="resetProfile"
        class="w-full px-4 py-3.5 flex items-center justify-between text-left hover:bg-slate-50 text-slate-600"
      >
        <span>清除本地个人资料</span>
        <span class="text-[10px]">恢复默认资料与配色</span>
      </button>
    </div>

    <!-- 开发者与合规卡片 -->
    <div class="bg-white rounded-2xl p-4 shadow-xs border border-slate-100 text-xs space-y-2 text-slate-500">
      <h4 class="font-bold text-slate-700">关于应用</h4>
      <p>开发者：<strong>刘勇泽 (Zebao)</strong></p>
      <p>包名：<code class="font-mono bg-slate-100 px-1 py-0.5 rounded text-[11px]">com.zebao.nihongomate</code></p>
      <p class="text-[11px] text-slate-400">提供五十音、分级词汇、语法和模拟练习。练习题不代表官方试题；学习记录仅保存在本机；“搭子”页可单独开启在线账号、好友及自习室讨论，需要连接学习服务。当前不含广告或付费会员。</p>
    </div>

    <!-- 编辑资料弹窗 -->
    <EditProfileModal v-model="showEditProfile" @profile-updated="refreshUser" />

    <!-- 打卡弹窗 -->
    <CheckInModal v-model="showCheckIn" />

    <div v-if="showSources" class="fixed inset-0 z-[60] flex flex-col bg-white" role="dialog" aria-modal="true" aria-label="词库来源与许可">
      <div class="p-3 border-b border-slate-200"><button @click="showSources = false" class="text-sm text-rose-600 px-3 py-2">返回应用</button></div>
      <iframe src="./licenses/vocabulary.html" title="词库来源与许可" class="w-full flex-1 min-h-0 border-0"></iframe>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { audio } from '@/utils/audio'
import { studyStorage, type UserStudyStats } from '@/utils/storage'
import { authManager, type UserProfile } from '@/utils/auth'
import CheckInModal from '@/components/CheckInModal.vue'
import EditProfileModal from '@/components/EditProfileModal.vue'
import { notifyUser } from '@/utils/feedback'
import SpeechSettings from '@/components/SpeechSettings.vue'
import { getProfileTheme } from '@/utils/profileAppearance'
import { saveLearningGoal, type LearningLevel } from '@/utils/learningGoal'

const showCheckIn = ref(false)
const showEditProfile = ref(false)
const showSources = ref(false)

const stats = ref<UserStudyStats>(studyStorage.getStats())
const userProfile = ref<UserProfile>(authManager.getProfile())
const profileTheme = computed(() => getProfileTheme(userProfile.value.theme))
const learningLevels: LearningLevel[] = ['N5', 'N4', 'N3', 'N2', 'N1']
const learningGoal = ref<LearningLevel>('N5')

onMounted(() => {
  refreshUser()
  window.addEventListener('nihongomate:study-updated', refreshUser)
  window.addEventListener('nihongomate:profile-updated', refreshUser)
  window.addEventListener('nihongomate:goal-updated', refreshGoal)
  window.addEventListener('focus', refreshGoal)
})
onUnmounted(() => {
  audio.stop()
  window.removeEventListener('nihongomate:study-updated', refreshUser)
  window.removeEventListener('nihongomate:profile-updated', refreshUser)
  window.removeEventListener('nihongomate:goal-updated', refreshGoal)
  window.removeEventListener('focus', refreshGoal)
})

function isImageAvatar(avatarStr?: string): boolean {
  if (!avatarStr) return false
  return avatarStr.startsWith('data:image/')
}

function refreshUser() {
  stats.value = studyStorage.getStats()
  userProfile.value = authManager.getProfile()
  refreshGoal()
}

function refreshGoal() {
  try {
    const saved = localStorage.getItem('nihongomate_user_goal')
    learningGoal.value = learningLevels.find(level => level === saved) ?? 'N5'
  } catch { /* 存储不可用时保留当前界面值。 */ }
}

function setLearningGoal(level: LearningLevel) {
  if (level === learningGoal.value) return
  if (!saveLearningGoal(level)) {
    notifyUser('学习目标未保存，请检查设备存储后重试。', 'error')
    return
  }
  learningGoal.value = level
  window.dispatchEvent(new Event('nihongomate:goal-updated'))
  notifyUser(`学习目标已设为 JLPT ${level}。`, 'success')
}

function openVoiceSettings() {
  const section = document.getElementById('voice-personalization')
  if (!section) return
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  section.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'start' })
  section.querySelector<HTMLElement>('[data-voice-entry], select[aria-label="日语音色"]')?.focus({ preventScroll: true })
}

function handleAvatarClick() {
  showEditProfile.value = true
}

function resetProfile() {
  if (confirm('清除当前设备保存的昵称、头像、简介和封面配色？学习记录与朗读偏好将保留。')) {
    const saved = authManager.resetProfile()
    if (!saved) notifyUser('本机存储不可用，个人资料未能清除。', 'error')
    else notifyUser('本地个人资料已恢复默认，学习记录已保留。', 'success')
    refreshUser()
  }
}

function viewPrivacy() {
  window.dispatchEvent(new Event('nihongomate:show-privacy'))
}

function resetProgress() {
  if (confirm('确定清除本机的单词掌握、复习、错题和打卡等学习记录吗？此操作无法撤销，昵称和头像将保留。')) {
    const result = studyStorage.clearAllProgress()
    refreshUser()
    if (result.success) notifyUser('本地学习记录已清除，个人资料和学习目标已保留。', 'success')
    else if (result.partial) notifyUser('清除未能完整完成，部分记录可能已变更。请检查设备存储后重试。', 'error')
    else notifyUser('未能清除学习记录，原记录已保留。请检查设备存储后重试。', 'error')
  }
}
</script>
