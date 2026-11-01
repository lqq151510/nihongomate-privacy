import { describe, expect, test } from 'bun:test'
import { SEION_DATA } from '../src/data/gojuon'
import { JLPT_FULL_EXAM_BANK } from '../src/data/examQuestions'
import { COMPREHENSIVE_VOCAB } from '../src/data/vocab'
import { REAL_LISTENING_SCENARIOS } from '../src/data/listeningScenarios'

describe('learning content integrity', () => {
  test('kana entries contain Japanese characters, including ro', () => {
    for (const kana of SEION_DATA.filter(item => !item.isEmpty)) {
      expect(kana.katakana).toMatch(/^[ァ-ヶー]+$/u)
      expect(kana.hiragana).toMatch(/^[ぁ-ゖー]+$/u)
    }
    expect(SEION_DATA.find(item => item.id === 'ro')?.katakana).toBe('ロ')
  })

  test('persisted content identifiers are unique within each bank', () => {
    for (const bank of [COMPREHENSIVE_VOCAB, JLPT_FULL_EXAM_BANK, REAL_LISTENING_SCENARIOS]) {
      expect(new Set(bank.map(item => item.id)).size).toBe(bank.length)
    }
  })

  test('each exam has distinct choices and a valid answer', () => {
    for (const question of JLPT_FULL_EXAM_BANK) {
      expect(question.options.length).toBe(4)
      expect(new Set(question.options).size).toBe(4)
      expect(Number.isInteger(question.correctIndex)).toBe(true)
      expect(question.correctIndex).toBeGreaterThanOrEqual(0)
      expect(question.correctIndex).toBeLessThan(question.options.length)
    }
  })

  // Independent complete sentences catch missing fragments and incorrect star positions.
  const sortingCases: Array<[string, number[], string]> = [
    ['n5_exam_3', [3, 0, 1, 2], '図書館では、友達と大声で話してはいけません。'],
    ['n4_exam_3', [2, 0, 3, 1], '熱が何日も下がらないようなら病院へ行ったほうがいいですよ。'],
    ['n3_exam_3', [2, 1, 3, 0], '子供のころ、遊んでばかりいて親に叱られたものだ。'],
    ['n2_exam_3', [2, 3, 0, 1], 'どんなに困難な状況であっても、ここまで努力した以上途中であきらめるわけにはいかない。'],
    ['n1_exam_3', [0, 1, 3, 2], '学歴や年齢にかかわらずその人の能力に応じた実力主義の評価制度を導入した。'],
  ]

  for (const [id, order, expectedSentence] of sortingCases) {
    test(`${id} forms a complete sentence with the correct star answer`, () => {
      const question = JLPT_FULL_EXAM_BANK.find(item => item.id === id)!
      const slots = question.questionText.match(/____|★/g)!
      expect(slots).toHaveLength(4)
      expect(question.correctIndex).toBe(order[slots.indexOf('★')])
      let index = 0
      const sentence = question.questionText.replace(/____|★/g, () => question.options[order[index++]]!)
      expect(sentence.replace(/\s/g, '')).toBe(expectedSentence)
    })
  }
})
