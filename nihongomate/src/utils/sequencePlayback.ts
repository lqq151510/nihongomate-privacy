/** 取消包括句间等待；旧一轮的 Promise 完成后不能继续播放或更新选中项。 */
export function createSequencePlayer<T>(options: {
  playItem: (item: T) => Promise<boolean>
  stopAudio: () => void
  onItem: (item: T) => void
  pause: () => Promise<void>
}) {
  let generation = 0
  function stop() {
    generation += 1
    options.stopAudio()
  }
  async function play(items: readonly T[]): Promise<boolean> {
    stop()
    const run = generation
    for (const item of items) {
      if (run !== generation) return false
      options.onItem(item)
      const played = await options.playItem(item)
      if (!played || run !== generation) return false
      await options.pause()
      if (run !== generation) return false
    }
    return true
  }
  return { play, stop }
}
