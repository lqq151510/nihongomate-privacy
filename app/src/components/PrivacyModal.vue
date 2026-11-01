<template>
  <div v-if="showPolicy" class="fixed inset-0 z-[60] flex flex-col bg-white" role="dialog" aria-modal="true" aria-label="完整隐私政策">
    <div class="flex items-center justify-between gap-3 p-3 border-b border-slate-200">
      <button @click="showPolicy = false" class="text-sm text-rose-600 px-3 py-2">返回应用</button>
      <button @click="showPolicy = false; showPrompt = true" class="text-xs text-slate-600 px-3 py-2">重新选择本地使用方式</button>
    </div>
    <iframe src="./privacy.html" title="随身日语伴侣完整隐私政策" class="w-full flex-1 border-0"></iframe>
  </div>
  <div v-if="showPrompt && !showPolicy" class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" role="dialog" aria-modal="true" aria-labelledby="privacy-title">
    <div class="privacy-card bg-white w-full max-w-sm rounded-2xl overflow-hidden p-6 shadow-2xl flex flex-col space-y-4">
      <div class="shrink-0 flex items-center space-x-2 text-rose-500">
        <span class="text-2xl">🌸</span>
        <h3 id="privacy-title" class="text-lg font-bold text-slate-800">隐私保护与本地使用</h3>
      </div>
      <div class="min-h-0 flex-1 text-xs text-slate-600 space-y-2 max-h-64 overflow-y-auto leading-relaxed border-y border-slate-100 py-3">
        <p>欢迎使用《随身日语伴侣》！当前版本无需注册，课程文字和练习可以在本机使用。</p>
        <ul class="list-disc pl-4 space-y-2">
          <li>学习进度、昵称及您自选的头像仅保存到本机，本应用不提供云同步。</li>
          <li>发音使用设备语音服务，可能依赖网络。选择“仅使用本地功能”时，只调用系统标记为离线的日语音色；没有该音色时仍可学习文字内容。</li>
          <li>当前没有广告、支付、短信登录或用户行为分析 SDK。选择“仅使用本地功能”也能继续学习。</li>
        </ul>
        <button @click="showPolicy = true" class="text-rose-600 underline py-2">阅读完整隐私政策（{{ PRIVACY_VERSION }}）</button>
      </div>
      <div class="shrink-0 flex gap-3 pt-2">
        <button @click="choose('local-only')" class="flex-1 py-2.5 px-3 rounded-xl text-xs font-medium text-slate-600 bg-slate-100">仅使用本地功能</button>
        <button @click="choose('accepted')" class="flex-1 py-2.5 px-3 rounded-xl text-xs font-semibold text-white bg-rose-500">同意政策并继续</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { PRIVACY_VERSION, readPrivacyDecision, savePrivacyDecision, type PrivacyChoice } from '@/utils/privacy'
import { audio } from '@/utils/audio'
import { notifyUser } from '@/utils/feedback'

const showPrompt = ref(readPrivacyDecision() === null)
const showPolicy = ref(false)

function choose(choice: PrivacyChoice) {
  audio.stop()
  const saved = savePrivacyDecision(choice)
  showPrompt.value = false
  if (!saved) notifyUser('本次选择仅在当前会话生效，未能保存。重新打开应用后请在设置的隐私政策中重新选择。', 'error', { persistent: true })
}
function openPolicy() {
  showPolicy.value = true
}
onMounted(() => window.addEventListener('nihongomate:show-privacy', openPolicy))
onUnmounted(() => window.removeEventListener('nihongomate:show-privacy', openPolicy))
</script>

<style scoped>
.privacy-card {
  max-height: calc(100vh - 2rem);
  max-height: calc(100dvh - 2rem);
}
</style>
