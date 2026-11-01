<template>
  <section v-if="messages.length" aria-label="操作提示" class="shrink-0 max-h-32 overflow-y-auto space-y-1.5 border-b border-slate-100 bg-white px-3 py-2">
    <div v-for="item in messages" :key="item.id" :role="item.type === 'error' ? 'alert' : 'status'" :aria-live="item.type === 'error' ? 'assertive' : 'polite'" aria-atomic="true"
      :class="['flex items-start gap-2 rounded-xl border px-3 py-2 text-xs leading-relaxed', item.type === 'error' ? 'bg-amber-50 border-amber-200 text-amber-900' : item.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-slate-50 border-slate-200 text-slate-700']">
      <span class="flex-1 min-w-0 break-words">{{ item.message }}</span>
      <button @click="feedbackCenter.dismiss(item.id)" aria-label="关闭提示" class="shrink-0 -my-1 -mr-1 h-8 w-8 rounded-lg font-bold hover:bg-black/5">✕</button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { feedbackCenter, type FeedbackMessage } from '@/utils/feedback'

const messages = ref<FeedbackMessage[]>([])
let unsubscribe: (() => void) | undefined
let expiryTimer: ReturnType<typeof setInterval> | undefined
onMounted(() => {
  feedbackCenter.expire()
  unsubscribe = feedbackCenter.subscribe(value => { messages.value = value })
  expiryTimer = setInterval(() => feedbackCenter.expire(), 500)
})
onUnmounted(() => {
  unsubscribe?.()
  clearInterval(expiryTimer)
})
</script>
