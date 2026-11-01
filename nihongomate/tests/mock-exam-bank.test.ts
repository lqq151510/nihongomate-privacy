import { describe, expect, test } from 'bun:test'
import { MOCK_EXAM_BANK, type MockExamCategory, type MockExamLevel } from '../src/data/mockExamBank'

const levels: MockExamLevel[] = ['N5', 'N4', 'N3', 'N2', 'N1']
const categories: MockExamCategory[] = ['vocab', 'grammar', 'reading', 'listening']

describe('模拟考场可用题库', () => {
  test('N4 延误题的正确选项与信号故障原文一致', () => {
    const question = MOCK_EXAM_BANK.find(item => item.sourceId === 'exam_n4_1')!
    expect(question.audioReading).toContain('しんごうトラブル')
    expect(question.options[question.correctIndex]).toContain('信号トラブル')
  })
  test('各等级均有四类题目，编号全局唯一', () => {
    expect(new Set(MOCK_EXAM_BANK.map(q => q.id)).size).toBe(MOCK_EXAM_BANK.length)
    for (const level of levels) for (const category of categories) {
      expect(MOCK_EXAM_BANK.filter(q => q.level === level && q.category === category).length).toBeGreaterThan(0)
    }
  })
  test('每题有来源、四个不同选项、有效答案和解析；阅读有原文、听力有假名音频', () => {
    for (const q of MOCK_EXAM_BANK) {
      expect(q.sourceId.trim().length).toBeGreaterThan(0)
      expect(q.prompt.trim().length).toBeGreaterThan(0)
      expect(q.options).toHaveLength(4)
      expect(new Set(q.options).size).toBe(4)
      expect(q.correctIndex).toBeGreaterThanOrEqual(0)
      expect(q.correctIndex).toBeLessThan(4)
      expect(q.explanation.trim().length).toBeGreaterThan(0)
      if (q.category === 'reading') expect(q.passage?.trim().length).toBeGreaterThan(0)
      if (q.category === 'listening') {
        expect(q.audioReading?.trim().length).toBeGreaterThan(0)
        expect(q.audioReading).not.toMatch(/[\p{Script=Han}]/u)
      }
    }
  })
  test('同组题关联同一篇文章或同一段语音，避免题目与材料错配', () => {
    const groups = new Map<string, { category: MockExamCategory; level: MockExamLevel; content: string }>()
    for (const q of MOCK_EXAM_BANK) {
      if (!q.groupId) continue
      const content = q.category === 'reading' ? q.passage ?? '' : q.audioReading ?? ''
      const old = groups.get(q.groupId)
      if (old) expect({ category: q.category, level: q.level, content }).toEqual(old)
      else groups.set(q.groupId, { category: q.category, level: q.level, content })
    }
  })
  test('高级篇章题共享文段但题号独立', () => {
    const q = MOCK_EXAM_BANK.filter(x => x.groupId === 'advanced:n1_adv_r01')
    expect(q.length).toBeGreaterThan(1)
    expect(new Set(q.map(x => x.id)).size).toBe(q.length)
    expect(new Set(q.map(x => x.passage)).size).toBe(1)
  })
})
