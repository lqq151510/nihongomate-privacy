import { describe, expect, test } from 'bun:test'
import { createPracticeSession, answerPracticeQuestion, advancePracticeQuestion, summarizePracticeSession } from '../src/utils/practiceSession'

describe('固定练习轮次', () => {
  test('复制且去重题序，移出历史收藏不改变本轮题目或答案', () => {
    const savedMistakes = ['q1', 'q2', 'q2', 'q3']
    let session = createPracticeSession(savedMistakes)
    session = answerPracticeQuestion(session, 'q1', 0, 0)
    savedMistakes.splice(0, savedMistakes.length)
    expect(session.questionIds).toEqual(['q1', 'q2', 'q3'])
    expect(session.currentIndex).toBe(0)
    expect(session.answers.q1?.selectedOptionIndex).toBe(0)
    session = advancePracticeQuestion(session)
    expect(session.questionIds[session.currentIndex]).toBe('q2')
    expect(session.answers.q2).toBeUndefined()
  })

  test('只接受当前题一次有效答案，未作答不可跳到下一题', () => {
    const initial = createPracticeSession(['q1', 'q2'])
    expect(advancePracticeQuestion(initial)).toBe(initial)
    expect(answerPracticeQuestion(initial, 'q2', 1, 1)).toBe(initial)
    expect(answerPracticeQuestion(initial, 'q1', -1, 1)).toBe(initial)
    const answered = answerPracticeQuestion(initial, 'q1', 2, 1)
    expect(answerPracticeQuestion(answered, 'q1', 1, 1)).toBe(answered)
    expect(summarizePracticeSession(answered)).toMatchObject({ answeredCount: 1, correctCount: 0, wrongQuestionIds: ['q1'] })
  })

  test('轮次完成后不循环，成绩不依赖历史错题本', () => {
    let session = createPracticeSession(['q1', 'q2', 'q3'])
    for (const [id, selected] of [['q1', 0], ['q2', 1], ['q3', 0]] as const) {
      session = answerPracticeQuestion(session, id, selected, 0)
      session = advancePracticeQuestion(session)
    }
    expect(session.completed).toBe(true)
    expect(advancePracticeQuestion(session)).toBe(session)
    expect(answerPracticeQuestion(session, 'q3', 2, 0)).toBe(session)
    expect(summarizePracticeSession(session)).toEqual({
      total: 3, answeredCount: 3, correctCount: 2, wrongQuestionIds: ['q2'], streak: 1, maxStreak: 1, accuracy: 67,
    })
  })

  test('只重练本轮错误；重练和重新开始均重置连对与成绩', () => {
    let session = createPracticeSession(['q1', 'q2', 'q3'])
    for (const [id, selected] of [['q1', 0], ['q2', 0], ['q3', 1]] as const) {
      session = answerPracticeQuestion(session, id, selected, 0)
      session = advancePracticeQuestion(session)
    }
    expect(summarizePracticeSession(session).maxStreak).toBe(2)
    const retry = createPracticeSession(summarizePracticeSession(session).wrongQuestionIds)
    expect(retry.questionIds).toEqual(['q3'])
    expect(summarizePracticeSession(retry)).toMatchObject({ answeredCount: 0, correctCount: 0, maxStreak: 0, streak: 0, accuracy: 0 })
    expect(summarizePracticeSession(createPracticeSession(session.questionIds)).maxStreak).toBe(0)
  })

  test('空轮次不产生 NaN 正确率或可推进的题目', () => {
    const empty = createPracticeSession([])
    expect(summarizePracticeSession(empty)).toMatchObject({ total: 0, answeredCount: 0, accuracy: 0, wrongQuestionIds: [] })
    expect(advancePracticeQuestion(empty)).toBe(empty)
  })
})
