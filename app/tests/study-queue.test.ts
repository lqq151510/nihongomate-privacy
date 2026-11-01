import { describe, expect, test } from 'bun:test'
import { buildStudyQueue, DAILY_NEW_WORD_LIMIT } from '../src/utils/studyQueue'

describe('今日学习队列', () => {
  test('到期词保持时间顺序，并先于新词', () => {
    expect(buildStudyQueue(['new-1', 'due-2', 'future', 'due-1', 'new-2'], ['due-1', 'due-2', 'future'], ['due-1', 'due-2'], 1))
      .toEqual(['due-1', 'due-2', 'new-1'])
  })

  test('未来到期的已学词不进入今日任务', () => {
    expect(buildStudyQueue(['future'], ['future'], [])).toEqual([])
  })

  test('默认最多选择十个新词', () => {
    const words = Array.from({ length: 20 }, (_, i) => `word-${i}`)
    expect(buildStudyQueue(words, [], [])).toEqual(words.slice(0, DAILY_NEW_WORD_LIMIT))
  })

  test('新词额度用完仍可复习到期词', () => {
    expect(buildStudyQueue(['new', 'due'], ['due'], ['due'], 0)).toEqual(['due'])
    expect(buildStudyQueue(['new'], [], [], -1)).toEqual([])
  })

  test('排除其他等级、已删除的词，并去重', () => {
    expect(buildStudyQueue(['new', 'new', 'due'], ['due', 'other'], ['other', 'deleted', 'due', 'due']))
      .toEqual(['due', 'new'])
  })

  test('当前词库或任务为空时返回完成态所需的空队列', () => {
    expect(buildStudyQueue([], ['old'], ['old'])).toEqual([])
    expect(buildStudyQueue(['learned'], ['learned'], [], 0)).toEqual([])
  })
})
