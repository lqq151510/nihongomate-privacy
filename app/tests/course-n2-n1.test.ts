import { describe, expect, test } from 'bun:test'
import { N2_COURSE } from '../src/data/courseN2'
import { N1_COURSE } from '../src/data/courseN1'

describe('N2 与 N1 原创课程内容', () => {
  const courses = [...N2_COURSE, ...N1_COURSE]
  test('两等级课程及全部题目编号唯一', () => {
    expect(N2_COURSE).toHaveLength(16)
    expect(N1_COURSE.length).toBeGreaterThanOrEqual(8)
    expect(new Set(courses.map(unit => unit.id)).size).toBe(courses.length)
    const questions = courses.flatMap(unit => [...unit.listening.questions, ...unit.reading.questions, ...unit.questions])
    expect(questions.length).toBe(courses.reduce((count, unit) => count + unit.listening.questions.length + unit.reading.questions.length + unit.questions.length, 0))
    expect(new Set(questions.map(q => q.id)).size).toBe(questions.length)
  })
  test('每课词汇、讲解、例句、听读及练习完整', () => {
    for (const u of courses) {
      expect(u.vocabulary.length).toBeGreaterThanOrEqual(4)
      expect(u.steps.length).toBeGreaterThanOrEqual(3)
      expect(u.examples.length).toBeGreaterThanOrEqual(3)
      expect(u.listening.lines.length).toBeGreaterThanOrEqual(3)
      expect(u.listening.questions).toHaveLength(2)
      expect(u.reading.questions).toHaveLength(2)
      expect(u.questions).toHaveLength(4)
      for (const step of u.steps) { expect(step.title.trim()).not.toBe(''); expect(step.explanation.trim()).not.toBe('') }
      for (const e of [...u.vocabulary, ...u.examples, ...u.listening.lines]) {
        expect(e.japanese.trim()).not.toBe(''); expect(e.chinese.trim()).not.toBe('')
        expect(e.reading).toMatch(/^[ぁ-ゖァ-ヺー、。「」！？\s]+$/u)
      }
      expect(u.reading.reading).toMatch(/^[ぁ-ゖァ-ヺー、。「」！？\s]+$/u)
      for (const q of [...u.listening.questions, ...u.reading.questions, ...u.questions]) {
        expect(q.prompt.trim()).not.toBe(''); expect(q.explanation.trim()).not.toBe('')
        expect(q.options).toHaveLength(4); expect(new Set(q.options).size).toBe(4)
        expect(q.correctIndex).toBeGreaterThanOrEqual(0); expect(q.correctIndex).toBeLessThan(4)
      }
      expect(u.output.reference.trim()).not.toBe(''); expect(u.output.reading.trim()).not.toBe('')
    }
  })
  test('关键题的答案依据覆盖条件、让步与风险', () => {
    expect(N1_COURSE[0]!.listening.questions[0]!.options[N1_COURSE[0]!.listening.questions[0]!.correctIndex]).toBe('天候')
    expect(N2_COURSE[4]!.reading.questions[1]!.options[N2_COURSE[4]!.reading.questions[1]!.correctIndex]).toBe('いいえ、長引く可能性がある')
    expect(N1_COURSE[4]!.reading.questions[0]!.options[N1_COURSE[4]!.reading.questions[0]!.correctIndex]).toBe('事前の申し込み')
  })
  test('N2 扩充课兼顾完整听读并保留先前单元编号', () => {
    expect(N2_COURSE.map(unit => unit.id)).toEqual(Array.from({ length: 16 }, (_, i) => `n2_unit_${String(i + 1).padStart(2, '0')}`))
    for (const unit of N2_COURSE.slice(8)) {
      expect(unit.listening.lines.length).toBeGreaterThanOrEqual(4)
      expect((unit.reading.text.match(/。/g) ?? []).length).toBeGreaterThanOrEqual(3)
      expect(unit.examples.length).toBeGreaterThanOrEqual(3)
      expect(unit.listening.questions.length + unit.reading.questions.length + unit.questions.length).toBe(8)
    }
    const comparison = N2_COURSE[10]!
    expect(comparison.reading.text).toContain('六十人')
    expect(comparison.reading.questions[0]!.options[comparison.reading.questions[0]!.correctIndex]).toBe('六十人')
    const announcement = N2_COURSE[15]!
    expect(announcement.reading.questions[1]!.options[announcement.reading.questions[1]!.correctIndex]).toBe('中止とは決まっていない')
  })
})
