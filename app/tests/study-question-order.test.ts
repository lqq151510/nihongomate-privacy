import { describe, expect, test } from 'bun:test'
import { orderStudyQuestion } from '../src/utils/studyQuestionOrder'

describe('练习选项稳定排序', () => {
  test('重排后正确答案不变，题目多次读取不跳动', () => {
    const question = { id:'n4_u01_g1', prompt:'题目', options:['正确','甲','乙','丙'], correctIndex:0, explanation:'解析' }
    const ordered = orderStudyQuestion(question)
    expect(ordered.options[ordered.correctIndex]).toBe('正确')
    expect(orderStudyQuestion(question)).toEqual(ordered)
    expect(question.options[0]).toBe('正确')
  })
  test('不同题的正确选项位置被分散', () => {
    const positions = Array.from({ length: 12 }, (_, i) => orderStudyQuestion({ id:`unit_q${i}`, prompt:'', options:['正确','甲','乙','丙'], correctIndex:0, explanation:'' }).correctIndex)
    expect(new Set(positions).size).toBeGreaterThan(1)
  })
})
