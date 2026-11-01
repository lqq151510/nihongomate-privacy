import { describe, expect, test } from 'bun:test'
import { buildListeningOptions, normalizeListeningReading } from '../src/utils/listeningOptions'
import { COMPREHENSIVE_VOCAB } from '../src/data/vocab'

const flower = { id: 'flower', reading: 'はな' }
const pool = [
  flower,
  { id: 'nose', reading: 'ハナ' },
  { id: 'halfwidth-flower', reading: ' ﾊﾅ ' },
  { id: 'rain', reading: 'あめ' },
  { id: 'candy', reading: 'アメ' },
  { id: 'cat', reading: 'ねこ' },
  { id: 'dog', reading: 'いぬ' },
]

describe('单词辨音选项', () => {
  test('全半角、分解浊点、片假名与空白按同一读音归一', () => {
    expect(normalizeListeningReading('　ｶﾞｯｺｳ \n')).toBe('がっこう')
    expect(normalizeListeningReading('カ\u3099ッコウ')).toBe('がっこう')
    expect(normalizeListeningReading('ヴァイオリン')).toBe('ゔぁいおりん')
    expect(normalizeListeningReading('')).toBe('')
    expect(normalizeListeningReading('はな')).not.toBe(normalizeListeningReading('はん'))
  })

  test('排除答案同音词，也避免干扰项彼此同音；不修改词库', () => {
    const before = JSON.stringify(pool)
    for (const value of [0, 0.25, 0.5, 0.99]) {
      const result = buildListeningOptions(flower, pool, () => value)
      expect(result).toHaveLength(4)
      expect(result.filter(item => item.id === flower.id)).toHaveLength(1)
      expect(result.some(item => item.id === 'nose' || item.id === 'halfwidth-flower')).toBe(false)
      expect(new Set(result.map(item => normalizeListeningReading(item.reading))).size).toBe(4)
    }
    expect(JSON.stringify(pool)).toBe(before)
  })

  test('没有答案、空读音或不足三个可区分干扰项时不生成送分题', () => {
    expect(buildListeningOptions(undefined, pool)).toEqual([])
    expect(buildListeningOptions({ id: 'empty', reading: '　 ' }, pool)).toEqual([])
    expect(buildListeningOptions(flower, [])).toEqual([])
    expect(buildListeningOptions(flower, pool.slice(0, 6))).toEqual([])
    expect(buildListeningOptions(flower, [flower, { id: 'nose', reading: 'はな' }])).toEqual([])
  })

  test('空读音和重复编号不会补足可用选项', () => {
    expect(buildListeningOptions(flower, [
      { id: 'a', reading: 'ねこ' }, { id: 'a', reading: 'いぬ' },
      { id: 'b', reading: 'あめ' }, { id: 'blank', reading: ' ' },
      { id: flower.id, reading: 'やま' },
    ])).toEqual([])
  })

  test('真实五级词库中的同音词样本生成读音唯一的四选一', () => {
    for (const level of ['N5', 'N4', 'N3', 'N2', 'N1']) {
      const words = COMPREHENSIVE_VOCAB.filter(item => item.level === level)
      const groups = new Map<string, typeof words>()
      for (const word of words) {
        const key = normalizeListeningReading(word.reading)
        groups.set(key, [...(groups.get(key) ?? []), word])
      }
      const homophones = [...groups.values()].filter(items => items.length > 1)
      expect(homophones.length).toBeGreaterThan(0)
      for (const group of homophones) {
        const answer = group[0]!
        const options = buildListeningOptions(answer, words, () => 0.5)
        expect(options).toHaveLength(4)
        expect(options.filter(item => item.id === answer.id)).toHaveLength(1)
        expect(new Set(options.map(item => normalizeListeningReading(item.reading))).size).toBe(4)
      }
    }
  })
})
