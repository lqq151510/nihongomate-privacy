import { describe, expect, test } from 'bun:test'
import { N5_COURSE } from '../src/data/n5Course'
import { N5_COURSE_PROGRESS_KEY, expectedQuestionCount, getN5CourseResults, saveN5CourseResult } from '../src/utils/n5CourseProgress'

class MemoryStorage implements Storage {
  values = new Map<string, string>()
  get length() { return this.values.size }
  clear() { this.values.clear() }
  getItem(key: string) { return this.values.get(key) ?? null }
  key(index: number) { return [...this.values.keys()][index] ?? null }
  removeItem(key: string) { this.values.delete(key) }
  setItem(key: string, value: string) { this.values.set(key, value) }
}

describe('N5 单元学习结果', () => {
  const unit = N5_COURSE[0]!
  const total = expectedQuestionCount(unit.id)
  const result = { unitId: unit.id, total, correct: 2, completedAt: 1793509200000 }
  test('只接受该单元包含句型、听力、阅读完整题数的有效结果', () => {
    const storage = new MemoryStorage()
    expect(total).toBeGreaterThan(unit.questions.length + 1)
    for (const item of [{ ...result, total: total - 1 }, { ...result, correct: -1 }, { ...result, correct: total + 1 }, { ...result, unitId: 'unknown' }, { ...result, completedAt: NaN }]) {
      expect(saveN5CourseResult(item, storage)).toBe(false)
    }
    expect(storage.length).toBe(0)
    expect(saveN5CourseResult(result, storage)).toBe(true)
    expect(getN5CourseResults(storage)).toEqual({ [unit.id]: result })
  })
  test('重新练习只更新本单元，其他学习记录保留', () => {
    const storage = new MemoryStorage()
    storage.setItem('nihongomate_word_records', 'untouched')
    expect(saveN5CourseResult(result, storage)).toBe(true)
    const another = N5_COURSE[1]!
    const second = { unitId: another.id, total: expectedQuestionCount(another.id), correct: 0, completedAt: result.completedAt }
    expect(saveN5CourseResult(second, storage)).toBe(true)
    expect(saveN5CourseResult({ ...result, correct: total }, storage)).toBe(true)
    expect(getN5CourseResults(storage)[another.id]).toEqual(second)
    expect(getN5CourseResults(storage)[unit.id]?.correct).toBe(total)
    expect(storage.getItem('nihongomate_word_records')).toBe('untouched')
  })
  test('已有数据损坏、存储不可用或写入失败时不覆盖原字节', () => {
    const storage = new MemoryStorage()
    for (const raw of ['broken', '[]', 'null', '42']) {
      storage.values.set(N5_COURSE_PROGRESS_KEY, raw)
      expect(getN5CourseResults(storage)).toEqual({})
      expect(saveN5CourseResult(result, storage)).toBe(false)
      expect(storage.getItem(N5_COURSE_PROGRESS_KEY)).toBe(raw)
    }
    storage.values.delete(N5_COURSE_PROGRESS_KEY)
    expect(saveN5CourseResult(result, storage)).toBe(true)
    const original = storage.getItem(N5_COURSE_PROGRESS_KEY)
    storage.setItem = () => { throw new Error('quota') }
    expect(saveN5CourseResult({ ...result, correct: 0 }, storage)).toBe(false)
    expect(storage.getItem(N5_COURSE_PROGRESS_KEY)).toBe(original)
    storage.getItem = () => { throw new Error('blocked') }
    expect(getN5CourseResults(storage)).toEqual({})
    expect(saveN5CourseResult(result, storage)).toBe(false)
  })
})
