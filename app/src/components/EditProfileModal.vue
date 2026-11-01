<template>
  <div v-if="isOpen" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in" role="dialog" aria-modal="true" aria-labelledby="profile-title" @keydown.esc="closeModal">
    <!-- 编辑资料卡片 -->
    <div class="profile-card w-full max-w-sm bg-white rounded-3xl overflow-hidden shadow-2xl border border-rose-100 flex flex-col relative animate-in zoom-in-95 duration-200">
      
      <!-- 右上角关闭按钮 -->
      <button 
        @click="closeModal" 
        aria-label="关闭个人资料编辑"
        class="absolute top-4 right-4 w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center text-xs transition-all z-10"
      >
        ✕
      </button>

      <!-- 顶部标题栏 -->
      <div class="shrink-0 p-5 pb-3 border-b border-slate-100 text-center">
        <h3 id="profile-title" class="text-sm font-black text-slate-800">编辑个人资料</h3>
        <p class="text-[10px] text-slate-400">设置专属于你的日语修习者形象</p>
      </div>

      <div class="min-h-0 flex-1 p-5 space-y-4 overflow-y-auto">
        
        <!-- 头像编辑区 -->
        <div class="flex flex-col items-center space-y-2.5">
          <div class="relative group cursor-pointer" role="button" tabindex="0" aria-label="选择头像照片" @click="triggerFileInput" @keydown.enter.prevent="triggerFileInput" @keydown.space.prevent="triggerFileInput">
            <!-- 头像圆形容器 -->
            <div class="w-20 h-20 rounded-full border-2 border-rose-200 shadow-md overflow-hidden bg-rose-50 flex items-center justify-center transition-transform active:scale-95">
              <img 
                v-if="isImageAvatar(avatarPreview)" 
                :src="avatarPreview" 
                alt="头像" 
                class="w-full h-full object-cover"
              />
              <span v-else class="text-4xl select-none">{{ avatarPreview || '🌸' }}</span>
            </div>

            <!-- 右下角拍照小圆标 -->
            <div class="absolute bottom-0 right-0 w-6 h-6 rounded-full bg-rose-500 text-white flex items-center justify-center text-xs shadow-md border-2 border-white">
              📷
            </div>

            <!-- 隐藏的文件选择器 (支持相册与相机) -->
            <input 
              ref="fileInputRef" 
              type="file" 
              accept="image/*" 
              class="hidden" 
              @click.stop
              @change="handleImageSelected"
            />
          </div>

          <span class="text-[10px] text-slate-400 font-medium">点击选择照片，仅在本机裁剪与保存</span>

          <!-- 和风精选备选头像胶囊 -->
          <div class="w-full pt-1 space-y-1 text-center">
            <span class="text-[10px] text-slate-400 font-semibold">或者选择和风精选萌系头像：</span>
            <div class="flex items-center justify-center space-x-1.5 overflow-x-auto py-1">
              <button 
                v-for="em in PRESET_AVATARS" 
                :key="em"
                @click="selectPresetAvatar(em)"
                :class="[
                  'w-8 h-8 rounded-full flex items-center justify-center text-base transition-all border shrink-0',
                  avatarPreview === em ? 'border-rose-500 bg-rose-50 scale-110 shadow-xs' : 'border-slate-100 bg-slate-50 hover:bg-slate-100'
                ]"
              >
                {{ em }}
              </button>
            </div>
          </div>
          <p v-if="imagePending" role="status" class="text-xs text-slate-500">正在处理照片…</p>
          <p v-if="imageError" role="alert" class="text-xs text-rose-600">{{ imageError }}</p>
        </div>

        <!-- 昵称编辑框 -->
        <div class="space-y-1">
          <div class="flex items-center justify-between">
            <label for="profile-nickname" class="text-[11px] font-bold text-slate-600">用户昵称</label>
            <span class="text-[10px] text-slate-400 font-mono">{{ nickname.length }}/16</span>
          </div>
          <div class="bg-slate-50 border border-slate-200 rounded-2xl px-3.5 py-2.5 focus-within:ring-2 focus-within:ring-rose-400 focus-within:bg-white transition-all">
            <input 
              v-model="nickname" 
              id="profile-nickname"
              ref="nicknameInputRef"
              :aria-invalid="Boolean(nicknameError)"
              :aria-describedby="nicknameError ? 'profile-nickname-error' : undefined"
              maxlength="16" 
              placeholder="请输入您的昵称" 
              class="w-full bg-transparent text-xs text-slate-800 focus:outline-none placeholder:text-slate-400"
            />
          </div>
          <p v-if="nicknameError" id="profile-nickname-error" role="alert" class="text-xs text-rose-600">{{ nicknameError }}</p>
        </div>

        <!-- 个人简介 / 每日宣言 -->
        <div class="space-y-1">
          <div class="flex items-center justify-between">
            <label for="profile-bio" class="text-[11px] font-bold text-slate-600">个人简介 · 修行宣言</label>
            <span class="text-[10px] text-slate-400 font-mono">{{ bio.length }}/60</span>
          </div>
          <div class="bg-slate-50 border border-slate-200 rounded-2xl p-3 focus-within:ring-2 focus-within:ring-rose-400 focus-within:bg-white transition-all">
            <textarea 
              v-model="bio" 
              id="profile-bio"
              rows="3" 
              maxlength="60" 
              placeholder="写下一句你的日语学习目标或座右铭吧~" 
              class="w-full bg-transparent text-xs text-slate-800 focus:outline-none resize-none placeholder:text-slate-400 leading-relaxed"
            ></textarea>
          </div>
        </div>

        <!-- 保存按钮 -->
        <p v-if="formError" role="alert" class="text-xs text-rose-600">{{ formError }}</p>
        <button 
          @click="saveProfile"
          :disabled="imagePending"
          class="w-full py-3.5 rounded-2xl bg-gradient-to-r from-rose-500 to-pink-500 text-white font-bold text-xs shadow-md shadow-rose-200 hover:shadow-rose-300 active:scale-98 transition-all disabled:opacity-50"
        >
          保存修改 ✨
        </button>

      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onUnmounted } from 'vue'
