import { afterAll, afterEach, beforeEach, describe, expect, setSystemTime, spyOn, test } from 'bun:test'
import { localDateKey, STUDY_UPDATED_EVENT, studyStorage } from '../src/utils/storage'
import { buildStudyQueue, DAILY_NEW_WORD_LIMIT } from '../src/utils/studyQueue'

// 只使用内存替身，不读取或写入用户真实浏览器数据。
class MemoryStorage implements Storage {
  private values = new Map<string, string>()
  get length() { return this.values.size }
  clear() { this.values.clear() }
  getItem(key: string) { return this.values.get(key) ?? null }
  key(index: number) { return [...this.values.keys()][index] ?? null }
  removeItem(key: string) { this.values.delete(key) }
  setItem(key: string, value: string) { this.values.set(key, String(value)) }
}

const originalStorage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')
const originalWindow = Object.getOwnPropertyDescriptor(globalThis, 'window')
let memory: MemoryStorage
let events: EventTarget
beforeEach(() => {
  memory = new MemoryStorage()
  events = new EventTarget()
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: memory })
  Object.defineProperty(globalThis, 'window', { configurable: true, value: events })
  setSystemTime(new Date(2026, 10, 1, 0, 30))
})
afterEach(() => setSystemTime())
afterAll(() => {
  if (originalStorage) Object.defineProperty(globalThis, 'localStorage', originalStorage)
  else Reflect.deleteProperty(globalThis, 'localStorage')
  if (originalWindow) Object.defineProperty(globalThis, 'window', originalWindow)
  else Reflect.deleteProperty(globalThis, 'window')
})

describe('本地学习日期与统计', () => {
  test('凌晨按本地日期记账，日历与签到日期相同', () => {
    expect(localDateKey()).toBe('2026-11-01')
    expect(studyStorage.getStats().lastStudyDate).toBe('2026-11-01')
    studyStorage.performCheckIn()
    expect(studyStorage.getStats().checkInDates).toEqual(['2026-11-01'])
    expect(studyStorage.getRecentWeekDays().at(-1)).toEqual({ dateStr: '2026-11-01', dayLabel: '周日', isToday: true, isChecked: true })
  })

  test('只有做题也会跨日归零，不需先背词', () => {
    setSystemTime(new Date(2026, 9, 31, 23, 59))
    studyStorage.recordExamAnswered()
    studyStorage.recordExamAnswered()
    studyStorage.recordWordState('word', 'N5', 'mastered')
    setSystemTime(new Date(2026, 10, 1, 0, 1))
    expect(studyStorage.getStats().todayReviewCount).toBe(0)
    expect(studyStorage.getStats().todayExamQuestionsCount).toBe(0)
    studyStorage.recordExamAnswered()
    expect(studyStorage.getStats().todayExamQuestionsCount).toBe(1)
    expect(studyStorage.getStats().todayNewWordIds).toEqual([])
    expect(studyStorage.getAllRecords().word).toBeDefined()
  })

  test('背词不增加签到天数，同日重复签到不重复计数', () => {
    expect(studyStorage.getStats().studyStreakDays).toBe(0)
    studyStorage.recordWordState('word', 'N5', 'mastered')
    expect(studyStorage.getStats().studyStreakDays).toBe(0)
    expect(studyStorage.performCheckIn()).toEqual({ success: true, streak: 1, already: false })
    expect(studyStorage.performCheckIn()).toEqual({ success: true, streak: 1, already: true })
    setSystemTime(new Date(2026, 10, 2, 0, 1))
    studyStorage.recordWordState('word', 'N5', 'mastered')
    expect(studyStorage.performCheckIn().streak).toBe(2)
    setSystemTime(new Date(2026, 10, 4, 0, 1))
    expect(studyStorage.getStats().studyStreakDays).toBe(0)
    expect(studyStorage.performCheckIn().streak).toBe(1)
  })

  test('旧统计兼容新增字段，历史签到与词汇记录保留', () => {
    memory.setItem('nihongomate_study_stats', JSON.stringify({ lastStudyDate: '2026-11-01', checkInDates: ['2026-10-31'], todayReviewCount: 5, totalLearnedWords: 3 }))
    expect(studyStorage.getStats()).toMatchObject({ todayNewWordIds: [], todayExamQuestionsCount: 0, todayReviewCount: 5, totalLearnedWords: 3, studyStreakDays: 1 })
  })

  test('保存记录与签到后通知当前页面刷新', () => {
    let updates = 0
    events.addEventListener(STUDY_UPDATED_EVENT, () => updates++)
    studyStorage.recordWordState('word', 'N5', 'vague')
    studyStorage.recordExamAnswered()
    studyStorage.performCheckIn()
    expect(updates).toBe(3)
  })

  test('签到写入失败不得报告成功', () => {
    const write = spyOn(memory, 'setItem').mockImplementation(() => { throw new Error('storage full') })
    const warn = spyOn(console, 'warn').mockImplementation(() => {})
    try {
      expect(studyStorage.performCheckIn().success).toBe(false)
      expect(studyStorage.isTodayCheckedIn()).toBe(false)
    } finally {
      write.mockRestore()
      warn.mockRestore()
    }
  })

  test('学习统计写入失败时恢复词汇记录并报告错误', () => {
    studyStorage.recordWordState('existing', 'N5', 'vague')
    const recordsBefore = memory.getItem('nihongomate_word_records')
    const statsBefore = memory.getItem('nihongomate_study_stats')
    const originalSetItem = memory.setItem.bind(memory)
    const write = spyOn(memory, 'setItem').mockImplementation((key, value) => {
      if (key === 'nihongomate_study_stats') throw new Error('storage full')
      originalSetItem(key, value)
    })
    const warn = spyOn(console, 'warn').mockImplementation(() => {})
    try {
      expect(() => studyStorage.recordWordState('word', 'N5', 'mastered')).toThrow('storage full')
      expect(memory.getItem('nihongomate_word_records')).toBe(recordsBefore)
      expect(memory.getItem('nihongomate_study_stats')).toBe(statsBefore)
    } finally {
      write.mockRestore()
      warn.mockRestore()
    }
  })

  test('词汇记录写入失败时不增加学习次数或新词额度', () => {
    const write = spyOn(memory, 'setItem').mockImplementation(() => { throw new Error('storage full') })
    const warn = spyOn(console, 'warn').mockImplementation(() => {})
    try {
      expect(() => studyStorage.recordWordState('word', 'N5', 'mastered')).toThrow('storage full')
      expect(studyStorage.getAllRecords()).toEqual({})
      expect(studyStorage.getStats().todayReviewCount).toBe(0)
      expect(studyStorage.getStats().todayNewWordIds).toEqual([])
    } finally {
      write.mockRestore()
      warn.mockRestore()
    }
  })
})

