import { describe, expect, test } from 'bun:test'
import { JLPT_CURRICULUM } from '../src/data/curriculum'
import { EXTRA_CHAPTERS } from '../src/data/extraCurriculum'

const levels = ['N5', 'N4', 'N3', 'N2', 'N1'] as const
const chapters = Object.values(EXTRA_CHAPTERS).flat()
const grammars = chapters.flatMap(chapter => chapter.grammars)
const baseGrammars = JLPT_CURRICULUM.flatMap(level => level.chapters.flatMap(chapter => chapter.grammars))
  .filter(grammar => !grammar.id.startsWith('g_ext_'))
const normalizePattern = (pattern: string) => pattern.normalize('NFKC').replace(/[\s〜～]/gu, '')

describe('扩展语法课程数据', () => {
  test('每级新增两章各七项，章节编号与 ID 对应', () => {
    expect(grammars).toHaveLength(70)
    for (const level of levels) {
      const levelChapters = EXTRA_CHAPTERS[level]
      expect(levelChapters).toHaveLength(2)
      expect(levelChapters.map(chapter => chapter.chapterNum)).toEqual([4, 5])
      levelChapters.forEach((chapter, index) => {
        expect(chapter.id).toBe(`${level.toLowerCase()}_ext_c${index + 1}`)
        expect(chapter.grammars).toHaveLength(7)
        expect(chapter.title.trim().length).toBeGreaterThan(0)
        expect(chapter.desc.trim().length).toBeGreaterThan(0)
      })
      expect(levelChapters.flatMap(chapter => chapter.grammars.map(grammar => grammar.id)))
        .toEqual(Array.from({ length: 14 }, (_, index) => `g_ext_${level.toLowerCase()}_${String(index + 1).padStart(2, '0')}`))
    }
  })

  test('新增 ID、句型不重复，也不与原课程冲突', () => {
    expect(new Set(chapters.map(chapter => chapter.id)).size).toBe(chapters.length)
    expect(new Set(grammars.map(grammar => grammar.id)).size).toBe(grammars.length)
    expect(new Set(grammars.map(grammar => normalizePattern(grammar.pattern))).size).toBe(grammars.length)
    const baseIds = new Set(baseGrammars.map(grammar => grammar.id))
    const basePatterns = new Set(baseGrammars.map(grammar => normalizePattern(grammar.pattern)))
    for (const grammar of grammars) {
      expect(baseIds.has(grammar.id)).toBe(false)
      expect(basePatterns.has(normalizePattern(grammar.pattern))).toBe(false)
    }
  })

  test('每项包含接续、解释以及两句独立的日文、假名和中文', () => {
    const sentences: string[] = []
    for (const grammar of grammars) {
      for (const text of [grammar.pattern, grammar.meaning, grammar.connection, grammar.aiExplanation]) {
        expect(text.trim().length).toBeGreaterThan(0)
      }
      expect(grammar.extraExamples).toHaveLength(1)
      for (const example of [grammar.exampleSentence, ...grammar.extraExamples!]) {
        expect(example.japanese).toMatch(/[ぁ-ゖァ-ヶ一-龯]/u)
        expect(example.furigana).toMatch(/^[ぁ-ゖァ-ヶー\s、。！？「」『』・（）…]+$/u)
        expect(example.chinese.trim().length).toBeGreaterThan(0)
        sentences.push(example.japanese.trim())
      }
    }
    expect(sentences).toHaveLength(140)
    expect(new Set(sentences).size).toBe(140)
  })

  test('总课程确实接入所有新增内容，保留原有三十项', () => {
    expect(baseGrammars).toHaveLength(30)
    for (const level of levels) {
      const integrated = JLPT_CURRICULUM.find(item => item.level === level)!
      const integratedIds = integrated.chapters.flatMap(chapter => chapter.grammars.map(grammar => grammar.id))
      expect(integratedIds).toHaveLength(20)
      for (const chapter of EXTRA_CHAPTERS[level]) {
        for (const grammar of chapter.grammars) expect(integratedIds).toContain(grammar.id)
      }
    }
  })
})
