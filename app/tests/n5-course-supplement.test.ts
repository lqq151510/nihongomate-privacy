import { describe, expect, test } from 'bun:test'
import { N5_COURSE } from '../src/data/n5Course'
import { N5_COURSE_SUPPLEMENTS } from '../src/data/n5CourseSupplement'

describe('N5 分单元补充内容', () => {
  test('十二单元对应原课程，词句、讲解和题目结构完整且题目 ID 唯一', () => {
    expect(N5_COURSE_SUPPLEMENTS.map(item => item.unitId)).toEqual(N5_COURSE.map(item => item.id))
    const ids = new Set<string>()
    for (const unit of N5_COURSE_SUPPLEMENTS) {
      expect(unit.steps.length).toBeGreaterThanOrEqual(2)
      expect(unit.examples.length).toBeGreaterThanOrEqual(4)
      expect(unit.questions.length).toBeGreaterThanOrEqual(6)
      for (const step of unit.steps) expect(step.title.trim() && step.explanation.trim()).toBeTruthy()
      for (const sentence of unit.examples) {
        expect(sentence.japanese.trim() && sentence.chinese.trim()).toBeTruthy()
        expect(sentence.reading).toMatch(/^[ぁ-ゖァ-ヺー、。「」！？\s]+$/u)
      }
      for (const q of unit.questions) {
        expect(ids.has(q.id)).toBe(false)
        ids.add(q.id)
        expect(q.id.startsWith(`${unit.unitId}_supp_`)).toBe(true)
        expect(q.options).toHaveLength(4)
        expect(new Set(q.options).size).toBe(4)
        expect(q.options.every(option => option.trim().length > 0)).toBe(true)
        expect(Number.isInteger(q.correctIndex)).toBe(true)
        expect(q.correctIndex).toBeGreaterThanOrEqual(0)
        expect(q.correctIndex).toBeLessThan(4)
        expect(q.prompt.trim() && q.explanation.trim()).toBeTruthy()
      }
    }
  })
  test('重点例外及含义有可核对的正确答案', () => {
    const question = (unit: number, clue: string) => N5_COURSE_SUPPLEMENTS[unit - 1]!.questions.find(q => q.prompt.includes(clue))!
    for (const [unit, clue, answer] of [
      [3, '四時', 'よじ'], [3, '九時', 'くじ'], [4, '三百円', 'さんびゃくえん'],
      [6, '「いい」', 'よかったです'], [8, '「行く」', '行って'],
      [9, '「買う」', '買わない'], [9, '「来る」', 'こない'], [12, '二人', 'ふたり'],
    ] as const) {
      const q = question(unit, clue)
      expect(q).toBeDefined()
      expect(q.options[q.correctIndex]).toBe(answer)
    }
  })
})
