import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { STUDY_UPDATED_EVENT, studyStorage } from '../src/utils/storage'

const RECORDS = 'nihongomate_word_records'
const STATS = 'nihongomate_study_stats'
const originalStorage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')
const originalWindow = Object.getOwnPropertyDescriptor(globalThis, 'window')

class MemoryStorage implements Storage {
  private values = new Map<string, string>()
  failRead: string | null = null
  failWrite: string | null = null
  get length() { return this.values.size }
  clear() { this.values.clear() }
  key(index: number) { return [...this.values.keys()][index] ?? null }
  removeItem(key: string) { this.values.delete(key) }
  getItem(key: string) {
    if (key === this.failRead) throw new Error('simulated read failure')
    return this.values.get(key) ?? null
  }
  setItem(key: string, value: string) {
    if (key === this.failWrite) throw new Error('simulated write failure')
    this.values.set(key, String(value))
  }
  raw(key: string) { return this.values.get(key) ?? null }
}

let memory: MemoryStorage
let updates: number
beforeEach(() => {
  memory = new MemoryStorage()
  updates = 0
  const events = new EventTarget()
  events.addEventListener(STUDY_UPDATED_EVENT, () => { updates++ })
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: memory })
  Object.defineProperty(globalThis, 'window', { configurable: true, value: events })
})
afterEach(() => {
  if (originalStorage) Object.defineProperty(globalThis, 'localStorage', originalStorage)
  else Reflect.deleteProperty(globalThis, 'localStorage')
  if (originalWindow) Object.defineProperty(globalThis, 'window', originalWindow)
  else Reflect.deleteProperty(globalThis, 'window')
})

