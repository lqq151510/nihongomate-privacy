import { describe, expect, test } from 'bun:test'
import { playPracticeAudio, segmentPracticeAudio } from '../src/utils/advancedPracticeAudio'

describe('长篇朗读切分', () => {
  test('按句与换行分段，不把空白作为语音', () => {
    expect(segmentPracticeAudio(' こんにちは。\n元気ですか？ はい！ ')).toEqual(['こんにちは。', '元気ですか？', 'はい！'])
    expect(segmentPracticeAudio(' \n ')).toEqual([])
  })
  test('角色提示和引号不作为朗读文本', () => {
    expect(segmentPracticeAudio('男：「こんにちは。」\n女：はい。')).toEqual(['こんにちは。', 'はい。'])
  })
  test('无标点长句也有限制，不拆分 Unicode 字符', () => {
    expect(segmentPracticeAudio('あ𠮷いうえお', 3)).toEqual(['あ𠮷い', 'うえお'])
    expect(segmentPracticeAudio('あいう', 0)).toEqual([])
  })
  test('切页后等待中的语音结束，不启动下一句', async () => {
    let active = true
    let resolveFirst: (value: boolean) => void = () => {}
    const spoken: string[] = []
    const playing = playPracticeAudio(['一。', '二。'], text => {
      spoken.push(text)
      return new Promise(resolve => { resolveFirst = resolve })
    }, () => active)
    active = false
    resolveFirst(true)
    expect(await playing).toBe(false)
    expect(spoken).toEqual(['一。'])
  })
  test('系统语音失败后不播放后续句', async () => {
    const spoken: string[] = []
    expect(await playPracticeAudio(['一。', '二。'], async text => { spoken.push(text); return false }, () => true)).toBe(false)
    expect(spoken).toEqual(['一。'])
  })
})
