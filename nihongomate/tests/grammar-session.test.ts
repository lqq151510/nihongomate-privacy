import { describe, expect, test } from 'bun:test'
import type { GrammarLessonQuestion } from '../src/data/grammarLessons'
import {
  advanceGrammarQuestion, answerGrammarQuestion, createGrammarLearningState,
  createGrammarRetry, createGrammarSession, revealGrammarHint, summarizeGrammarSession,
} from '../src/utils/grammarSession'

const question = (id: string, correctIndex = 1): GrammarLessonQuestion => ({
  id, kind: 'recognition', prompt: '选择合适表达', options: ['A', 'B', 'C', 'D'], correctIndex,
  hint: '注意本题的语境', optionFeedback: ['错因 A', '依据 B', '错因 C', '错因 D'], explanation: '考点说明',
})

describe('语法随堂练习', () => {
  test('题序冻结去重，未作答不能推进，越界与非当前题不可作答', () => {
    const ids = ['q1', 'q1', 'q2']
    const round = createGrammarSession(ids)
    ids.push('q3')
    expect(round.questionIds).toEqual(['q1', 'q2'])
    expect(advanceGrammarQuestion(round)).toBe(round)
    expect(answerGrammarQuestion(round, question('q2'), 1)).toBe(round)
    for (const index of [-1, 4, 1.5, NaN]) expect(answerGrammarQuestion(round, question('q1'), index)).toBe(round)
  })

  test('每题只采纳第一次选择，独立答对与提示后答对分别统计', () => {
    let round = createGrammarSession(['q1', 'q2'])
    round = answerGrammarQuestion(round, question('q1'), 1)
    expect(answerGrammarQuestion(round, question('q1'), 0)).toBe(round)
    expect(revealGrammarHint(round)).toBe(round)
    round = advanceGrammarQuestion(round)
    round = revealGrammarHint(round)
    expect(revealGrammarHint(round)).toBe(round)
    round = answerGrammarQuestion(round, question('q2'), 1)
    round = advanceGrammarQuestion(round)
    expect(round.completed).toBe(true)
    expect(summarizeGrammarSession(round)).toEqual({ total: 2, independentCorrect: 1, hintedCorrect: 1, wrongCount: 0, answeredCount: 2, wrongQuestionIds: [] })
    expect(createGrammarRetry(round)).toBeNull()
    expect(advanceGrammarQuestion(round)).toBe(round)
  })

  test('错题重练只含本轮错题，不改首次成绩或提示记录', () => {
    let first = createGrammarSession(['q1', 'q2'])
    expect(createGrammarRetry(first)).toBeNull()
    first = answerGrammarQuestion(revealGrammarHint(first), question('q1'), 0)
    first = advanceGrammarQuestion(first)
    first = advanceGrammarQuestion(answerGrammarQuestion(first, question('q2'), 1))
    const before = JSON.stringify(first)
    let retry = createGrammarRetry(first)!
    expect(retry.questionIds).toEqual(['q1'])
    expect(retry.hintedQuestionIds).toEqual([])
    retry = advanceGrammarQuestion(answerGrammarQuestion(retry, question('q1'), 1))
    expect(summarizeGrammarSession(retry).independentCorrect).toBe(1)
    expect(JSON.stringify(first)).toBe(before)
    expect(summarizeGrammarSession(first).wrongCount).toBe(1)
  })

  test('空轮次可安全结束，不产生可重练的题', () => {
    const empty = createGrammarSession([])
    expect(empty.completed).toBe(true)
    expect(summarizeGrammarSession(empty).answeredCount).toBe(0)
    expect(advanceGrammarQuestion(empty)).toBe(empty)
    expect(revealGrammarHint(empty)).toBe(empty)
    expect(createGrammarRetry(empty)).toBeNull()
  })

  test('语法点状态彼此独立，父页可以持有草稿和首轮结果', () => {
    const a = createGrammarLearningState()
    const b = createGrammarLearningState()
    a.draft = '私は学生です。'
    a.round = answerGrammarQuestion(createGrammarSession(['q1']), question('q1'), 0)
    a.correctedQuestionIds.push('q1')
    expect(b.draft).toBe('')
    expect(b.round).toBeNull()
    expect(b.correctedQuestionIds).toEqual([])
  })
})
