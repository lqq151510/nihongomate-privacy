import { nextTick, onActivated, onDeactivated, onMounted, onUnmounted, ref } from 'vue'

/** 缓存页面移出 DOM 后滚动位置可能归零，记录真实滚动并在激活后恢复。 */
export function usePageScroll() {
  const scrollRoot = ref<HTMLElement | null>(null)
  let top = 0
  let active = true
  let element: HTMLElement | null = null
  const remember = () => {
    if (active && element) top = element.scrollTop
  }
  onMounted(() => {
    element = scrollRoot.value
    element?.addEventListener('scroll', remember, { passive: true })
  })
  onActivated(async () => {
    active = true
    await nextTick()
    if (active && scrollRoot.value) scrollRoot.value.scrollTop = top
  })
  onDeactivated(() => { active = false })
  onUnmounted(() => element?.removeEventListener('scroll', remember))
  return { scrollRoot }
}
