import { describe, expect, test } from 'bun:test'
import { N5_COURSE } from '../src/data/n5Course'

describe('N5 课程单元与练习', () => {
  test('十二单元按听力所用编号排序，每课均有词汇、讲解、例句、输出及可判答的习题', () => {
    expect(N5_COURSE).toHaveLength(12)
    const questionIds = new Set<string>()
    for (const [index, unit] of N5_COURSE.entries()) {
      expect(unit.id).toBe(`n5_unit_${String(index + 1).padStart(2, '0')}`)
      expect(unit.title.trim()).not.toBe('')
      expect(unit.goal.trim()).not.toBe('')
      expect(unit.vocabulary.length).toBeGreaterThanOrEqual(6)
      expect(unit.steps.length).toBeGreaterThanOrEqual(3)
      expect(unit.examples.length).toBeGreaterThanOrEqual(3)
      expect(unit.questions.length).toBeGreaterThanOrEqual(4)
      for (const step of unit.steps) for (const text of [step.title, step.explanation]) expect(text.trim()).not.toBe('')
      for (const example of [...unit.vocabulary, ...unit.examples]) {
        for (const text of [example.japanese, example.reading, example.chinese]) expect(text.trim()).not.toBe('')
        expect(example.reading).not.toMatch(/[一-龯A-Za-z]/u)
      }
      for (const text of Object.values(unit.output)) expect(text.trim()).not.toBe('')
      expect(unit.output.reading).not.toMatch(/[一-龯A-Za-z]/u)
      for (const question of unit.questions) {
        expect(questionIds.has(question.id)).toBe(false)
        questionIds.add(question.id)
        expect(question.prompt.trim()).not.toBe('')
        expect(question.explanation.trim()).not.toBe('')
        expect(question.options).toHaveLength(4)
        expect(new Set(question.options).size).toBe(4)
        expect(question.options.every(option => option.trim().length > 0)).toBe(true)
        expect(Number.isInteger(question.correctIndex)).toBe(true)
        expect(question.correctIndex).toBeGreaterThanOrEqual(0)
        expect(question.correctIndex).toBeLessThan(4)
      }
    }
  })
  test('动词核心例外、语法讲解顺序和指定题目答案均存在', () => {
    expect(N5_COURSE[7]!.steps.map(step => step.explanation).join('')).toContain('行って')
    expect(N5_COURSE[8]!.steps.map(step => step.explanation).join('')).toContain('買わない')
    const exception = N5_COURSE[7]!.questions.find(question => question.prompt.includes('「行く」'))!
    expect(exception.options[exception.correctIndex]).toBe('行って')
    const negative = N5_COURSE[8]!.questions.find(question => question.prompt.includes('「買う」'))!
    expect(negative.options[negative.correctIndex]).toBe('買わない')
  })
})
