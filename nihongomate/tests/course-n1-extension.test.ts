import { describe, expect, test } from 'bun:test'
import { N1_COURSE } from '../src/data/courseN1'

describe('N1 原创新增单元', () => {
  const additions = N1_COURSE.filter(unit => Number(unit.id.slice(-2)) >= 9)
  test('延续旧编号，新增八课，全部题目编号唯一', () => {
    expect(N1_COURSE.slice(0, 8).map(unit => unit.id)).toEqual(Array.from({ length: 8 }, (_, i) => `n1_unit_${String(i + 1).padStart(2, '0')}`))
    expect(additions.map(unit => unit.id)).toEqual(Array.from({ length: 8 }, (_, i) => `n1_unit_${String(i + 9).padStart(2, '0')}`))
    const questions = N1_COURSE.flatMap(unit => [...unit.listening.questions, ...unit.reading.questions, ...unit.questions])
    expect(new Set(questions.map(q => q.id)).size).toBe(questions.length)
  })
  test('每课包含讲解、例句、对话、短文及有解析的有效题目', () => {
    for (const unit of additions) {
      expect(unit.level).toBe('N1')
      expect(unit.steps.length).toBeGreaterThanOrEqual(3)
      expect(unit.examples.length).toBeGreaterThanOrEqual(3)
      expect(unit.vocabulary.length).toBeGreaterThanOrEqual(3)
      expect(unit.listening.lines.length).toBeGreaterThanOrEqual(4)
      expect((unit.reading.text.match(/。/g) ?? []).length).toBeGreaterThanOrEqual(4)
      for (const sentence of [...unit.examples, ...unit.vocabulary, ...unit.listening.lines]) {
        expect(sentence.japanese.trim()).not.toBe('')
        expect(sentence.chinese.trim()).not.toBe('')
        expect(sentence.reading).toMatch(/^[ぁ-ゖァ-ヺー、。「」！？\s]+$/u)
      }
      expect(unit.reading.reading).toMatch(/^[ぁ-ゖァ-ヺー、。「」！？\s]+$/u)
      expect(unit.listening.questions).toHaveLength(2)
      expect(unit.reading.questions).toHaveLength(2)
      expect(unit.questions.length).toBeGreaterThanOrEqual(4)
      for (const q of [...unit.listening.questions, ...unit.reading.questions, ...unit.questions]) {
        expect(q.options).toHaveLength(4)
        expect(new Set(q.options).size).toBe(4)
        expect(q.correctIndex).toBeGreaterThanOrEqual(0)
        expect(q.correctIndex).toBeLessThan(4)
        expect(q.explanation.trim()).not.toBe('')
      }
      expect(unit.output.reference.trim()).not.toBe('')
    }
  })
  test('调查偏差、通知先后和论证题有明确答案', () => {
    const byId = (id: string) => additions.find(unit => unit.id === id)!
    const answer = (id: string, index: number) => {
      const question = byId(id).reading.questions[index]!
      return question.options[question.correctIndex]
    }
    expect(answer('n1_unit_13', 0)).toBe('平日の午前に来る人')
    expect(answer('n1_unit_14', 0)).toBe('担当者による内容確認')
    expect(answer('n1_unit_16', 1)).toBe('意見と試験運用の結果を踏まえて判断する')
  })
})
