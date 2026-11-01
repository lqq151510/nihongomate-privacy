import { describe, expect, test } from 'bun:test'
import { N5_COURSE_LISTENING } from '../src/data/n5CourseListening'

describe('N5 单元听力', () => {
  test('12 个单元各有可供理解的原创短对话与有效的四选一题', () => {
    expect(N5_COURSE_LISTENING).toHaveLength(12)
    expect(N5_COURSE_LISTENING.map(item => item.unitId)).toEqual(
      Array.from({ length: 12 }, (_, index) => `n5_unit_${String(index + 1).padStart(2, '0')}`),
    )
    for (const item of N5_COURSE_LISTENING) {
      expect(item.title.trim().length).toBeGreaterThan(0)
      expect(item.situation.trim().length).toBeGreaterThan(0)
      expect(item.lines.length).toBeGreaterThanOrEqual(4)
      expect(item.lines.length).toBeLessThanOrEqual(6)
      for (const line of item.lines) {
        for (const text of [line.speaker, line.japanese, line.reading, line.chinese]) expect(text.trim().length).toBeGreaterThan(0)
        expect(line.japanese).toMatch(/[ぁ-ゖァ-ヺ一-龯]/u)
        // 保持假名和标点，避免汉字误读；不表示音调或真人语音已校对。
        expect(line.reading).toMatch(/^[ぁ-ゖァ-ヺー\s、。！？「」・]+$/u)
      }
      const { prompt, options, correctIndex, explanation } = item.question
      expect(prompt.trim().length).toBeGreaterThan(0)
      expect(options).toHaveLength(4)
      expect(new Set(options).size).toBe(4)
      expect(options.every(option => option.trim().length > 0)).toBe(true)
      expect(Number.isInteger(correctIndex) && correctIndex >= 0 && correctIndex < options.length).toBe(true)
      expect(explanation.trim().length).toBeGreaterThan(0)
    }
  })

  // 对照每段文字的关键信息，防止选项顺序改变但索引未更新。
  test('每段可听信息与其正确答案一致', () => {
    const expected = [
      ['大学生', '大学生です'], ['蓝色包里', '青いかばんの中'],
      ['十一点', '十一時まで'], ['两个', '二つお願いします'],
      ['图书馆', '図書館で日本語を勉強'], ['秋天', '秋が好き'],
      ['在家听了音乐', '家で音楽を聞きました'], ['开窗', '窓を開けてください'],
      ['拍照', '写真を撮らないでください'], ['十点', '十時に行きましょう'],
      ['天气好', '天気がいいですから'], ['书店前', '本屋の前で会いましょう'],
    ]
    N5_COURSE_LISTENING.forEach((item, index) => {
      const [answer, clue] = expected[index]!
      expect(item.question.options[item.question.correctIndex]).toBe(answer)
      expect(item.lines.map(line => line.japanese).join('')).toContain(clue)
    })
  })
})
