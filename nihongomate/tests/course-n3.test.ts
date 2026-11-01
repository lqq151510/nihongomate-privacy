import { describe, expect, test } from 'bun:test'
import { N3_COURSE } from '../src/data/courseN3'

describe('N3 课程内容与结构', () => {
  test('单元递进、题目编号唯一且包含可判答内容', () => {
    expect(N3_COURSE).toHaveLength(15)
    const ids = new Set<string>()
    for (const [index, unit] of N3_COURSE.entries()) {
      expect(unit.id).toBe(`n3_unit_${String(index + 1).padStart(2, '0')}`)
      expect(unit.level).toBe('N3')
      expect(unit.title.trim()).not.toBe('')
      expect(unit.goal.trim()).not.toBe('')
      expect(unit.vocabulary.length).toBeGreaterThanOrEqual(4)
      expect(unit.steps.length).toBeGreaterThanOrEqual(3)
      expect(unit.examples.length).toBeGreaterThanOrEqual(3)
      expect(unit.listening.lines.length).toBeGreaterThanOrEqual(3)
      expect(unit.listening.questions).toHaveLength(2)
      expect(unit.reading.questions).toHaveLength(2)
      expect(unit.questions.length).toBeGreaterThanOrEqual(4)
      for (const step of unit.steps) {
        expect(step.title.trim()).not.toBe('')
        expect(step.explanation.trim()).not.toBe('')
      }
      for (const item of [...unit.vocabulary, ...unit.examples, ...unit.listening.lines]) {
        expect(item.japanese.trim()).not.toBe('')
        expect(item.chinese.trim()).not.toBe('')
        expect(item.reading.trim()).not.toBe('')
        expect(item.reading).not.toMatch(/[\p{Script=Han}A-Za-z]/u)
      }
      for (const value of [unit.reading.text, unit.reading.reading, unit.reading.chinese, ...Object.values(unit.output)]) expect(value.trim()).not.toBe('')
      expect(unit.reading.reading).not.toMatch(/[\p{Script=Han}A-Za-z]/u)
      expect(unit.output.reading).not.toMatch(/[\p{Script=Han}A-Za-z]/u)
      for (const question of [...unit.questions, ...unit.listening.questions, ...unit.reading.questions]) {
        expect(ids.has(question.id)).toBe(false)
        ids.add(question.id)
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
    expect(ids.size).toBe(120)
  })
  test('重要用法和基于文本的答案保持一致', () => {
    expect(N3_COURSE[0]!.steps.map(item => item.explanation).join('')).toContain('ようにする')
    expect(N3_COURSE[3]!.questions[0]!.options[N3_COURSE[3]!.questions[0]!.correctIndex]).toBe('行けば')
    expect(N3_COURSE[4]!.reading.questions[0]!.options[N3_COURSE[4]!.reading.questions[0]!.correctIndex]).toBe('开车通勤的人')
    expect(N3_COURSE[5]!.questions[3]!.options[N3_COURSE[5]!.questions[3]!.correctIndex]).toBe('便利なのに')
    expect(N3_COURSE[6]!.questions[2]!.options[N3_COURSE[6]!.questions[2]!.correctIndex]).toBe('明日は休みだそうです。')
    expect(N3_COURSE[8]!.questions[2]!.options[N3_COURSE[8]!.questions[2]!.correctIndex]).toBe('动作全部完成')
  })
  test('部分否定、来源缺失和数量下限不能误判', () => {
    const find = (id: string) => N3_COURSE.find(unit => unit.id === id)!
    const partial = find('n3_unit_12').questions[2]!
    expect(partial.options[partial.correctIndex]).toBe('不能')
    const source = find('n3_unit_13').reading.questions[1]!
    expect(source.options[source.correctIndex]).toBe('没有写')
    const lowerBound = find('n3_unit_14').reading.questions[0]!
    expect(lowerBound.options[lowerBound.correctIndex]).toBe('满足')
  })
})
