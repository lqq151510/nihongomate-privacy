import { describe, expect, test } from 'bun:test'
import { N5_COURSE_READINGS } from '../src/data/n5CourseReading'
import { N5_COURSE_LISTENING } from '../src/data/n5CourseListening'

describe('N5 单元短阅读', () => {
  test('每个听力单元都有一篇阅读，题目 ID 不重复', () => {
    expect(N5_COURSE_READINGS.map(item => item.unitId)).toEqual(N5_COURSE_LISTENING.map(item => item.unitId))
    const ids = N5_COURSE_READINGS.flatMap(item => item.questions.map(q => q.id))
    expect(ids).toHaveLength(24)
    expect(new Set(ids).size).toBe(ids.length)
  })
  test('阅读、读音、译文和两道有解析的四选题均可用', () => {
    for (const item of N5_COURSE_READINGS) {
      expect(item.text.trim().length).toBeGreaterThan(0)
      expect(item.chinese.trim().length).toBeGreaterThan(0)
      expect(item.reading).toMatch(/^[ぁ-ゖァ-ヺー、。「」！？\s]+$/u)
      expect(item.questions).toHaveLength(2)
      for (const q of item.questions) {
        expect(q.options).toHaveLength(4)
        expect(new Set(q.options).size).toBe(4)
        expect(q.correctIndex).toBeGreaterThanOrEqual(0)
        expect(q.correctIndex).toBeLessThan(4)
        expect(q.explanation.trim().length).toBeGreaterThan(0)
      }
    }
  })
  test('购物计算题同时考虑数量和价格', () => {
    const q = N5_COURSE_READINGS.find(item => item.unitId === 'n5_unit_04')!.questions[1]!
    expect(q.options[q.correctIndex]).toBe('二百五十円')
  })
})
