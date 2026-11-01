import { describe, expect, test } from 'bun:test'
import { N1_ADVANCED_PRACTICE } from '../src/data/n1AdvancedPractice'

describe('N1 进阶原创阅读和听力', () => {
  const readings = N1_ADVANCED_PRACTICE.filter(item => item.kind === 'reading')
  const listenings = N1_ADVANCED_PRACTICE.filter(item => item.kind === 'listening')
  test('分级材料和题目 ID 唯一，长篇与听力有足够的练习内容', () => {
    expect(readings).toHaveLength(4)
    expect(listenings).toHaveLength(4)
    expect(readings.filter(item => item.text.length >= 800)).toHaveLength(2)
    expect(readings.every(item => item.text.length >= 400)).toBe(true)
    expect(listenings.every(item => item.text.length >= 200)).toBe(true)
    expect(new Set(N1_ADVANCED_PRACTICE.map(item => item.id)).size).toBe(8)
    const ids = N1_ADVANCED_PRACTICE.flatMap(item => item.questions.map(q => q.id))
    expect(ids).toHaveLength(28)
    expect(new Set(ids).size).toBe(ids.length)
  })
  test('每题具有可定位原文的证据、独立解析和四个有效选项', () => {
    for (const item of N1_ADVANCED_PRACTICE) {
      expect(item.level).toBe('N1')
      expect(item.context.trim()).not.toBe('')
      expect(item.chinese.trim()).not.toBe('')
      expect(item.reading).not.toMatch(/[一-龯]/u)
      expect(item.reading).not.toContain('。。')
      for (const q of item.questions) {
        expect(q.prompt.trim()).not.toBe('')
        expect(q.options).toHaveLength(4)
        expect(new Set(q.options).size).toBe(4)
        expect(Number.isInteger(q.correctIndex)).toBe(true)
        expect(q.correctIndex).toBeGreaterThanOrEqual(0)
        expect(q.correctIndex).toBeLessThan(4)
        expect(q.explanation.trim()).not.toBe('')
        expect(q.evidence.trim().length).toBeGreaterThan(5)
        expect(item.text).toContain(q.evidence)
      }
    }
  })
  test('读音辅助纠正常见多音和数量词', () => {
    const meeting = listenings.find(item => item.id === 'n1_adv_l01')!
    const survey = listenings.find(item => item.id === 'n1_adv_l02')!
    const training = listenings.find(item => item.id === 'n1_adv_l03')!
    expect(meeting.reading).toContain('よみづらいかた')
    expect(survey.reading).toContain('ちょうさをおこなった')
    expect(survey.reading).toContain('ひろばをとおる')
    expect(training.reading).toContain('どちらかいちにち')
    expect(training.reading).toContain('しめきりごに')
  })
})
