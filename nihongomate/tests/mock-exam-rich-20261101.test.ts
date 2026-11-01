import { describe, expect, test } from 'bun:test'
import { MOCK_EXAM_BANK } from '../src/data/mockExamBank'
import { MOCK_EXAM_N1_RICH_20261101 } from '../src/data/mockExamN1Rich20261101'
import { MOCK_EXAM_N2_RICH_20261101 } from '../src/data/mockExamN2Rich20261101'
import { segmentPracticeAudio } from '../src/utils/advancedPracticeAudio'
import { planMockExamSections } from '../src/utils/mockExam'

describe('N1、N2 长篇与近义词扩充', () => {
  for (const [level, additions, minLength] of [
    ['N1', MOCK_EXAM_N1_RICH_20261101, 900],
    ['N2', MOCK_EXAM_N2_RICH_20261101, 800],
  ] as const) {
    test(`${level} 包含较长文章、词汇与可分段听力`, () => {
      const bankIds = new Set(MOCK_EXAM_BANK.map(q => q.id))
      expect(additions.every(q => q.level === level && bankIds.has(q.id))).toBe(true)
      expect(additions.filter(q => q.category === 'vocab').length).toBeGreaterThanOrEqual(20)
      const readings = [...new Map(additions.filter(q => q.category === 'reading').map(q => [q.groupId, q])).values()]
      expect(readings.length).toBeGreaterThanOrEqual(3)
      expect(readings.filter(q => Array.from((q.passage ?? '').replace(/\s/gu, '')).length >= minLength).length).toBeGreaterThanOrEqual(2)
      const listening = [...new Map(additions.filter(q => q.category === 'listening').map(q => [q.groupId, q])).values()]
      expect(listening.length).toBeGreaterThanOrEqual(3)
      for (const q of listening) {
        expect(q.transcript?.trim()).toBeTruthy()
        expect(q.audioReading).not.toMatch(/[\p{Script=Han}]/u)
        const chunks = segmentPracticeAudio(q.audioReading ?? '')
        expect(chunks.length).toBeGreaterThan(1)
        expect(chunks.every(chunk => Array.from(chunk).length <= 100)).toBe(true)
      }
    })
    test(`${level} 不同考卷能够抽取每一道新增题`, () => {
      const unseen = new Set(additions.map(q => q.id))
      for (let seed = 0; seed < 400 && unseen.size; seed++) {
        const plan = planMockExamSections(level, MOCK_EXAM_BANK, `rich-${seed}`)
        expect(plan).not.toBeNull()
        for (const question of plan!.flatMap(section => section.questions)) unseen.delete(question.id)
      }
      expect([...unseen]).toEqual([])
    })
  }
})
