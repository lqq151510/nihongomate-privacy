import { describe, expect, test } from 'bun:test'
import { REAL_LISTENING_SCENARIOS } from '../src/data/listeningScenarios'
import { EXTRA_LISTENING_SCENARIOS } from '../src/data/extraListeningScenarios'
import { buildListeningSentences, LISTENING_SENTENCES, nextListeningSentenceIndex } from '../src/utils/listeningSentences'

describe('新增情景对话内容', () => {
  test('每级新增四个场景，与已有场景编号不冲突', () => {
    expect(EXTRA_LISTENING_SCENARIOS).toHaveLength(20)
    for (const level of ['N5', 'N4', 'N3', 'N2', 'N1']) expect(EXTRA_LISTENING_SCENARIOS.filter(scene => scene.level === level)).toHaveLength(4)
    const all = [...REAL_LISTENING_SCENARIOS, ...EXTRA_LISTENING_SCENARIOS]
    expect(new Set(all.map(scene => scene.id)).size).toBe(all.length)
    expect(all).toHaveLength(30)
  })

  test('每场至少六句完整双人对话，读音无汉字或拉丁字母', () => {
    const japanese = new Set<string>()
    for (const scene of EXTRA_LISTENING_SCENARIOS) {
      expect(scene.sentences.length).toBeGreaterThanOrEqual(6)
      expect(new Set(scene.sentences.map(line => line.speaker)).size).toBe(2)
      expect(scene.scene).toStartWith('练习场景')
      for (const line of scene.sentences) {
        expect(line.japanese.trim().length).toBeGreaterThan(0)
        expect(line.furigana.trim().length).toBeGreaterThan(0)
        expect(line.chinese.trim().length).toBeGreaterThan(0)
        expect(line.furigana).not.toMatch(/[\p{Script=Han}A-Za-z0-9]/u)
        japanese.add(line.japanese)
      }
    }
    expect(japanese.size).toBeGreaterThanOrEqual(115)
  })

  test('理解题四选项不重复、答案有效、解析齐全且答案位置均有覆盖', () => {
    const positions = new Set<number>()
    for (const scene of EXTRA_LISTENING_SCENARIOS) {
      const question = scene.comprehensionQuestion
      expect(question.question.trim()).not.toBe('')
      expect(question.options).toHaveLength(4)
      expect(new Set(question.options).size).toBe(4)
      expect(Number.isInteger(question.correctAnswer)).toBe(true)
      expect(question.correctAnswer).toBeGreaterThanOrEqual(0)
      expect(question.correctAnswer).toBeLessThan(4)
      expect(question.explanation.trim().length).toBeGreaterThan(10)
      positions.add(question.correctAnswer)
    }
    expect([...positions].sort()).toEqual([0, 1, 2, 3])
  })
})

describe('句子精听例句汇总', () => {
  const first = { japanese: '私は学生です。', furigana: 'わたしはがくせいです。', chinese: '我是学生。' }
  const extra = { japanese: '猫がいます。', furigana: 'ねこがいます。', chinese: '有猫。' }
  const word = { japanese: '本を読みます。', furigana: 'ほんをよみます。', chinese: '看书。' }
  const curriculum = [{ level: 'N5' as const, chapters: [{ grammars: [{ id: 'g1', pattern: 'AはBです', exampleSentence: first, extraExamples: [extra] }] }] }]

  test('汇总主例句、扩展示例和有例句的词条，不补造缺失例句', () => {
    const vocabulary = [
      { id: 'v1', level: 'N5' as const, kanji: '本', example: word },
      { id: 'v2', level: 'N4' as const, kanji: '未附例句' },
    ]
    const result = buildListeningSentences(curriculum, vocabulary)
    expect(result.map(item => item.japanese)).toEqual([first.japanese, extra.japanese, word.japanese])
    expect(result[1].sourceLabel).toContain('扩展示例')
    expect(result[2].reading).toBe(word.furigana)
    expect(result[2].sourceLabel).toContain('本')
  })

  test('相同日文只保留一次，空白与全角兼容归一，输入不被修改', () => {
    const vocabulary = [
      { id: 'v1', level: 'N5' as const, kanji: '私', example: { ...first, japanese: ' 私 は学生です。 ' } },
      { id: 'v2', level: 'N5' as const, kanji: '缺读音', example: { ...word, furigana: '' } },
    ]
    const original = JSON.stringify({ curriculum, vocabulary })
    const result = buildListeningSentences(curriculum, vocabulary)
    expect(result).toHaveLength(2)
    expect(result[0].sourceLabel).toStartWith('语法例句')
    expect(JSON.stringify({ curriculum, vocabulary })).toBe(original)
  })

  test('句子编号基于文本，增加其他词条不改变原编号', () => {
    const before = buildListeningSentences([], [{ id: 'v1', level: 'N5', kanji: '本', example: word }])
    const after = buildListeningSentences(curriculum, [{ id: 'v1', level: 'N5', kanji: '本', example: word }])
    expect(before[0].id).toBe(after.find(item => item.japanese === word.japanese)!.id)
    expect(new Set(LISTENING_SENTENCES.map(item => item.id)).size).toBe(LISTENING_SENTENCES.length)
    expect(LISTENING_SENTENCES.every(item => item.reading && item.chinese && item.japanese && item.sourceLabel)).toBe(true)
    expect(new Set(LISTENING_SENTENCES.map(item => item.level)).size).toBe(5)
  })

  test('顺序下一句循环、随机不重复当前句、空库与单句安全', () => {
    expect(nextListeningSentenceIndex(0, 0)).toBe(0)
    expect(nextListeningSentenceIndex(0, 1, true)).toBe(0)
    expect(nextListeningSentenceIndex(2, 3)).toBe(0)
    expect(nextListeningSentenceIndex(0, 3)).toBe(1)
    for (let current = 0; current < 5; current++) {
      for (const value of [0, 0.25, 0.5, 0.99, 1, NaN]) {
        const next = nextListeningSentenceIndex(current, 5, true, value)
        expect(next).not.toBe(current)
        expect(next).toBeGreaterThanOrEqual(0)
        expect(next).toBeLessThan(5)
      }
    }
  })
})
