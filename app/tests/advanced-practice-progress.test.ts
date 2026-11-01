import { describe, expect, test } from 'bun:test'
import { ADVANCED_PRACTICE, ADVANCED_PRACTICE_PROGRESS_KEY, getAdvancedPracticeResults, saveAdvancedPracticeResult } from '../src/utils/advancedPracticeProgress'

class MemoryStorage implements Storage {
  values = new Map<string, string>()
  get length() { return this.values.size }
  clear() { this.values.clear() }
  getItem(key: string) { return this.values.get(key) ?? null }
  key(index: number) { return [...this.values.keys()][index] ?? null }
  removeItem(key: string) { this.values.delete(key) }
  setItem(key: string, value: string) { this.values.set(key, String(value)) }
}

describe('进阶听读本地进度', () => {
  const passage = ADVANCED_PRACTICE[0]!
  const result = { passageId: passage.id, total: passage.questions.length, correct: 1, completedAt: 123 }
  test('仅接受整篇结果，旧 N5 和分级成绩不改变', () => {
    const storage = new MemoryStorage()
    storage.setItem('nihongomate_n5_course_results', 'n5-original')
    storage.setItem('nihongomate_graded_course_results_v1', 'graded-original')
    expect(saveAdvancedPracticeResult({ ...result, total: result.total - 1 }, storage)).toBe(false)
    expect(saveAdvancedPracticeResult(result, storage)).toBe(true)
    expect(getAdvancedPracticeResults(storage)[passage.id]).toEqual(result)
    expect(storage.getItem('nihongomate_n5_course_results')).toBe('n5-original')
    expect(storage.getItem('nihongomate_graded_course_results_v1')).toBe('graded-original')
  })
  test('历史结果按当时题数保存，其他篇写入不删除旧结果', () => {
    const storage = new MemoryStorage()
    const old = { ...result, total: 1, correct: 1 }
    const another = ADVANCED_PRACTICE.find(p => p.id !== passage.id)!
    storage.setItem(ADVANCED_PRACTICE_PROGRESS_KEY, JSON.stringify({ [passage.id]: old }))
    expect(getAdvancedPracticeResults(storage)[passage.id]).toEqual(old)
    expect(saveAdvancedPracticeResult({ passageId: another.id, total: another.questions.length, correct: 0, completedAt: 456 }, storage)).toBe(true)
    expect(getAdvancedPracticeResults(storage)[passage.id]).toEqual(old)
  })
  test('损坏数据、非法成绩、写入失败都不会覆盖已有字节', () => {
    const storage = new MemoryStorage()
    for (const raw of ['broken', '[]', 'null', '42']) {
      storage.setItem(ADVANCED_PRACTICE_PROGRESS_KEY, raw)
      expect(getAdvancedPracticeResults(storage)).toEqual({})
      expect(saveAdvancedPracticeResult(result, storage)).toBe(false)
      expect(storage.getItem(ADVANCED_PRACTICE_PROGRESS_KEY)).toBe(raw)
    }
    storage.removeItem(ADVANCED_PRACTICE_PROGRESS_KEY)
    for (const invalid of [{ ...result, passageId: 'unknown' }, { ...result, correct: -1 }, { ...result, correct: result.total + 1 }, { ...result, completedAt: NaN }]) expect(saveAdvancedPracticeResult(invalid, storage)).toBe(false)
    expect(saveAdvancedPracticeResult(result, storage)).toBe(true)
    const original = storage.getItem(ADVANCED_PRACTICE_PROGRESS_KEY)
    storage.setItem = () => { throw new Error('quota') }
    expect(saveAdvancedPracticeResult({ ...result, correct: 0 }, storage)).toBe(false)
    expect(storage.getItem(ADVANCED_PRACTICE_PROGRESS_KEY)).toBe(original)
  })
})
