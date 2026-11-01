import { N5_COURSE } from '../data/n5Course'
import { N5_COURSE_LISTENING } from '../data/n5CourseListening'
import { N5_COURSE_READINGS } from '../data/n5CourseReading'

export const N5_COURSE_PROGRESS_KEY = 'nihongomate_n5_course_results'
export interface N5CourseResult { unitId: string; total: number; correct: number; completedAt: number }

/** 不把只做完部分题目的单元误记为已完成。 */
export function expectedQuestionCount(unitId: string): number {
  const unit = N5_COURSE.find(item => item.id === unitId)
  const listening = N5_COURSE_LISTENING.find(item => item.unitId === unitId)
  const reading = N5_COURSE_READINGS.find(item => item.unitId === unitId)
  return unit && listening && reading && unit.questions.length && reading.questions.length
    ? unit.questions.length + 1 + reading.questions.length : 0
}
function isResult(value: unknown, id: string): value is N5CourseResult {
  if (!value || typeof value !== 'object') return false
  const result = value as N5CourseResult
  const total = expectedQuestionCount(id)
  return total > 0 && result.unitId === id && result.total === total && Number.isInteger(result.correct)
    && result.correct >= 0 && result.correct <= total && Number.isFinite(result.completedAt) && result.completedAt >= 0
}
function validResults(raw: unknown): Record<string, N5CourseResult> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}
  return Object.fromEntries(Object.entries(raw).filter(([id, result]) => isResult(result, id)))
}
export function getN5CourseResults(storage?: Storage): Record<string, N5CourseResult> {
  try {
    const raw = (storage ?? localStorage).getItem(N5_COURSE_PROGRESS_KEY)
    return raw ? validResults(JSON.parse(raw)) : {}
  } catch { return {} }
}
export function saveN5CourseResult(result: N5CourseResult, storage?: Storage): boolean {
  if (!isResult(result, result.unitId)) return false
  try {
    const target = storage ?? localStorage
    const raw = target.getItem(N5_COURSE_PROGRESS_KEY)
    const parsed: unknown = raw === null ? {} : JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return false
    const results = validResults(parsed)
    results[result.unitId] = { ...result }
    target.setItem(N5_COURSE_PROGRESS_KEY, JSON.stringify(results))
    return true
  } catch { return false }
}
