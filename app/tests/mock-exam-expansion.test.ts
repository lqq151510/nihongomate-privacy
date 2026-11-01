import { describe, expect, test } from 'bun:test'
import { MOCK_EXAM_BANK, type MockExamCategory, type MockExamLevel } from '../src/data/mockExamBank'
import { MOCK_EXAM_N5_N3_EXPANSION } from '../src/data/mockExamN5N3Expansion'
import { MOCK_EXAM_N2_EXPANSION } from '../src/data/mockExamN2Expansion'
import { MOCK_EXAM_N1_EXPANSION } from '../src/data/mockExamN1Expansion'
import { planMockExamSections } from '../src/utils/mockExam'

const additions = [...MOCK_EXAM_N5_N3_EXPANSION, ...MOCK_EXAM_N2_EXPANSION, ...MOCK_EXAM_N1_EXPANSION]
const levels: MockExamLevel[] = ['N5', 'N4', 'N3', 'N2', 'N1']
const categories: MockExamCategory[] = ['vocab', 'reading', 'listening']

describe('新增考场题组', () => {
  test('各等级词汇、阅读、听力新增题均已并入题库', () => {
    const bankIds = new Set(MOCK_EXAM_BANK.map(q => q.id))
    expect(new Set(additions.map(q => q.id)).size).toBe(additions.length)
    for (const level of levels) for (const category of categories) {
      const questions = additions.filter(q => q.level === level && q.category === category)
      expect(questions.length).toBeGreaterThan(0)
      expect(questions.every(q => bankIds.has(q.id))).toBe(true)
    }
  })

  test('不同种子实际能抽到新增的各等级、各类别题目', () => {
    const addedIds = new Set(additions.map(q => q.id))
    for (const level of levels) {
      const seen = new Set<MockExamCategory>()
      for (let seed = 0; seed < 64 && seen.size < categories.length; seed++) {
        const sections = planMockExamSections(level, MOCK_EXAM_BANK, seed)
        expect(sections).not.toBeNull()
        for (const q of sections!.flatMap(s => s.questions)) if (addedIds.has(q.id)) seen.add(q.category)
      }
      for (const category of categories) expect(seen.has(category)).toBe(true)
    }
  })
})
