import { describe, expect, test } from 'bun:test'
import { N2_ADVANCED_PRACTICE } from '../src/data/n2AdvancedPractice'

describe('N2 原创篇章听读', () => {
  test('内容及原文依据可追踪，日文、读音与译文按句对应', () => {
    const reading = N2_ADVANCED_PRACTICE.filter(item => item.kind === 'reading')
    const listening = N2_ADVANCED_PRACTICE.filter(item => item.kind === 'listening')
    expect(reading).toHaveLength(4)
    expect(listening).toHaveLength(4)
    expect(reading.filter(item => item.text.replace(/\s/g, '').length >= 700)).toHaveLength(2)
    expect(new Set(N2_ADVANCED_PRACTICE.map(item => item.id)).size).toBe(N2_ADVANCED_PRACTICE.length)
    const questionIds = new Set<string>()
    for (const item of N2_ADVANCED_PRACTICE) {
      expect(item.level).toBe('N2')
      expect(item.text.split('\n').length).toBe(item.reading.split('\n').length)
      expect(item.text.split('\n').length).toBe(item.chinese.split('\n').length)
      expect(item.reading).toMatch(/^[ぁ-ゖァ-ヺー、。「」！？\s]+$/u)
      expect(item.questions.length).toBe(item.kind === 'reading' ? 4 : 2)
      for (const q of item.questions) {
        expect(questionIds.has(q.id)).toBe(false)
        questionIds.add(q.id)
        expect(q.options).toHaveLength(4)
        expect(new Set(q.options).size).toBe(4)
        expect(q.correctIndex).toBeGreaterThanOrEqual(0)
        expect(q.correctIndex).toBeLessThan(4)
        expect(q.evidence.length).toBeGreaterThan(4)
        expect(item.text.includes(q.evidence)).toBe(true)
        expect(q.explanation.trim().length).toBeGreaterThan(0)
      }
    }
  })
  test('对需要兼顾两方的材料，选项不是仅看单一指标', () => {
    const passage = N2_ADVANCED_PRACTICE.find(item => item.id === 'n2_advanced_r01')!
    const question = passage.questions[3]!
    expect(question.options[question.correctIndex]).toBe('利用者の違いと、変更による別の影響の両方を確かめるべきだ')
    expect(passage.text).toContain('受け取り期限')
    expect(passage.text).toContain('待ち時間')
  })
  test('收听报名通知时，不把抽选误判为先到先得', () => {
    const passage = N2_ADVANCED_PRACTICE.find(item => item.id === 'n2_advanced_l02')!
    const question = passage.questions[0]!
    expect(question.options[question.correctIndex]).toBe('期限までの申込者から抽選する')
    expect(passage.text).toContain('申し込み順で決まるのではなく')
  })
})
