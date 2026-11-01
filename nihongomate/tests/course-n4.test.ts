import { describe, expect, test } from 'bun:test'
import { N4_COURSE } from '../src/data/courseN4'

describe('N4 分级单元内容', () => {
  test('每个单元具备词句、讲解、听读和可自查练习', () => {
    expect(N4_COURSE).toHaveLength(15)
    expect(new Set(N4_COURSE.map(u => u.id)).size).toBe(15)
    const ids = new Set<string>()
    for (const unit of N4_COURSE) {
      expect(unit.level).toBe('N4')
      expect(unit.vocabulary.length).toBeGreaterThanOrEqual(4)
      expect(unit.steps.length).toBeGreaterThanOrEqual(3)
      expect(unit.examples.length).toBeGreaterThanOrEqual(3)
      expect(unit.listening.lines.length).toBeGreaterThanOrEqual(3)
      expect(unit.listening.questions).toHaveLength(2)
      expect(unit.reading.questions).toHaveLength(2)
      expect(unit.questions.length).toBeGreaterThanOrEqual(4)
      for (const item of [...unit.vocabulary,...unit.examples,...unit.listening.lines]) {
        expect(item.japanese.length).toBeGreaterThan(0)
        expect(item.chinese.length).toBeGreaterThan(0)
        expect(item.reading).toMatch(/^[ぁ-ゖァ-ヺー、。「」！？\s]+$/u)
      }
      expect(unit.reading.reading).toMatch(/^[ぁ-ゖァ-ヺー、。「」！？\s]+$/u)
      for (const question of [...unit.questions,...unit.listening.questions,...unit.reading.questions]) {
        expect(ids.has(question.id)).toBe(false)
        ids.add(question.id)
        expect(question.options).toHaveLength(4)
        expect(new Set(question.options).size).toBe(4)
        expect(question.correctIndex).toBeGreaterThanOrEqual(0)
        expect(question.correctIndex).toBeLessThan(4)
        expect(question.explanation.length).toBeGreaterThan(0)
      }
      for (const value of [unit.goal, unit.output.prompt, unit.output.reference, unit.output.reading, unit.output.chinese]) expect(value.length).toBeGreaterThan(0)
    }
  })
  test('动作先后与禁止、许可的区别有明确例证', () => {
    const guidance = N4_COURSE.find(u => u.id === 'n4_unit_04')!
    expect(guidance.steps.find(s => s.title === '没有义务')?.explanation).toContain('不等于禁止')
    const question = N4_COURSE.find(u => u.id === 'n4_unit_06')!.questions[1]!
    expect(question.options[question.correctIndex]).toBe('到达')
  })
  test('列举和准备状态的语法边界保持清晰', () => {
    const listing = N4_COURSE.find(u => u.id === 'n4_unit_11')!
    expect(listing.steps[0]!.explanation).toContain('不意味着只有')
    const preparation = N4_COURSE.find(u => u.id === 'n4_unit_13')!
    expect(preparation.steps[1]!.explanation).toContain('有意完成')
    expect(preparation.questions[1]!.options[preparation.questions[1]!.correctIndex]).toBe('有意写好后留下的状态')
  })
})