import { authManager } from '@/utils/auth'
import { audio } from '@/utils/audio'
import { notifyUser } from '@/utils/feedback'

const props = defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'profile-updated'): void
}>()

const isOpen = computed({
  get: () => props.modelValue,
  set: (val: boolean) => emit('update:modelValue', val)
})

const PRESET_AVATARS = ['🌸', '🗻', '🐕', '🍙', '🍵', '🏮', '🦊', '🎏']

const nickname = ref('')
const bio = ref('')
const avatarPreview = ref('')
const fileInputRef = ref<HTMLInputElement | null>(null)
const nicknameInputRef = ref<HTMLInputElement | null>(null)
const nicknameError = ref('')
const formError = ref('')
const imageError = ref('')
const imagePending = ref(false)
let imageRun = 0

watch(isOpen, (newVal) => {
  if (newVal) {
    nicknameError.value = ''
    formError.value = ''
    imageError.value = ''
    const p = authManager.getProfile()
    nickname.value = p.nickname
    bio.value = p.bio || '热爱日语，每天进步一点点 🌸'
    avatarPreview.value = p.avatar || '🌸'
  } else {
    imageRun += 1
    imagePending.value = false
  }
})
watch(nickname, value => { if (value.trim()) nicknameError.value = '' })
onUnmounted(() => { imageRun += 1 })

function isImageAvatar(avatarStr: string): boolean {
  return !!avatarStr && avatarStr.startsWith('data:image/')
}

function triggerFileInput() {
  fileInputRef.value?.click()
}

function selectPresetAvatar(avatar: string) {
  imageRun += 1
  imagePending.value = false
  imageError.value = ''
  avatarPreview.value = avatar
}

// 在本机将选中的照片居中裁剪为 200x200 JPEG，不上传服务器。
function handleImageSelected(e: Event) {
  const target = e.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return
  target.value = ''
  const run = ++imageRun
  imageError.value = ''
  imagePending.value = false
  if ((file.type && !file.type.startsWith('image/')) || file.size > 10 * 1024 * 1024) {
    imageError.value = '请选择不超过 10 MB 的图片，原头像已保留。'
    return
  }
  imagePending.value = true
  const fail = () => {
    if (run !== imageRun) return
    imagePending.value = false
    imageError.value = '照片读取或处理失败，请换一张图片重试。原头像已保留。'
  }

  const reader = new FileReader()
  reader.onerror = fail
  reader.onabort = fail
  reader.onload = (event) => {
    if (run !== imageRun) return
    const img = new Image()
    img.onerror = fail
    img.onload = () => {
      if (run !== imageRun) return
      try {
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')
        const targetSize = 200
        canvas.width = targetSize
        canvas.height = targetSize

        // 计算居中裁剪区域 (正方形)
        const minSide = Math.min(img.width, img.height)
        const sx = (img.width - minSide) / 2
        const sy = (img.height - minSide) / 2

        if (!ctx || minSide <= 0) throw new Error('Image unavailable')
        ctx.drawImage(img, sx, sy, minSide, minSide, 0, 0, targetSize, targetSize)
        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.82)
        avatarPreview.value = compressedBase64
        imagePending.value = false
      } catch { fail() }
    }
    if (typeof event.target?.result !== 'string') { fail(); return }
    img.src = event.target.result
  }
  try { reader.readAsDataURL(file) } catch { fail() }
}

function closeModal() {
  imageRun += 1
  imagePending.value = false
  isOpen.value = false
}

function saveProfile() {
  formError.value = ''
  if (imagePending.value) return
  if (!nickname.value.trim()) {
    nicknameError.value = '请填写昵称后再保存。'
    nicknameInputRef.value?.focus()
    return
  }

  const saved = authManager.updateProfile({
    nickname: nickname.value.trim(),
    avatar: avatarPreview.value,
    bio: bio.value.trim()
  })

  if (!saved) {
    formError.value = '本机存储空间不足或不可用，资料未保存。输入已保留，请稍后重试。'
    return
  }

  audio.playCorrect()
  emit('profile-updated')
  closeModal()
  notifyUser('个人资料已保存到本机。', 'success')
}
</script>

<style scoped>
.profile-card {
  max-height: calc(100vh - 2rem);
  max-height: calc(100dvh - 2rem);
}
</style>
