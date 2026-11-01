<template>
  <div class="flex flex-col h-full bg-slate-50 p-4 pb-6 overflow-y-auto space-y-4">
    <!-- 头部用户个人中心卡片 (支持自定义头像、昵称、简介与状态切换) -->
    <div 
      class="bg-white rounded-3xl p-5 shadow-xs border border-slate-100 space-y-3"
    >
      <div class="flex items-center justify-between">
        <div class="flex items-center space-x-3.5">
          <!-- 用户圆形头像 (支持自定义上传图片与萌系预设) -->
          <div 
            @click="handleAvatarClick"
            class="w-14 h-14 rounded-full border-2 border-rose-200 overflow-hidden bg-rose-50 text-white flex items-center justify-center text-3xl shadow-md shadow-rose-100 shrink-0 cursor-pointer active:scale-95 transition-all relative"
            title="点击更换头像"
          >
            <img 
              v-if="isImageAvatar(userProfile.avatar)" 
              :src="userProfile.avatar" 
              alt="头像" 
              class="w-full h-full object-cover"
            />
            <span v-else class="select-none text-2xl">{{ userProfile.avatar || '🌸' }}</span>
          </div>

          <div>
            <div class="flex items-center space-x-2">
              <h2 class="text-sm font-black text-slate-800">{{ userProfile.nickname }}</h2>
              <span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">本地资料</span>
            </div>
            <p class="text-[11px] text-slate-500 mt-0.5">无需注册，仅保存在当前设备</p>
          </div>
        </div>

        <!-- 编辑资料按钮 -->
        <button 
          @click="showEditProfile = true"
          class="px-2.5 py-1.5 rounded-xl bg-slate-50 hover:bg-rose-50 text-slate-600 hover:text-rose-600 border border-slate-200 text-xs font-bold transition-all active:scale-95 flex items-center space-x-1 shrink-0"
        >
          <span>✏️</span>
          <span>编辑</span>
        </button>
      </div>

      <!-- 个人简介展示条 -->
      <div 
        @click="showEditProfile = true"
        class="bg-slate-50 hover:bg-rose-50/50 p-2.5 rounded-2xl border border-slate-100 text-xs text-slate-600 flex items-center justify-between cursor-pointer transition-all"
      >
        <div class="flex items-center space-x-1.5 truncate pr-2">
          <span class="text-rose-400">💬</span>
          <span class="truncate italic">{{ userProfile.bio || '写下一句你的日语学习座右铭吧~' }}</span>
        </div>
        <span class="text-[10px] text-slate-400 shrink-0">修改</span>
      </div>
    </div>

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
        课程文字、练习及学习进度保存在本机，无需账号。朗读使用设备提供的日语语音合成服务，是否需要联网取决于语音引擎和语音包。
      </p>
    </div>

    <SpeechSettings />

    <!-- 设置选项列表 -->
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
          <span class="font-medium text-slate-700">编辑个人资料 (头像/昵称/简介)</span>
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
        <span class="text-[10px]">恢复默认头像与昵称</span>
      </button>
    </div>

    <!-- 开发者与合规卡片 -->
    <div class="bg-white rounded-2xl p-4 shadow-xs border border-slate-100 text-xs space-y-2 text-slate-500">
      <h4 class="font-bold text-slate-700">关于应用</h4>
      <p>开发者：<strong>刘勇泽 (Zebao)</strong></p>
      <p>包名：<code class="font-mono bg-slate-100 px-1 py-0.5 rounded text-[11px]">com.zebao.nihongomate</code></p>
      <p class="text-[11px] text-slate-400">提供五十音、分级词汇、语法和模拟练习。练习题不代表官方试题；当前版本不提供在线账号、云同步、广告或付费会员。</p>
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
import { ref, onMounted, onUnmounted } from 'vue'
import { audio } from '@/utils/audio'
import { studyStorage, type UserStudyStats } from '@/utils/storage'
import { authManager, type UserProfile } from '@/utils/auth'
import CheckInModal from '@/components/CheckInModal.vue'
import EditProfileModal from '@/components/EditProfileModal.vue'
import { notifyUser } from '@/utils/feedback'
import SpeechSettings from '@/components/SpeechSettings.vue'

const showCheckIn = ref(false)
const showEditProfile = ref(false)
const showSources = ref(false)

const stats = ref<UserStudyStats>(studyStorage.getStats())
const userProfile = ref<UserProfile>(authManager.getProfile())

onMounted(() => {
  refreshUser()
  window.addEventListener('nihongomate:study-updated', refreshUser)
  window.addEventListener('nihongomate:profile-updated', refreshUser)
})
onUnmounted(() => {
  audio.stop()
  window.removeEventListener('nihongomate:study-updated', refreshUser)
  window.removeEventListener('nihongomate:profile-updated', refreshUser)
})

function isImageAvatar(avatarStr?: string): boolean {
  if (!avatarStr) return false
  return avatarStr.startsWith('data:image/')
}

function refreshUser() {
  stats.value = studyStorage.getStats()
  userProfile.value = authManager.getProfile()
}

function handleAvatarClick() {
  showEditProfile.value = true
}

function resetProfile() {
  if (confirm('清除当前设备保存的昵称、头像和简介？学习记录将保留。')) {
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
