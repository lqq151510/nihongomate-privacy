import { findStudyUnit, studyQuestionCount } from '../data/gradedCourses'

export const GRADED_COURSE_PROGRESS_KEY = 'nihongomate_graded_course_results_v1'
export interface GradedCourseResult { unitId: string; total: number; correct: number; completedAt: number }

// 历史成绩保留其做题时的数量；将来题包扩展也不能过滤或覆盖其他单元的历史记录。
function isResult(value: unknown, id: string): value is GradedCourseResult {
  if (!value || typeof value !== 'object' || !findStudyUnit(id)) return false
  const result = value as GradedCourseResult
  return result.unitId === id && Number.isInteger(result.total) && result.total > 0 && result.total <= 10000
    && Number.isInteger(result.correct) && result.correct >= 0 && result.correct <= result.total
    && Number.isFinite(result.completedAt) && result.completedAt >= 0
}
function validResults(value: unknown): Record<string, GradedCourseResult> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  return Object.fromEntries(Object.entries(value).filter(([id, item]) => isResult(item, id)))
}
export function getGradedCourseResults(storage?: Storage): Record<string, GradedCourseResult> {
  try {
    const raw = (storage ?? localStorage).getItem(GRADED_COURSE_PROGRESS_KEY)
    return raw ? validResults(JSON.parse(raw)) : {}
  } catch { return {} }
}
export function saveGradedCourseResult(result: GradedCourseResult, storage?: Storage): boolean {
  const unit = findStudyUnit(result.unitId)
  if (!unit || !isResult(result, result.unitId) || result.total !== studyQuestionCount(unit)) return false
  try {
    const target = storage ?? localStorage
    const raw = target.getItem(GRADED_COURSE_PROGRESS_KEY)
    const parsed: unknown = raw === null ? {} : JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return false
    const results = validResults(parsed)
    results[result.unitId] = { ...result }
    target.setItem(GRADED_COURSE_PROGRESS_KEY, JSON.stringify(results))
    return true
  } catch { return false }
}
