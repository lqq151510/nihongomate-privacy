import { describe, expect, test } from 'bun:test'
import { JLPT_CURRICULUM } from '../src/data/curriculum'
import { GRAMMAR_LESSONS, GRAMMAR_LESSON_SOURCES } from '../src/data/grammarLessons'

describe('N5 互动微课内容完整性', () => {
  const lessons = Object.values(GRAMMAR_LESSONS)
  const questions = lessons.flatMap(lesson => lesson.questions)

  test('六个微课各自关联 N5 语法点，新增语法不虚构微课覆盖', () => {
    const n5Ids = JLPT_CURRICULUM.find(level => level.level === 'N5')!.chapters.flatMap(chapter => chapter.grammars.map(grammar => grammar.id))
    expect(Object.keys(GRAMMAR_LESSONS).sort()).toEqual(['g_n5_1', 'g_n5_2', 'g_n5_3', 'g_n5_4', 'g_n5_5', 'g_n5_6'])
    for (const id of Object.keys(GRAMMAR_LESSONS)) expect(n5Ids).toContain(id)
    expect(lessons).toHaveLength(6)
    for (const [id, lesson] of Object.entries(GRAMMAR_LESSONS)) expect(lesson.grammarId).toBe(id)
  })

  test('每课包含识别与迁移两题，题目 ID 全局唯一', () => {
    expect(questions).toHaveLength(12)
    expect(new Set(questions.map(question => question.id)).size).toBe(questions.length)
    for (const lesson of lessons) expect(lesson.questions.map(question => question.kind)).toEqual(['recognition', 'application'])
  })

  test('四选项答案有效且逐项反馈齐全，提示和解题说明独立存在', () => {
    for (const question of questions) {
      expect(question.options).toHaveLength(4)
      expect(new Set(question.options.map(option => option.trim())).size).toBe(4)
      expect(Number.isInteger(question.correctIndex)).toBe(true)
      expect(question.correctIndex).toBeGreaterThanOrEqual(0)
      expect(question.correctIndex).toBeLessThan(question.options.length)
      expect(question.optionFeedback).toHaveLength(question.options.length)
      expect(new Set(question.optionFeedback).size).toBe(question.optionFeedback.length)
      for (const text of [question.prompt, question.hint, question.explanation, ...question.options, ...question.optionFeedback]) expect(text.trim().length).toBeGreaterThan(0)
      expect(question.hint).not.toBe(question.explanation)
    }
  })

  test('每课有可操作目标、三步讲解、易错对比与可自查的输出练习', () => {
    for (const lesson of lessons) {
      expect(lesson.steps).toHaveLength(3)
      for (const text of [lesson.goal, ...lesson.steps.flatMap(step => [step.title, step.explanation]), ...Object.values(lesson.contrast), ...Object.values(lesson.outputTask)]) expect(text.trim().length).toBeGreaterThan(0)
      expect(lesson.contrast.correct).not.toBe(lesson.contrast.incorrect)
      expect(lesson.outputTask.reading).toMatch(/[ぁ-ゖァ-ヶ]/u)
      expect(lesson.outputTask.reference).toMatch(/[ぁ-ゖァ-ヶ一-龯]/u)
    }
  })

  test('规则来源引用可解析且仅使用已核查的教育机构域名', () => {
    const allowedHosts = new Set(['www.coelang.tufs.ac.jp', 'www.jpf.go.jp', 'www.samidori.k.kyoto-u.ac.jp'])
    for (const lesson of lessons) {
      expect(lesson.sourceIds.length).toBeGreaterThan(0)
      for (const sourceId of lesson.sourceIds) {
        const source = GRAMMAR_LESSON_SOURCES[sourceId]
        expect(source).toBeDefined()
        expect(source!.title.length).toBeGreaterThan(0)
        const url = new URL(source!.url)
        expect(url.protocol).toBe('https:')
        expect(allowedHosts.has(url.hostname)).toBe(true)
      }
    }
  })
})
