import { afterEach, beforeEach, describe, expect, spyOn, test } from 'bun:test'
import { studyStorage, PROGRESS_RESET_EVENT, STUDY_UPDATED_EVENT, MOCK_EXAM_SESSION_KEY } from '../src/utils/storage'
import { GRAMMAR_PROGRESS_KEY } from '../src/utils/grammarProgress'
import { N5_COURSE_PROGRESS_KEY } from '../src/utils/n5CourseProgress'
import { N5_SUPPLEMENT_PROGRESS_KEY } from '../src/utils/n5SupplementProgress'
import { GRADED_COURSE_PROGRESS_KEY } from '../src/utils/gradedCourseProgress'
import { ADVANCED_PRACTICE_PROGRESS_KEY } from '../src/utils/advancedPracticeProgress'

const keys = ['nihongomate_word_records', 'nihongomate_study_stats', 'nihongomate_exam_mistakes', GRAMMAR_PROGRESS_KEY, N5_COURSE_PROGRESS_KEY, N5_SUPPLEMENT_PROGRESS_KEY, GRADED_COURSE_PROGRESS_KEY, ADVANCED_PRACTICE_PROGRESS_KEY, MOCK_EXAM_SESSION_KEY]
class MemoryStorage implements Storage {
  values = new Map<string, string>()
  get length() { return this.values.size }
  clear() { this.values.clear() }
  getItem(key: string) { return this.values.get(key) ?? null }
  key(index: number) { return [...this.values.keys()][index] ?? null }
  removeItem(key: string) { this.values.delete(key) }
  setItem(key: string, value: string) { this.values.set(key, String(value)) }
}

let storage: MemoryStorage
let originalStorage: PropertyDescriptor | undefined
let originalWindow: PropertyDescriptor | undefined
let resets: number
let updates: number
beforeEach(() => {
  originalStorage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')
  originalWindow = Object.getOwnPropertyDescriptor(globalThis, 'window')
  storage = new MemoryStorage()
  keys.forEach((key, i) => storage.setItem(key, `original-${i}`))
  for (const key of ['nihongomate_user_profile', 'nihongomate_privacy_decision', 'nihongomate_user_goal']) storage.setItem(key, 'retained')
  const events = new EventTarget()
  resets = 0; updates = 0
  events.addEventListener(PROGRESS_RESET_EVENT, () => resets++)
  events.addEventListener(STUDY_UPDATED_EVENT, () => updates++)
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: storage })
  Object.defineProperty(globalThis, 'window', { configurable: true, value: events })
})
afterEach(() => {
  if (originalStorage) Object.defineProperty(globalThis, 'localStorage', originalStorage)
  else Reflect.deleteProperty(globalThis, 'localStorage')
  if (originalWindow) Object.defineProperty(globalThis, 'window', originalWindow)
  else Reflect.deleteProperty(globalThis, 'window')
})

