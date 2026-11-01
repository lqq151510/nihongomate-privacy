import { describe, expect, test } from 'bun:test'
import type { AdvancedQuestion } from '../src/data/advancedPracticeTypes'
import { canSubmitAdvancedPractice, chooseAdvancedAnswer, createAdvancedPracticeSession, submitAdvancedPractice } from '../src/utils/advancedPracticeSession'

const questions: AdvancedQuestion[] = [
  { id:'a', prompt:'问题一', options:['甲','乙','丙','丁'], correctIndex:1, explanation:'解析一', evidence:'证据一' },
  { id:'b', prompt:'问题二', options:['甲','乙','丙','丁'], correctIndex:2, explanation:'解析二', evidence:'证据二' },
]

describe('进阶材料整篇答题', () => {
  test('未全部作答无法提交，作答前后均可验证状态', () => {
    let state = createAdvancedPracticeSession()
    expect(canSubmitAdvancedPractice(state, questions)).toBe(false)
    state = chooseAdvancedAnswer(state, questions, 'a', 1)
    expect(submitAdvancedPractice(state, questions).submitted).toBe(false)
    state = chooseAdvancedAnswer(state, questions, 'b', 2)
    expect(canSubmitAdvancedPractice(state, questions)).toBe(true)
    state = submitAdvancedPractice(state, questions)
    expect(state.submitted).toBe(true)
    expect(canSubmitAdvancedPractice(state, questions)).toBe(false)
  })
  test('提交前可以更改答案，提交后不能更改', () => {
    let state = createAdvancedPracticeSession()
    state = chooseAdvancedAnswer(state, questions, 'a', 0)
    state = chooseAdvancedAnswer(state, questions, 'a', 2)
    expect(state.answers.a).toBe(2)
    state = chooseAdvancedAnswer(state, questions, 'b', 3)
    state = submitAdvancedPractice(state, questions)
    expect(chooseAdvancedAnswer(state, questions, 'a', 1)).toBe(state)
    expect(state.answers.a).toBe(2)
  })
  test('空题、未知题与越界答案不会通过提交条件', () => {
    let state = createAdvancedPracticeSession()
    state = chooseAdvancedAnswer(state, questions, 'missing', 0)
    state = chooseAdvancedAnswer(state, questions, 'a', 4)
    expect(state.answers).toEqual({})
    expect(canSubmitAdvancedPractice(state, [])).toBe(false)
    expect(canSubmitAdvancedPractice({ answers: { a: -1, b: 0 }, submitted: false }, questions)).toBe(false)
  })
})
