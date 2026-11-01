import { describe, expect, test } from 'bun:test'
import { getGrammarLessonResults, saveGrammarLessonResult, GRAMMAR_PROGRESS_KEY, type GrammarLessonResult } from '../src/utils/grammarProgress'

class MemoryStorage implements Storage {
  values = new Map<string, string>()
  get length() { return this.values.size }
  clear() { this.values.clear() }
  getItem(key: string) { return this.values.get(key) ?? null }
  key(index: number) { return [...this.values.keys()][index] ?? null }
  removeItem(key: string) { this.values.delete(key) }
  setItem(key: string, value: string) { this.values.set(key, value) }
}

const result: GrammarLessonResult = {
  grammarId: 'g_n5_1', total: 2, independentCorrect: 1,
  hintedCorrect: 0, wrongCount: 1, completedAt: 1793509200000,
}

describe('语法练习摘要本地保存', () => {
  test('保存各课最新完整结果，不改词汇、模拟练习或资料键', () => {
    const storage = new MemoryStorage()
    storage.setItem('nihongomate_study_stats', 'untouched')
    expect(saveGrammarLessonResult(result, storage)).toBe(true)
    const second = { ...result, grammarId: 'g_n5_2', independentCorrect: 0, hintedCorrect: 2, wrongCount: 0 }
    expect(saveGrammarLessonResult(second, storage)).toBe(true)
    expect(getGrammarLessonResults(storage)).toEqual({ g_n5_1: result, g_n5_2: second })
    expect(storage.getItem('nihongomate_study_stats')).toBe('untouched')
    const newer = { ...result, independentCorrect: 2, wrongCount: 0, completedAt: result.completedAt + 1 }
    expect(saveGrammarLessonResult(newer, storage)).toBe(true)
    expect(getGrammarLessonResults(storage)).toEqual({ g_n5_1: newer, g_n5_2: second })
  })

  test('非法计数、非完整题数、未知课程不保存', () => {
    const storage = new MemoryStorage()
    const invalid = [
      { ...result, total: 1 }, { ...result, independentCorrect: 2 },
      { ...result, hintedCorrect: -1 }, { ...result, wrongCount: 0.5 },
      { ...result, completedAt: NaN }, { ...result, grammarId: 'missing' },
      { ...result, grammarId: '__proto__' },
    ]
    for (const item of invalid) expect(saveGrammarLessonResult(item, storage)).toBe(false)
    expect(storage.length).toBe(0)
  })

  test('写入失败不会覆盖上一轮，恢复可写后可重试', () => {
    const storage = new MemoryStorage()
    expect(saveGrammarLessonResult(result, storage)).toBe(true)
    const original = storage.getItem(GRAMMAR_PROGRESS_KEY)
    const write = storage.setItem.bind(storage)
    storage.setItem = () => { throw new Error('quota') }
    const changed = { ...result, independentCorrect: 0, hintedCorrect: 1 }
    expect(saveGrammarLessonResult(changed, storage)).toBe(false)
    expect(storage.getItem(GRAMMAR_PROGRESS_KEY)).toBe(original)
    storage.setItem = write
    expect(saveGrammarLessonResult(changed, storage)).toBe(true)
    expect(getGrammarLessonResults(storage).g_n5_1).toEqual(changed)
  })

  test('读取异常不破坏已有字节，损坏结构可阅读降级但不静默覆盖', () => {
    const storage = new MemoryStorage()
    for (const raw of ['broken-json', '[]', 'null', '42']) {
      storage.values.set(GRAMMAR_PROGRESS_KEY, raw)
      expect(getGrammarLessonResults(storage)).toEqual({})
      expect(saveGrammarLessonResult(result, storage)).toBe(false)
      expect(storage.values.get(GRAMMAR_PROGRESS_KEY)).toBe(raw)
    }
    storage.getItem = () => { throw new Error('unavailable') }
    expect(getGrammarLessonResults(storage)).toEqual({})
    expect(saveGrammarLessonResult(result, storage)).toBe(false)
  })

  test('读取只接受有效课程与匹配的计数，不把损坏数据显示为完成', () => {
    const storage = new MemoryStorage()
    storage.setItem(GRAMMAR_PROGRESS_KEY, JSON.stringify({
      g_n5_1: result, g_n5_2: { ...result, grammarId: 'g_n5_2', independentCorrect: 8 },
      unknown: { ...result, grammarId: 'unknown' },
    }))
    expect(getGrammarLessonResults(storage)).toEqual({ g_n5_1: result })
  })
})
