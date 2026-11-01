import { N2_ADVANCED_PRACTICE } from '../data/n2AdvancedPractice'
import { N1_ADVANCED_PRACTICE } from '../data/n1AdvancedPractice'
import type { AdvancedPassage } from '../data/advancedPracticeTypes'

/** 单独保存的材料成绩，不与原分级课程共用存储键。 */
export const ADVANCED_PRACTICE_PROGRESS_KEY = 'nihongomate_advanced_practice_results_v1'
export interface AdvancedPracticeResult { passageId: string; total: number; correct: number; completedAt: number }
export const ADVANCED_PRACTICE: AdvancedPassage[] = [...N2_ADVANCED_PRACTICE, ...N1_ADVANCED_PRACTICE]
function findPassage(id: string): AdvancedPassage | undefined {
  return ADVANCED_PRACTICE.find(passage => passage.id === id)
}
function isResult(value: unknown, id: string): value is AdvancedPracticeResult {
  if (!value || typeof value !== 'object' || !findPassage(id)) return false
  const r = value as AdvancedPracticeResult
  // 读取保留历史题数；未来材料扩充后旧结果仍可读。
  return r.passageId === id && Number.isInteger(r.total) && r.total > 0 && r.total <= 10000
    && Number.isInteger(r.correct) && r.correct >= 0 && r.correct <= r.total
    && Number.isFinite(r.completedAt) && r.completedAt >= 0
}
function validResults(value: unknown): Record<string, AdvancedPracticeResult> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  return Object.fromEntries(Object.entries(value).filter(([id, result]) => isResult(result, id)))
}
export function getAdvancedPracticeResults(storage?: Storage): Record<string, AdvancedPracticeResult> {
  try {
    const raw = (storage ?? localStorage).getItem(ADVANCED_PRACTICE_PROGRESS_KEY)
    return raw ? validResults(JSON.parse(raw)) : {}
  } catch { return {} }
}
export function saveAdvancedPracticeResult(result: AdvancedPracticeResult, storage?: Storage): boolean {
  const passage = findPassage(result.passageId)
  if (!passage || !isResult(result, result.passageId) || result.total !== passage.questions.length) return false
  try {
    const target = storage ?? localStorage
    const raw = target.getItem(ADVANCED_PRACTICE_PROGRESS_KEY)
    const parsed: unknown = raw === null ? {} : JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return false
    const results = validResults(parsed)
    results[result.passageId] = { ...result }
    target.setItem(ADVANCED_PRACTICE_PROGRESS_KEY, JSON.stringify(results))
    return true
  } catch { return false }
}
