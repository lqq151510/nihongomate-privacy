import { describe, expect, test } from 'bun:test'
import { GRADED_COURSES, studyQuestionCount } from '../src/data/gradedCourses'
import { GRADED_COURSE_PROGRESS_KEY, getGradedCourseResults, saveGradedCourseResult } from '../src/utils/gradedCourseProgress'

class MemoryStorage implements Storage {
  values = new Map<string, string>()
  get length() { return this.values.size }
  clear() { this.values.clear() }
  getItem(key: string) { return this.values.get(key) ?? null }
  key(index: number) { return [...this.values.keys()][index] ?? null }
  removeItem(key: string) { this.values.delete(key) }
  setItem(key: string, value: string) { this.values.set(key, String(value)) }
}

describe('N4–N1 课程结果', () => {
  test('新成绩必须完成该课全部题目，保存不改变 N5 和用户数据', () => {
    const storage = new MemoryStorage()
    const unit = GRADED_COURSES.N4[0]!
    const count = studyQuestionCount(unit)
    const result = { unitId: unit.id, total: count, correct: 2, completedAt: 123 }
    storage.setItem('nihongomate_n5_course_results', 'old N5 bytes')
    expect(saveGradedCourseResult({ ...result, total: count - 1 }, storage)).toBe(false)
    expect(saveGradedCourseResult(result, storage)).toBe(true)
    expect(getGradedCourseResults(storage)[unit.id]).toEqual(result)
    expect(storage.getItem('nihongomate_n5_course_results')).toBe('old N5 bytes')
  })
  test('旧记录按当时题数保留，另一个单元保存时不删历史记录', () => {
    const storage = new MemoryStorage()
    const older = GRADED_COURSES.N4[0]!, current = GRADED_COURSES.N3[0]!
    const history = { unitId: older.id, total: 3, correct: 2, completedAt: 1 }
    storage.setItem(GRADED_COURSE_PROGRESS_KEY, JSON.stringify({ [older.id]: history }))
    const newResult = { unitId: current.id, total: studyQuestionCount(current), correct: 0, completedAt: 2 }
    expect(getGradedCourseResults(storage)[older.id]).toEqual(history)
    expect(saveGradedCourseResult(newResult, storage)).toBe(true)
    expect(getGradedCourseResults(storage)[older.id]).toEqual(history)
  })
  test('存储损坏或不可写时不覆盖原字节', () => {
    const storage = new MemoryStorage(), unit = GRADED_COURSES.N2[0]!
    const result = { unitId: unit.id, total: studyQuestionCount(unit), correct: 0, completedAt: 1 }
    storage.setItem(GRADED_COURSE_PROGRESS_KEY, 'broken')
    expect(saveGradedCourseResult(result, storage)).toBe(false)
    expect(storage.getItem(GRADED_COURSE_PROGRESS_KEY)).toBe('broken')
    storage.removeItem(GRADED_COURSE_PROGRESS_KEY)
    storage.setItem = () => { throw new Error('quota') }
    expect(saveGradedCourseResult(result, storage)).toBe(false)
  })
})