describe('词汇记录损坏时保护原始数据', () => {
  for (const [label, raw] of [
    ['非 JSON', '{invalid'],
    ['空字符串', ''],
    ['空白字符串', '   '],
    ['JSON null', 'null'],
    ['JSON 数组', '[]'],
    ['JSON 数字', '123'],
    ['JSON 字符串', '"text"'],
    ['JSON 布尔值', 'false'],
    ['目标记录为 null', '{"new-word":null}'],
    ['目标记录字段损坏', '{"new-word":{"wordId":"new-word","reviewCount":"broken"}}'],
    ['复习次数为负数', '{"new-word":{"reviewCount":-1}}'],
    ['复习次数为小数', '{"new-word":{"reviewCount":1.5}}'],
    ['上次复习时间为负数', '{"new-word":{"lastReviewTime":-1}}'],
    ['下次复习时间为负数', '{"new-word":{"nextReviewTime":-1}}'],
    ['简易度为零', '{"new-word":{"easeFactor":0}}'],
    ['简易度为负数', '{"new-word":{"easeFactor":-0.1}}'],
    ['目标记录词条 ID 为 null', '{"new-word":{"wordId":null}}'],
    ['目标记录词条 ID 为数字', '{"new-word":{"wordId":123}}'],
    ['目标记录等级为数组', '{"new-word":{"level":[]}}'],
    ['目标记录状态不在允许范围', '{"new-word":{"status":"not-a-status"}}'],
    ['目标记录上次复习时间为 null', '{"new-word":{"lastReviewTime":null}}'],
    ['目标记录下次复习时间为字符串', '{"new-word":{"nextReviewTime":"tomorrow"}}'],
    ['其他记录字段损坏', '{"other-word":{"easeFactor":"invalid"}}'],
  ] as const) {
    test(`${label}：拒绝覆盖并保持统计和通知不变`, () => {
      const oldStats = '{"unchanged":"sentinel"}'
      memory.setItem(RECORDS, raw)
      memory.setItem(STATS, oldStats)

      expect(() => studyStorage.recordWordState('new-word', 'N5', 'mastered')).toThrow()
      expect(memory.raw(RECORDS)).toBe(raw)
      expect(memory.raw(STATS)).toBe(oldStats)
      expect(updates).toBe(0)
    })
  }

  for (const [label, raw] of [
    ['非 JSON', '{bad-stats'],
    ['空字符串', ''],
    ['空白字符串', '   '],
    ['JSON null', 'null'],
    ['JSON 数组', '[]'],
    ['JSON 数字', '123'],
    ['JSON 布尔值', 'false'],
    ['日期列表不是数组', '{"checkInDates":"broken"}'],
    ['新词列表包含 null', '{"todayNewWordIds":[null]}'],
    ['今日次数为字符串', '{"todayReviewCount":"broken"}'],
    ['目标等级为 null', '{"targetLevel":null}'],
    ['学习日期为数字', '{"lastStudyDate":123}'],
    ['学习日期格式错误', '{"lastStudyDate":"01/11/2026"}'],
    ['累计学习数为负数', '{"totalLearnedWords":-1}'],
    ['累计学习数为小数', '{"totalLearnedWords":1.5}'],
    ['今日复习数为负数', '{"todayReviewCount":-1}'],
    ['今日复习数为小数', '{"todayReviewCount":0.5}'],
    ['连续学习天数为负数', '{"studyStreakDays":-1}'],
    ['连续学习天数为小数', '{"studyStreakDays":0.5}'],
    ['今日考试题数为负数', '{"todayExamQuestionsCount":-1}'],
    ['今日考试题数为小数', '{"todayExamQuestionsCount":0.5}'],
  ] as const) {
    test(`统计记录为${label}时不覆盖词汇或统计`, () => {
      const records = '{}'
      memory.setItem(RECORDS, records)
      memory.setItem(STATS, raw)

      expect(() => studyStorage.recordWordState('new-word', 'N5', 'mastered')).toThrow()
      expect(memory.raw(RECORDS)).toBe(records)
      expect(memory.raw(STATS)).toBe(raw)
      expect(updates).toBe(0)
    })
  }

  test('读取统计记录抛错时不写入词汇或发送成功通知', () => {
    const records = '{}'
    const stats = '{"unchanged":"sentinel"}'
    memory.setItem(RECORDS, records)
    memory.setItem(STATS, stats)
    memory.failRead = STATS

    expect(() => studyStorage.recordWordState('new-word', 'N5', 'mastered')).toThrow()
    expect(memory.raw(RECORDS)).toBe(records)
    expect(memory.raw(STATS)).toBe(stats)
    expect(updates).toBe(0)
  })

  test('读取词汇记录抛错时不写入或更新统计', () => {
    const raw = '{"kept":"untouched"}'
    const stats = '{"unchanged":"sentinel"}'
    memory.setItem(RECORDS, raw)
    memory.setItem(STATS, stats)
    memory.failRead = RECORDS

    expect(() => studyStorage.recordWordState('new-word', 'N5', 'mastered')).toThrow()
    expect(memory.raw(RECORDS)).toBe(raw)
    expect(memory.raw(STATS)).toBe(stats)
    expect(updates).toBe(0)
  })

  test('词汇记录写入失败时不更新统计或发送成功通知', () => {
    const raw = '{}'
    const stats = '{"unchanged":"sentinel"}'
    memory.setItem(RECORDS, raw)
    memory.setItem(STATS, stats)
    memory.failWrite = RECORDS

    expect(() => studyStorage.recordWordState('new-word', 'N5', 'mastered')).toThrow()
    expect(memory.raw(RECORDS)).toBe(raw)
    expect(memory.raw(STATS)).toBe(stats)
    expect(updates).toBe(0)
  })

  test('统计写入失败时恢复之前的词汇记录且不发送成功通知', () => {
    const raw = '{}'
    const stats = '{"unchanged":"sentinel"}'
    memory.setItem(RECORDS, raw)
    memory.setItem(STATS, stats)
    memory.failWrite = STATS

    expect(() => studyStorage.recordWordState('new-word', 'N5', 'mastered')).toThrow()
    expect(memory.raw(RECORDS)).toBe(raw)
    expect(memory.raw(STATS)).toBe(stats)
    expect(updates).toBe(0)
  })

  test('合法统计的零计数与 YYYY-MM-DD 日期可保存', () => {
    memory.setItem(RECORDS, '{}')
    memory.setItem(STATS, '{"totalLearnedWords":0,"todayReviewCount":0,"studyStreakDays":0,"todayExamQuestionsCount":0,"lastStudyDate":"2026-11-01"}')

    const result = studyStorage.recordWordState('new-word', 'N5', 'mastered')
    expect(result.wordId).toBe('new-word')
    expect(studyStorage.getStats().totalLearnedWords).toBe(1)
    expect(updates).toBe(1)
  })

  test('合法数值边界可保存，不将 0 次复习和 0 时间视作损坏', () => {
    memory.setItem(RECORDS, '{"boundary":{"reviewCount":0,"lastReviewTime":0,"nextReviewTime":0,"easeFactor":0.1}}')
    memory.setItem(STATS, '{}')

    const result = studyStorage.recordWordState('boundary', 'N5', 'vague')
    expect(result.reviewCount).toBe(1)
    expect(result.status).toBe('vague')
    expect(studyStorage.getStats().totalLearnedWords).toBe(1)
    expect(updates).toBe(1)
  })

  test('合法旧版缺少字段时可兼容，未知字段不被丢弃', () => {
    memory.setItem(RECORDS, '{"legacy":{"reviewCount":1,"easeFactor":2.5,"extra":"保留"}}')
    memory.setItem(STATS, '{"custom":"保留"}')

    const result = studyStorage.recordWordState('legacy', 'N5', 'mastered')
    expect(result.reviewCount).toBe(2)
    expect(JSON.parse(memory.raw(RECORDS)!).legacy.extra).toBe('保留')
    expect(JSON.parse(memory.raw(STATS)!).custom).toBe('保留')
    expect(updates).toBe(1)
  })

  test('首次使用无数据及正常保存、更新仍可正常工作', () => {
    const first = studyStorage.recordWordState('new-word', 'N5', 'mastered')
    expect(first.wordId).toBe('new-word')
    expect(first.reviewCount).toBe(1)
    expect(studyStorage.getStats().todayNewWordIds).toEqual(['new-word'])
    expect(studyStorage.getStats().totalLearnedWords).toBe(1)
    expect(updates).toBe(1)

    const second = studyStorage.recordWordState('new-word', 'N5', 'vague')
    expect(second.reviewCount).toBe(2)
    expect(second.status).toBe('vague')
    expect(studyStorage.getStats().todayNewWordIds).toEqual(['new-word'])
    expect(studyStorage.getStats().totalLearnedWords).toBe(1)
    expect(updates).toBe(2)
  })
})
