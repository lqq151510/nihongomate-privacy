import { afterEach, beforeEach, describe, expect, spyOn, test } from 'bun:test'
import { studyStorage, STUDY_UPDATED_EVENT } from '../src/utils/storage'
import { createPracticeSession, answerPracticeQuestion, summarizePracticeSession } from '../src/utils/practiceSession'

const STATS_KEY = 'nihongomate_study_stats'
const MISTAKES_KEY = 'nihongomate_exam_mistakes'
class MemoryStorage implements Storage {
  values = new Map<string, string>()
  get length() { return this.values.size }
  clear() { this.values.clear() }
  getItem(key: string) { return this.values.get(key) ?? null }
  key(index: number) { return [...this.values.keys()][index] ?? null }
  removeItem(key: string) { this.values.delete(key) }
  setItem(key: string, value: string) { this.values.set(key, String(value)) }
}

let originalStorage: PropertyDescriptor | undefined
let originalWindow: PropertyDescriptor | undefined
let memory: MemoryStorage
let updates: number
let warn: ReturnType<typeof spyOn>
beforeEach(() => {
  originalStorage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')
  originalWindow = Object.getOwnPropertyDescriptor(globalThis, 'window')
  memory = new MemoryStorage()
  const events = new EventTarget()
  updates = 0
  events.addEventListener(STUDY_UPDATED_EVENT, () => updates++)
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: memory })
  Object.defineProperty(globalThis, 'window', { configurable: true, value: events })
  warn = spyOn(console, 'warn').mockImplementation(() => {})
})
afterEach(() => {
  warn.mockRestore()
  if (originalStorage) Object.defineProperty(globalThis, 'localStorage', originalStorage)
  else Reflect.deleteProperty(globalThis, 'localStorage')
  if (originalWindow) Object.defineProperty(globalThis, 'window', originalWindow)
  else Reflect.deleteProperty(globalThis, 'window')
})

describe('练习作答与错题保存', () => {
  test('答错收录并计数，之后答对仍保留收藏直到主动移出', () => {
    expect(studyStorage.recordExamAnswer('q1', false)).toBe(true)
    expect(studyStorage.recordExamAnswer('q1', true)).toBe(true)
    expect(studyStorage.getStats().todayExamQuestionsCount).toBe(2)
    expect(studyStorage.getExamMistakes()).toEqual(['q1'])
    expect(updates).toBe(2)
    expect(studyStorage.removeExamMistake('q1')).toBe(true)
    expect(studyStorage.getExamMistakes()).toEqual([])
    expect(studyStorage.getStats().todayExamQuestionsCount).toBe(2)
  })

  test('错题写入失败不增加作答统计，恢复后可重试', () => {
    const originalWrite = memory.setItem.bind(memory)
    const failure = spyOn(memory, 'setItem').mockImplementation((key, value) => {
      if (key === MISTAKES_KEY) throw new Error('full')
      originalWrite(key, value)
    })
    expect(studyStorage.recordExamAnswer('q1', false)).toBe(false)
    expect(studyStorage.getStats().todayExamQuestionsCount).toBe(0)
    expect(studyStorage.getExamMistakes()).toEqual([])
    expect(updates).toBe(0)
    failure.mockRestore()
    expect(studyStorage.recordExamAnswer('q1', false)).toBe(true)
    expect(studyStorage.getStats().todayExamQuestionsCount).toBe(1)
  })

  test('统计写入失败回滚新收藏，已有收藏及其他学习数据保留', () => {
    memory.setItem(MISTAKES_KEY, JSON.stringify(['old']))
    memory.setItem('nihongomate_word_records', '{"kept":true}')
    const originalWrite = memory.setItem.bind(memory)
    const failure = spyOn(memory, 'setItem').mockImplementation((key, value) => {
      if (key === STATS_KEY) throw new Error('full')
      originalWrite(key, value)
    })
    expect(studyStorage.recordExamAnswer('q1', false)).toBe(false)
    expect(studyStorage.getExamMistakes()).toEqual(['old'])
    expect(studyStorage.getStats().todayExamQuestionsCount).toBe(0)
    expect(memory.getItem('nihongomate_word_records')).toBe('{"kept":true}')
    expect(updates).toBe(0)
    failure.mockRestore()
  })

  test('统计与回滚均失败后重试，收藏去重且只计一次作答', () => {
    const originalWrite = memory.setItem.bind(memory)
    const writeFailure = spyOn(memory, 'setItem').mockImplementation((key, value) => {
      if (key === STATS_KEY) throw new Error('full')
      originalWrite(key, value)
    })
    const deleteFailure = spyOn(memory, 'removeItem').mockImplementation(() => { throw new Error('unavailable') })
    expect(studyStorage.recordExamAnswer('q1', false)).toBe(false)
    expect(studyStorage.getExamMistakes()).toEqual(['q1'])
    expect(studyStorage.getStats().todayExamQuestionsCount).toBe(0)
    writeFailure.mockRestore()
    deleteFailure.mockRestore()
    expect(studyStorage.recordExamAnswer('q1', false)).toBe(true)
    expect(studyStorage.getExamMistakes()).toEqual(['q1'])
    expect(studyStorage.getStats().todayExamQuestionsCount).toBe(1)
  })

  test('仅保存成功后提交本轮答案，连续重复点击不重复计数', () => {
    let session = createPracticeSession(['q1'])
    const submit = () => {
      const next = answerPracticeQuestion(session, 'q1', 1, 0)
      if (next !== session && studyStorage.recordExamAnswer('q1', false)) session = next
    }
    const failure = spyOn(memory, 'setItem').mockImplementation(() => { throw new Error('full') })
    submit()
    expect(summarizePracticeSession(session).answeredCount).toBe(0)
    failure.mockRestore()
    submit()
    submit()
    expect(summarizePracticeSession(session).answeredCount).toBe(1)
    expect(studyStorage.getStats().todayExamQuestionsCount).toBe(1)
  })

  test('错题增删失败有明确返回值，移出失败保留原收藏', () => {
    memory.setItem(MISTAKES_KEY, '["old"]')
    const failure = spyOn(memory, 'setItem').mockImplementation(() => { throw new Error('full') })
    expect(studyStorage.recordExamMistake('q1')).toBe(false)
    expect(studyStorage.removeExamMistake('old')).toBe(false)
    expect(studyStorage.getExamMistakes()).toEqual(['old'])
    failure.mockRestore()
  })

  test('旧错题数据只接受去重字符串数组，损坏结构降级为空', () => {
    for (const raw of ['null', '{}', '123', '"q1"', 'not-json']) {
      memory.setItem(MISTAKES_KEY, raw)
      expect(studyStorage.getExamMistakes()).toEqual([])
    }
    memory.setItem(MISTAKES_KEY, '["q1",null,"q1",5,"","q2"]')
    expect(studyStorage.getExamMistakes()).toEqual(['q1', 'q2'])
  })
})
