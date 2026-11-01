import { describe, expect, test } from 'bun:test'
import { MOCK_EXAM_EXTRA_VOCAB } from '../src/data/mockExamExtraVocab'

describe('新增汉字读音题', () => {
  test('每级10题，编号唯一，选项合法且读音有解释', () => {
    expect(MOCK_EXAM_EXTRA_VOCAB).toHaveLength(50)
    expect(new Set(MOCK_EXAM_EXTRA_VOCAB.map(q => q.id)).size).toBe(50)
    for (const level of ['N5','N4','N3','N2','N1']) expect(MOCK_EXAM_EXTRA_VOCAB.filter(q => q.level === level)).toHaveLength(10)
    for (const q of MOCK_EXAM_EXTRA_VOCAB) {
      expect(q.options).toHaveLength(4)
      expect(new Set(q.options).size).toBe(4)
      expect(q.explanation).toContain(q.options[q.correctIndex]!)
      for (const option of q.options) expect(option).toMatch(/^[ぁ-ゖー]+$/u)
    }
  })
  test('词典收录的异读不作为错误选项', () => {
    const daily = MOCK_EXAM_EXTRA_VOCAB.find(q => q.prompt.includes('毎日'))!
    const sequential = MOCK_EXAM_EXTRA_VOCAB.find(q => q.prompt.includes('逐次'))!
    expect(daily.options).not.toContain('まいじつ')
    expect(sequential.options).not.toContain('ちくし')
  })
})