describe('队列与持久化记录的闭环', () => {
  function dailyQueue(wordIds: string[]) {
    return buildStudyQueue(wordIds, Object.keys(studyStorage.getAllRecords()), studyStorage.getDueReviewWordIds(), DAILY_NEW_WORD_LIMIT - studyStorage.getStats().todayNewWordIds.length)
  }

  test('完成十个新词后重建任务仍为空，不自动循环或追加十词', () => {
    const words = Array.from({ length: 20 }, (_, i) => `word-${i}`)
    const initial = dailyQueue(words)
    expect(initial.length).toBe(10)
    for (const id of initial) studyStorage.recordWordState(id, 'N5', 'mastered')
    expect(dailyQueue(words)).toEqual([])
    expect(studyStorage.getStats().todayNewWordIds.length).toBe(10)
    expect(studyStorage.getStats().totalLearnedWords).toBe(10)
    expect(dailyQueue(['n4-new'])).toEqual([])
    setSystemTime(new Date(2026, 10, 2, 0, 30))
    expect(dailyQueue(words)).toEqual(words.slice(10))
  })

  test('生疏词本轮完成后离队，十二小时后按时回到复习队列', () => {
    studyStorage.recordWordState('hard', 'N5', 'unfamiliar')
    studyStorage.recordWordState('good', 'N5', 'vague')
    studyStorage.recordWordState('easy', 'N5', 'mastered')
    expect(dailyQueue(['hard', 'good', 'easy'])).toEqual([])
    setSystemTime(new Date(2026, 10, 1, 12, 30))
    expect(dailyQueue(['hard', 'good', 'easy'])).toEqual(['hard'])
    studyStorage.recordWordState('hard', 'N5', 'mastered')
    expect(dailyQueue(['hard', 'good', 'easy'])).toEqual([])
    expect(studyStorage.getStats().todayNewWordIds).toEqual(['hard', 'good', 'easy'])
  })
})
