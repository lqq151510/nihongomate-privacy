import { describe, expect, test } from 'bun:test'
import { createSequencePlayer } from '../src/utils/sequencePlayback'
import { saveLearningGoal } from '../src/utils/learningGoal'

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>(done => { resolve = done })
  return { promise, resolve }
}

describe('离开页面取消连续朗读', () => {
  test('正常按顺序朗读，语音失败后不启动下一个假名', async () => {
    const played: string[] = []
    const player = createSequencePlayer<string>({
      playItem: async item => { played.push(item); return item !== 'い' },
      stopAudio: () => {}, onItem: () => {}, pause: async () => {},
    })
    expect(await player.play(['あ', 'い', 'う'])).toBe(false)
    expect(played).toEqual(['あ', 'い'])
  })

  test('朗读等待中切页，旧结果完成也不会继续下一项', async () => {
    const first = deferred<boolean>()
    const selected: string[] = []
    let stopped = 0
    const player = createSequencePlayer<string>({
      playItem: () => first.promise,
      stopAudio: () => { stopped += 1 }, onItem: item => selected.push(item), pause: async () => {},
    })
    const run = player.play(['あ', 'い'])
    player.stop()
    first.resolve(true)
    expect(await run).toBe(false)
    expect(selected).toEqual(['あ'])
    expect(stopped).toBe(2)
  })

  test('句间等待时切页，计时结束也不会恢复播放', async () => {
    const gap = deferred<void>()
    const played: string[] = []
    const player = createSequencePlayer<string>({
      playItem: async item => { played.push(item); return true },
      stopAudio: () => {}, onItem: () => {}, pause: () => gap.promise,
    })
    const run = player.play(['あ', 'い'])
    await Promise.resolve()
    player.stop()
    gap.resolve()
    expect(await run).toBe(false)
    expect(played).toEqual(['あ'])
  })

  test('开始另一行会失效旧一轮，不会串入下一假名或选中态', async () => {
    const first = deferred<boolean>()
    const selected: string[] = []
    const player = createSequencePlayer<string>({
      playItem: item => item === 'あ' ? first.promise : Promise.resolve(true),
      stopAudio: () => {}, onItem: item => selected.push(item), pause: async () => {},
    })
    const previous = player.play(['あ', 'い'])
    expect(await player.play(['か', 'き'])).toBe(true)
    first.resolve(true)
    expect(await previous).toBe(false)
    expect(selected).toEqual(['あ', 'か', 'き'])
  })
})

describe('先保存再更新学习目标', () => {
  test('成功保存新目标', () => {
    let goal = 'N5'
    const storage = { setItem: (_key: string, value: string) => { goal = value } } as Storage
    expect(saveLearningGoal('N3', storage)).toBe(true)
    expect(goal).toBe('N3')
  })

  test('写入失败返回失败结果，保留之前的目标', () => {
    const values = new Map([['nihongomate_user_goal', 'N5']])
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      removeItem: (key: string) => { values.delete(key) },
      setItem: () => { throw new Error('quota') },
    } as unknown as Storage
    expect(saveLearningGoal('N3', storage)).toBe(false)
    expect(storage.getItem('nihongomate_user_goal')).toBe('N5')
  })
})
