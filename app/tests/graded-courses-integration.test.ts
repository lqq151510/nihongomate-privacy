import { describe, expect, test } from 'bun:test'
import { GRADED_COURSES, studyQuestionCount } from '../src/data/gradedCourses'
import { orderStudyQuestion } from '../src/utils/studyQuestionOrder'

describe('N4–N1 系统课程集成', () => {
  test('各级课程、题目 ID 全局唯一并与等级对应', () => {
    const units = Object.entries(GRADED_COURSES).flatMap(([level, items]) => items.map(unit => ({ level, unit })))
    expect(new Set(units.map(({ unit }) => unit.id)).size).toBe(units.length)
    const ids: string[] = []
    for (const { level, unit } of units) {
      expect(unit.level).toBe(level)
      const questions = [...unit.listening.questions, ...unit.reading.questions, ...unit.questions]
      expect(studyQuestionCount(unit)).toBe(questions.length)
      expect(questions.length).toBeGreaterThanOrEqual(8)
      for (const q of questions) {
        ids.push(q.id)
        const reordered = orderStudyQuestion(q)
        expect(reordered.options[reordered.correctIndex]).toBe(q.options[q.correctIndex])
      }
    }
    expect(new Set(ids).size).toBe(ids.length)
  })
})
