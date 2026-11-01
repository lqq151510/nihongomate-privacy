import { describe, expect, test } from 'bun:test'
import { MOCK_EXAM_BANK, type MockExamQuestion } from '../src/data/mockExamBank'
import { MOCK_EXAM_N1_LONG_20261101 } from '../src/data/mockExamN1Long20261101'
import { MOCK_EXAM_N2_LONG_20261101 } from '../src/data/mockExamN2Long20261101'
import { planMockExamSections } from '../src/utils/mockExam'
import { segmentPracticeAudio } from '../src/utils/advancedPracticeAudio'

describe('N2、N1 长篇与听力扩充', () => {
  for (const [level, additions] of [['N2', MOCK_EXAM_N2_LONG_20261101], ['N1', MOCK_EXAM_N1_LONG_20261101]] as const) {
    test(`${level} 新题包含多篇材料，音频能按句切分`, () => {
      const bankIds = new Set(MOCK_EXAM_BANK.map(q => q.id))
      expect(additions.every(q => q.level === level && bankIds.has(q.id))).toBe(true)
      expect(additions.filter(q => q.category === 'vocab').length).toBeGreaterThanOrEqual(20)
      const uniqueGroups = (category: MockExamQuestion['category']) =>
        [...new Map(additions.filter(q => q.category === category).map(q => [q.groupId, q])).values()]
      const readings = uniqueGroups('reading')
      const listening = uniqueGroups('listening')
      expect(readings.length).toBeGreaterThanOrEqual(3)
      expect(listening.length).toBeGreaterThanOrEqual(4)
      expect(readings.every(q => !!q.groupId && !!q.passage)).toBe(true)
      expect(Math.max(...readings.map(q => Array.from(q.passage!.replace(/\s/gu, '')).length))).toBeGreaterThanOrEqual(700)
      for (const q of listening) {
        expect(q.groupId).toBeTruthy()
        expect(q.transcript?.trim()).toBeTruthy()
        expect(q.audioReading?.trim()).toBeTruthy()
        expect(q.audioReading).not.toMatch(/[\p{Script=Han}]/u)
        expect(segmentPracticeAudio(q.audioReading!).length).toBeGreaterThan(1)
      }
    })

    test(`${level} 新增题在不同随机考卷中可被选中`, () => {
      const unseen = new Set(additions.map(q => q.id))
      for (let seed = 0; seed < 300 && unseen.size; seed++) {
        const plan = planMockExamSections(level, MOCK_EXAM_BANK, `long-${seed}`)
        expect(plan).not.toBeNull()
        for (const q of plan!.flatMap(section => section.questions)) unseen.delete(q.id)
      }
      expect([...unseen]).toEqual([])
    })
  }
})
