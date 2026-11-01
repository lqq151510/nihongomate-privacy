import { GRAMMAR_LESSONS } from '../data/grammarLessons'

export const GRAMMAR_PROGRESS_KEY = 'nihongomate_grammar_results'
export const GRAMMAR_PROGRESS_UPDATED_EVENT = 'nihongomate:grammar-progress-updated'

// 保存最近一轮完整随堂练习的结果，不把提示或订正后的答对称为独立掌握。
export interface GrammarLessonResult {
  grammarId: string
  total: number
  independentCorrect: number
  hintedCorrect: number
  wrongCount: number
  completedAt: number
}

function isResult(value: unknown, id: string): value is GrammarLessonResult {
  if (!value || typeof value !== 'object' || !Object.hasOwn(GRAMMAR_LESSONS, id)) return false
  const result = value as GrammarLessonResult
  const counts = [result.total, result.independentCorrect, result.hintedCorrect, result.wrongCount]
  return result.grammarId === id
    && counts.every(count => Number.isInteger(count) && count >= 0)
    && result.total === GRAMMAR_LESSONS[id]!.questions.length
    && result.total > 0
    && result.independentCorrect + result.hintedCorrect + result.wrongCount === result.total
    && Number.isFinite(result.completedAt) && result.completedAt >= 0
}

function validatedResults(raw: unknown): Record<string, GrammarLessonResult> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}
  return Object.fromEntries(Object.entries(raw).filter(([id, value]) => isResult(value, id)))
}

export function getGrammarLessonResults(storage?: Storage): Record<string, GrammarLessonResult> {
  try {
    const raw = (storage ?? localStorage).getItem(GRAMMAR_PROGRESS_KEY)
    return raw ? validatedResults(JSON.parse(raw)) : {}
  } catch {
    return {}
  }
}

export function saveGrammarLessonResult(result: GrammarLessonResult, storage?: Storage): boolean {
  if (!isResult(result, result.grammarId)) return false
  try {
    const target = storage ?? localStorage
    const raw = target.getItem(GRAMMAR_PROGRESS_KEY)
    const parsed: unknown = raw === null ? {} : JSON.parse(raw)
    // 无法识别已有数据时保留原字节，由界面明确显示未保存。
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return false
    const results = validatedResults(parsed)
    results[result.grammarId] = { ...result }
    target.setItem(GRAMMAR_PROGRESS_KEY, JSON.stringify(results))
  } catch {
    return false
  }
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(GRAMMAR_PROGRESS_UPDATED_EVENT))
  return true
}
