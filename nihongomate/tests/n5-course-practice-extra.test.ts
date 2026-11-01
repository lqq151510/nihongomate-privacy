import { describe, expect, test } from 'bun:test'
import { N5_COURSE } from '../src/data/n5Course'
import { N5_COURSE_PRACTICE_EXTRA } from '../src/data/n5CoursePracticeExtra'

describe('N5 单元补充听力和阅读', () => {
  test('每个现有单元有一组听力、阅读及各两题，题号全局唯一', () => {
    expect(N5_COURSE_PRACTICE_EXTRA.map(x => x.unitId)).toEqual(N5_COURSE.map(x => x.id))
    const questions = N5_COURSE_PRACTICE_EXTRA.flatMap(x => [...x.listening.questions, ...x.reading.questions])
    expect(questions).toHaveLength(48)
    expect(new Set(questions.map(q => q.id)).size).toBe(48)
    for (const x of N5_COURSE_PRACTICE_EXTRA) {
      expect(x.listening.lines.length).toBeGreaterThanOrEqual(3)
      expect(x.listening.lines.length).toBeLessThanOrEqual(5)
      expect(x.listening.questions).toHaveLength(2)
      expect(x.reading.questions).toHaveLength(2)
      for (const text of [x.listening.title,x.listening.situation,x.reading.title,x.reading.text,x.reading.chinese]) expect(text.trim().length).toBeGreaterThan(0)
      for (const line of x.listening.lines) {
        for (const text of [line.speaker,line.japanese,line.chinese]) expect(text.trim().length).toBeGreaterThan(0)
        expect(line.reading).toMatch(/^[ぁ-ゖァ-ヺー、。「」！？\s]+$/u)
      }
      expect(x.reading.reading).toMatch(/^[ぁ-ゖァ-ヺー、。「」！？\s]+$/u)
      for (const q of [...x.listening.questions,...x.reading.questions]) {
        expect(q.options).toHaveLength(4)
        expect(new Set(q.options).size).toBe(4)
        expect(q.prompt.trim().length).toBeGreaterThan(0)
        expect(q.explanation.trim().length).toBeGreaterThan(0)
        expect(Number.isInteger(q.correctIndex)).toBe(true)
        expect(q.correctIndex).toBeGreaterThanOrEqual(0)
        expect(q.correctIndex).toBeLessThan(4)
      }
    }
  })
  test('计算题按实际购买的数量和单价回答', () => {
    const shopping = N5_COURSE_PRACTICE_EXTRA.find(x => x.unitId === 'n5_unit_04')!
    expect(shopping.reading.text).toContain('みかんは一つ五十円')
    expect(shopping.reading.text).toContain('みかんを二つ')
    const q = shopping.reading.questions[1]!
    expect(q.options[q.correctIndex]).toBe('一百日元')
  })
  test('否定请求与肯定请求分开理解', () => {
    const listening = N5_COURSE_PRACTICE_EXTRA.find(x => x.unitId === 'n5_unit_09')!.listening
    expect(listening.lines.map(line => line.japanese).join('')).toContain('話さないでください')
    expect(listening.questions[0]!.options[listening.questions[0]!.correctIndex]).toBe('说话')
    expect(listening.questions[1]!.options[listening.questions[1]!.correctIndex]).toBe('看书')
  })
})