describe('可靠清除学习记录', () => {
  test('考场记录删除失败时回滚其他学习记录', () => {
    const originalRemove = storage.removeItem.bind(storage)
    const failure = spyOn(storage, 'removeItem').mockImplementation(key => {
      if (key === MOCK_EXAM_SESSION_KEY) throw new Error('blocked')
      originalRemove(key)
    })
    expect(studyStorage.clearAllProgress()).toEqual({ success: false, partial: false })
    expect(keys.map(key => storage.getItem(key))).toEqual(keys.map((_, index) => `original-${index}`))
    expect(resets).toBe(0)
    failure.mockRestore()
  })
  test('进阶训练结果删除失败时还原所有旧记录', () => {
    const originalRemove = storage.removeItem.bind(storage)
    const failure = spyOn(storage, 'removeItem').mockImplementation(key => {
      if (key === ADVANCED_PRACTICE_PROGRESS_KEY) throw new Error('blocked')
      originalRemove(key)
    })
    expect(studyStorage.clearAllProgress()).toEqual({ success: false, partial: false })
    expect(keys.map(key => storage.getItem(key))).toEqual(keys.map((_, index) => `original-${index}`))
    expect(resets).toBe(0)
    failure.mockRestore()
  })
  test('成功清除包括语法随堂结果的全部学习键并通知缓存失效', () => {
    expect(studyStorage.clearAllProgress()).toEqual({ success: true, partial: false })
    expect(keys.map(key => storage.getItem(key))).toEqual(keys.map(() => null))
    expect([...storage.values.values()]).toEqual(['retained', 'retained', 'retained'])
    expect(resets).toBe(1)
    expect(updates).toBe(1)
  })

  test('第二步删除失败后还原原字节，不冒充重置成功', () => {
    const originalRemove = storage.removeItem.bind(storage)
    const failure = spyOn(storage, 'removeItem').mockImplementation(key => {
      if (key === keys[1]) throw new Error('blocked')
      originalRemove(key)
    })
    expect(studyStorage.clearAllProgress()).toEqual({ success: false, partial: false })
    expect(keys.map(key => storage.getItem(key))).toEqual(keys.map((_, index) => `original-${index}`))
    expect(resets).toBe(0)
    expect(updates).toBe(0)
    failure.mockRestore()
  })

  test('回滚也失败明确报告部分状态并使旧缓存失效', () => {
    const originalRemove = storage.removeItem.bind(storage)
    const removeFailure = spyOn(storage, 'removeItem').mockImplementation(key => {
      if (key === keys[1]) throw new Error('blocked')
      originalRemove(key)
    })
    const originalSet = storage.setItem.bind(storage)
    const restoreFailure = spyOn(storage, 'setItem').mockImplementation((key, value) => {
      if (key === keys[0]) throw new Error('blocked')
      originalSet(key, value)
    })
    expect(studyStorage.clearAllProgress()).toEqual({ success: false, partial: true })
    expect(storage.getItem(keys[0]!)).toBeNull()
    expect(resets).toBe(1)
    expect(updates).toBe(1)
    expect(storage.getItem('nihongomate_user_goal')).toBe('retained')
    removeFailure.mockRestore(); restoreFailure.mockRestore()
  })

  test('快照读取失败时没有执行任何删除', () => {
    const readFailure = spyOn(storage, 'getItem').mockImplementation(() => { throw new Error('unavailable') })
    const removal = spyOn(storage, 'removeItem')
    expect(studyStorage.clearAllProgress()).toEqual({ success: false, partial: false })
    expect(removal).not.toHaveBeenCalled()
    expect(resets).toBe(0)
    expect(storage.values.size).toBe(keys.length + 3)
    readFailure.mockRestore(); removal.mockRestore()
  })

  test('最后删除语法结果失败时，前面已删除的学习记录全部恢复', () => {
    const originalRemove = storage.removeItem.bind(storage)
    const failure = spyOn(storage, 'removeItem').mockImplementation(key => {
      if (key === GRAMMAR_PROGRESS_KEY) throw new Error('blocked')
      originalRemove(key)
    })
    expect(studyStorage.clearAllProgress()).toEqual({ success: false, partial: false })
    expect(keys.map(key => storage.getItem(key))).toEqual(keys.map((_, index) => `original-${index}`))
    expect(resets).toBe(0)
    expect(updates).toBe(0)
    failure.mockRestore()
  })

  test('扩展训练结果删除失败时还原旧课程及全部记录', () => {
    const originalRemove = storage.removeItem.bind(storage)
    const failure = spyOn(storage, 'removeItem').mockImplementation(key => {
      if (key === N5_SUPPLEMENT_PROGRESS_KEY) throw new Error('blocked')
      originalRemove(key)
    })
    expect(studyStorage.clearAllProgress()).toEqual({ success: false, partial: false })
    expect(keys.map(key => storage.getItem(key))).toEqual(keys.map((_, index) => `original-${index}`))
    expect(resets).toBe(0)
    failure.mockRestore()
  })

  test('高级课程结果删除失败时还原全部旧记录', () => {
    const originalRemove = storage.removeItem.bind(storage)
    const failure = spyOn(storage, 'removeItem').mockImplementation(key => {
      if (key === GRADED_COURSE_PROGRESS_KEY) throw new Error('blocked')
      originalRemove(key)
    })
    expect(studyStorage.clearAllProgress()).toEqual({ success: false, partial: false })
    expect(keys.map(key => storage.getItem(key))).toEqual(keys.map((_, index) => `original-${index}`))
    expect(resets).toBe(0)
    failure.mockRestore()
  })

  test('课程结果删除失败时还原所有先前记录', () => {
    const originalRemove = storage.removeItem.bind(storage)
    const failure = spyOn(storage, 'removeItem').mockImplementation(key => {
      if (key === N5_COURSE_PROGRESS_KEY) throw new Error('blocked')
      originalRemove(key)
    })
    expect(studyStorage.clearAllProgress()).toEqual({ success: false, partial: false })
    expect(keys.map(key => storage.getItem(key))).toEqual(keys.map((_, index) => `original-${index}`))
    expect(resets).toBe(0)
    failure.mockRestore()
  })
})
