import { describe, expect, test } from 'bun:test'
import { MOCK_EXAM_BLUEPRINTS, type MockExamLevel } from '../src/data/mockExamBlueprint'
import { MOCK_EXAM_BANK, type MockExamQuestion } from '../src/data/mockExamBank'
import { answerMockExam, createMockExam, planMockExamSections, restoreMockExamState, startNextMockExamSection, submitMockExamSection, summarizeMockExam, tickMockExam } from '../src/utils/mockExam'

function bank(level: MockExamLevel): MockExamQuestion[] {
  return (['vocab', 'grammar', 'reading', 'listening'] as const).map(category => ({
    id: `${level}-${category}`, sourceId: category, level, category, prompt: '問題', options: ['甲', '乙', '丙', '丁'], correctIndex: 1,
    explanation: '解释', ...(category === 'listening' ? { audioReading: 'こんにちは。' } : {}),
  }))
}
const now = 1000000

describe('模拟考场分科和计时', () => {
  test('N1-N5 按等级生成规定时长并归类', () => {
    const expected = { N1: [110, 55], N2: [105, 50], N3: [30, 70, 40], N4: [25, 55, 35], N5: [20, 40, 30] }
    for (const level of Object.keys(expected) as MockExamLevel[]) {
      const exam = createMockExam(level, bank(level), now)!
      expect(exam.sections.map(s => s.durationMinutes)).toEqual(expected[level])
      expect(exam.deadline).toBe(now + expected[level][0]! * 60000)
      expect(exam.sections.map(s => s.id)).toEqual(MOCK_EXAM_BLUEPRINTS[level].map(s => s.id))
    }
  })
  test('缺类别、重复ID、无有效听力或题目非法时拒绝开始', () => {
    const items = bank('N4')
    expect(createMockExam('N4', items.filter(q => q.category !== 'reading'), now)).toBeNull()
    expect(createMockExam('N4', [...items, items[0]!], now)).toBeNull()
    expect(createMockExam('N4', items.map(q => q.category === 'listening' ? { ...q, audioReading: '' } : q), now)).toBeNull()
    expect(createMockExam('N4', items.map(q => q.category === 'vocab' ? { ...q, correctIndex: 6 } : q), now)).toBeNull()
  })
  test('同一素材编号不能混入不同的听力或阅读正文', () => {
    const items = bank('N2')
    const one = { ...items.find(q => q.category === 'reading')!, groupId: 'reading-1', passage: '甲段' }
    const conflicting = { ...one, id: 'different', passage: '乙段' }
    expect(planMockExamSections('N2', [...items.filter(q => q.category !== 'reading'), one, conflicting])).toBeNull()
  })
  test('题目创建快照后源题库变化不影响本次考试', () => {
    const items = bank('N2')
    const session = createMockExam('N2', items, now)!
    items[0]!.options[0] = 'changed'
    expect(session.sections[0]!.questions[0]!.options[0]).toBe('甲')
  })
  test('完整题组尽量填满名额，无法凑满时取不超过上限的最大题量', () => {
    const base = bank('N2')
    const reading = base.find(q => q.category === 'reading')!
    const groups = (sizes: number[]) => sizes.flatMap((size, i) => Array.from({ length: size }, (_, j) => ({
      ...reading, id: `read-${i}-${j}`, sourceId: `read-${i}-${j}`, groupId: `group-${i}`, passage: `文章${i}`,
    })))
    const other = base.filter(q => q.category !== 'reading')
    for (let seed = 0; seed < 20; seed++) {
      const exact = planMockExamSections('N2', [...other, ...groups([3, 3, 3, 3, 3, 2, 2])], seed)!
      expect(exact[0]!.questions.filter(q => q.category === 'reading')).toHaveLength(16)
      const partial = planMockExamSections('N2', [...other, ...groups([3, 3, 3, 3, 3, 3])], seed)!
      expect(partial[0]!.questions.filter(q => q.category === 'reading')).toHaveLength(15)
    }
  })
  test('实际题库生成有界试卷，预览与开始一致，阅读听力素材完整且相邻', () => {
    const expected = { N1: [47, 16], N2: [47, 16], N3: [11, 25, 12], N4: [11, 25, 12], N5: [11, 25, 12] }
    for (const level of Object.keys(expected) as MockExamLevel[]) {
      const preview = planMockExamSections(level, MOCK_EXAM_BANK)!
      const exam = createMockExam(level, MOCK_EXAM_BANK, now)!
      expect(preview.map(s => s.questions.length)).toEqual(expected[level])
      expect(preview.map(s => s.questions.map(q => q.id))).toEqual(exam.sections.map(s => s.questions.map(q => q.id)))
      for (const section of preview) {
        const questions = section.questions
        const rank = (category: MockExamQuestion['category']) => ['vocab','grammar','reading','listening'].indexOf(category)
        expect(questions.map(q => rank(q.category))).toEqual(questions.map(q => rank(q.category)).sort((a,b) => a-b))
        for (const groupId of new Set(questions.map(q => q.groupId).filter((id): id is string => !!id))) {
          const picked = questions.filter(q => q.groupId === groupId)
          const original = MOCK_EXAM_BANK.filter(q => q.level === level && q.groupId === groupId)
          expect(picked.map(q => q.id)).toEqual(original.map(q => q.id))
          const positions = picked.map(q => questions.findIndex(item => item.id === q.id))
          expect(positions[positions.length - 1]! - positions[0]! + 1).toBe(positions.length)
        }
      }
    }
  })
  test('不同种子可换题，相同种子预览、创建和恢复的题目保持一致', () => {
    for (const level of ['N1', 'N2', 'N3', 'N4', 'N5'] as const) {
      const first = planMockExamSections(level, MOCK_EXAM_BANK, 'first')!
      const repeat = planMockExamSections(level, MOCK_EXAM_BANK, 'first')!
      const second = planMockExamSections(level, MOCK_EXAM_BANK, 'second')!
      const ids = (sections: typeof first) => sections.map(section => section.questions.map(question => question.id))
      expect(ids(repeat)).toEqual(ids(first))
      expect(new Set(ids(second).flat())).not.toEqual(new Set(ids(first).flat()))
      const exam = createMockExam(level, MOCK_EXAM_BANK, now, 'first')!
      expect(ids(exam.sections)).toEqual(ids(first))
      expect(ids(restoreMockExamState(JSON.stringify(exam), now + 1)!.sections)).toEqual(ids(first))
      const limits = level === 'N1' || level === 'N2' ? [47, 16] : [11, 25, 12]
      for (const plan of [first, second]) {
        plan.forEach((section, index) => {
          expect(section.questions.length).toBeLessThanOrEqual(limits[index]!)
          for (const groupId of new Set(section.questions.map(q => q.groupId).filter((id): id is string => !!id))) {
            const picked = section.questions.filter(q => q.groupId === groupId)
            const original = MOCK_EXAM_BANK.filter(q => q.level === level && q.groupId === groupId)
            expect(picked.map(q => q.id)).toEqual(original.map(q => q.id))
            const start = section.questions.findIndex(q => q.id === picked[0]!.id)
            expect(section.questions.slice(start, start + picked.length).map(q => q.id)).toEqual(picked.map(q => q.id))
          }
        })
      }
    }
  })
  test('可更改当前科目选项，不能回答其他科目或越界，交卷后不能更改', () => {
    const initial = createMockExam('N5', bank('N5'), now)!
    expect(answerMockExam(initial, 'N5-reading', 0, now)).toBe(initial)
    expect(answerMockExam(initial, 'N5-vocab', 4, now)).toBe(initial)
    const answered = answerMockExam(initial, 'N5-vocab', 0, now + 1)
    const changed = answerMockExam(answered, 'N5-vocab', 1, now + 2)
    expect(initial.sections[0]!.answers).toEqual({})
    expect(changed.sections[0]!.answers['N5-vocab']).toBe(1)
    const submitted = submitMockExamSection(changed, now + 3)
    expect(submitted.phase).toBe('break')
    expect(submitted.sections[0]!.submitReason).toBe('manual')
    expect(answerMockExam(submitted, 'N5-vocab', 2, now + 4).sections[0]!.answers['N5-vocab']).toBe(1)
    expect(submitMockExamSection(submitted, now + 5).phase).toBe('break')
  })
  test('到期自动提交本节且等待手动开考下一节', () => {
    const initial = createMockExam('N4', bank('N4'), now)!
    const deadline = initial.deadline!
    const expired = answerMockExam(initial, 'N4-vocab', 1, deadline)
    expect(expired.sections[0]!.answers).toEqual({})
    expect(expired.sections[0]!.submittedAt).toBe(deadline)
    expect(expired.sections[0]!.submitReason).toBe('timeout')
    expect(expired.phase).toBe('break')
    expect(tickMockExam(expired, deadline + 999999).sectionIndex).toBe(0)
    const next = startNextMockExamSection(expired, deadline + 999999)
    expect(next.sectionIndex).toBe(1)
    expect(next.deadline).toBe(deadline + 999999 + 55 * 60000)
  })
  test('跨后台按绝对截止时间而非刷新次数，并限制时间倒拨', () => {
    const initial = createMockExam('N2', bank('N2'), now)!
    const progressed = tickMockExam(initial, now + 30000)
    const backwards = tickMockExam(progressed, now + 1000)
    expect(backwards.lastObservedAt).toBe(now + 30000)
    expect(backwards.deadline! - backwards.lastObservedAt).toBe(progressed.deadline! - progressed.lastObservedAt)
    const restored = restoreMockExamState(JSON.stringify(backwards), initial.deadline! + 1000)!
    expect(restored.phase).toBe('break')
    expect(restored.sections[0]!.submitReason).toBe('timeout')
  })
  test('完整交卷后汇总、漏答不算正确、重复提交不可改变', () => {
    let state = createMockExam('N2', bank('N2'), now)!
    state = answerMockExam(state, 'N2-vocab', 1, now + 1)
    expect(summarizeMockExam(state)).toBeNull()
    state = submitMockExamSection(state, now + 2)
    state = startNextMockExamSection(state, now + 3)
    state = answerMockExam(state, 'N2-listening', 1, now + 4)
    state = submitMockExamSection(state, now + 5)
    expect(summarizeMockExam(state)).toMatchObject({ total: 4, answered: 2, correct: 2 })
    const repeated = submitMockExamSection(state, now + 6)
    expect(summarizeMockExam(repeated)).toEqual(summarizeMockExam(state))
    expect(startNextMockExamSection(repeated, now + 8).phase).toBe('complete')
  })
  test('拒绝损坏数据、未知题、错误科目、未交卷等伪造快照', () => {
    const state = createMockExam('N2', bank('N2'), now)!
    for (const value of [null, [], '{bad', { ...state, version: 2 }, { ...state, deadline: null }, { ...state, sectionIndex: 4 }, { ...state, phase: 'complete' }, { ...state, sections: [] }]) {
      expect(restoreMockExamState(value, now)).toBeNull()
    }
    const tampered = structuredClone(state)
    tampered.sections[0]!.answers.unknown = 0
    expect(restoreMockExamState(tampered, now)).toBeNull()
  })
})
