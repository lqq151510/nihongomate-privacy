import { N5_COURSE_SUPPLEMENTS } from '../data/n5CourseSupplement'
import { N5_COURSE_PRACTICE_EXTRA } from '../data/n5CoursePracticeExtra'

// 独立键：不读取或改写旧课程结果。
export const N5_SUPPLEMENT_PROGRESS_KEY = 'nihongomate_n5_supplement_results_v1'
export interface N5SupplementResult { unitId: string; total: number; correct: number; completedAt: number }
export function expectedSupplementCount(unitId: string): number {
  const grammar = N5_COURSE_SUPPLEMENTS.find(item => item.unitId === unitId)
  const practice = N5_COURSE_PRACTICE_EXTRA.find(item => item.unitId === unitId)
  if (!grammar || !practice || !grammar.questions.length || !practice.listening.questions.length || !practice.reading.questions.length) return 0
  return grammar.questions.length + practice.listening.questions.length + practice.reading.questions.length
}
function validResult(value: unknown, id: string): value is N5SupplementResult {
  if (!value || typeof value !== 'object') return false
  const r = value as N5SupplementResult
  const count = expectedSupplementCount(id)
  return count > 0 && r.unitId === id && r.total === count && Number.isInteger(r.correct) && r.correct >= 0 && r.correct <= count && Number.isFinite(r.completedAt) && r.completedAt >= 0
}
function validResults(value: unknown): Record<string, N5SupplementResult> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  return Object.fromEntries(Object.entries(value).filter(([id, result]) => validResult(result, id)))
}
export function getN5SupplementResults(storage?: Storage): Record<string, N5SupplementResult> {
  try {
    const raw = (storage ?? localStorage).getItem(N5_SUPPLEMENT_PROGRESS_KEY)
    return raw === null ? {} : validResults(JSON.parse(raw))
  } catch { return {} }
}
export function saveN5SupplementResult(result: N5SupplementResult, storage?: Storage): boolean {
  if (!validResult(result, result.unitId)) return false
  try {
    const target = storage ?? localStorage
    const raw = target.getItem(N5_SUPPLEMENT_PROGRESS_KEY)
    const parsed: unknown = raw === null ? {} : JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return false
    const results = validResults(parsed)
    results[result.unitId] = { ...result }
    target.setItem(N5_SUPPLEMENT_PROGRESS_KEY, JSON.stringify(results))
    return true
  } catch { return false }
}
