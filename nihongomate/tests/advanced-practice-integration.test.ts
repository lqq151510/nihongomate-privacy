import { describe, expect, test } from 'bun:test'
import { N1_ADVANCED_PRACTICE } from '../src/data/n1AdvancedPractice'
import { N2_ADVANCED_PRACTICE } from '../src/data/n2AdvancedPractice'
import { orderStudyQuestion } from '../src/utils/studyQuestionOrder'

describe('N2/N1 篇章练习集成', () => {
  test('各材料和题目跨等级编号唯一，原文依据存在且排序不改变正确选项', () => {
    const passages = [...N2_ADVANCED_PRACTICE, ...N1_ADVANCED_PRACTICE]
    expect(new Set(passages.map(p => p.id)).size).toBe(passages.length)
    const questionIds: string[] = []
    for (const p of passages) {
      expect(p.text.trim().length).toBeGreaterThan(0)
      expect(p.reading.trim().length).toBeGreaterThan(0)
      expect(p.chinese.trim().length).toBeGreaterThan(0)
      expect(p.questions.length).toBeGreaterThanOrEqual(2)
      for (const q of p.questions) {
        questionIds.push(q.id)
        expect(q.options).toHaveLength(4)
        expect(new Set(q.options).size).toBe(4)
        expect(q.correctIndex).toBeGreaterThanOrEqual(0)
        expect(q.correctIndex).toBeLessThan(q.options.length)
        expect(q.evidence.trim().length).toBeGreaterThan(0)
        expect(p.text.includes(q.evidence)).toBe(true)
        const ordered = orderStudyQuestion(q)
        expect(ordered.options[ordered.correctIndex]).toBe(q.options[q.correctIndex])
      }
    }
    expect(new Set(questionIds).size).toBe(questionIds.length)
  })
  test('每级都有阅读、听力及两篇较长阅读', () => {
    for (const [level, items] of [['N2', N2_ADVANCED_PRACTICE], ['N1', N1_ADVANCED_PRACTICE]] as const) {
      expect(items.every(item => item.level === level)).toBe(true)
      expect(items.filter(item => item.kind === 'reading').length).toBeGreaterThanOrEqual(4)
      expect(items.filter(item => item.kind === 'listening').length).toBeGreaterThanOrEqual(4)
      expect(items.filter(item => item.kind === 'reading' && item.text.replace(/\s/gu, '').length >= 700).length).toBeGreaterThanOrEqual(2)
    }
  })
})
