import { describe, expect, test } from 'bun:test'
import { N5_COURSE_PROGRESS_KEY, expectedQuestionCount, getN5CourseResults, saveN5CourseResult } from '../src/utils/n5CourseProgress'
import { N5_SUPPLEMENT_PROGRESS_KEY, expectedSupplementCount, getN5SupplementResults, saveN5SupplementResult } from '../src/utils/n5SupplementProgress'

class MemoryStorage implements Storage {
  values = new Map<string, string>()
  get length() { return this.values.size }
  clear() { this.values.clear() }
  getItem(key: string) { return this.values.get(key) ?? null }
  key(index: number) { return [...this.values.keys()][index] ?? null }
  removeItem(key: string) { this.values.delete(key) }
  setItem(key: string, value: string) { this.values.set(key, value) }
}
const id = 'n5_unit_01'
const makeResult = () => ({ unitId: id, total: expectedSupplementCount(id), correct: 2, completedAt: 1793509200000 })

describe('N5 加强训练独立进度', () => {
  test('新增训练保存、更新、读取均不触碰原课程结果的字节和读取', () => {
    const storage = new MemoryStorage()
    const original = { unitId: id, total: expectedQuestionCount(id), correct: 2, completedAt: 1793509200000 }
    expect(saveN5CourseResult(original, storage)).toBe(true)
    const bytes = storage.getItem(N5_COURSE_PROGRESS_KEY)
    const result = makeResult()
    expect(result.total).toBeGreaterThan(4)
    expect(saveN5SupplementResult(result, storage)).toBe(true)
    expect(getN5SupplementResults(storage)[id]).toEqual(result)
    expect(saveN5SupplementResult({ ...result, correct: 0 }, storage)).toBe(true)
    expect(storage.getItem(N5_COURSE_PROGRESS_KEY)).toBe(bytes)
    expect(getN5CourseResults(storage)[id]).toEqual(original)
  })
  test('不保存不完整、错误或未知单元成绩', () => {
    const storage = new MemoryStorage(), result = makeResult()
    for (const invalid of [{ ...result, total: result.total - 1 }, { ...result, correct: -1 }, { ...result, correct: result.total + 1 }, { ...result, unitId: 'unknown' }, { ...result, completedAt: NaN }]) expect(saveN5SupplementResult(invalid, storage)).toBe(false)
    expect(storage.length).toBe(0)
  })
  test('无效存储结构及写入失败保留已有字节', () => {
    const storage = new MemoryStorage(), result = makeResult()
    for (const raw of ['broken', '[]', 'null', '42']) {
      storage.values.set(N5_SUPPLEMENT_PROGRESS_KEY, raw)
      expect(getN5SupplementResults(storage)).toEqual({})
      expect(saveN5SupplementResult(result, storage)).toBe(false)
      expect(storage.getItem(N5_SUPPLEMENT_PROGRESS_KEY)).toBe(raw)
    }
    storage.values.delete(N5_SUPPLEMENT_PROGRESS_KEY)
    expect(saveN5SupplementResult(result, storage)).toBe(true)
    const bytes = storage.getItem(N5_SUPPLEMENT_PROGRESS_KEY)
    storage.setItem = () => { throw new Error('quota') }
    expect(saveN5SupplementResult({ ...result, correct: 0 }, storage)).toBe(false)
    expect(storage.getItem(N5_SUPPLEMENT_PROGRESS_KEY)).toBe(bytes)
  })
})
