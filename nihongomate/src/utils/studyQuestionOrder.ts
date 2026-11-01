import type { StudyQuestion } from '../data/studyCourseTypes'

// 同一题的顺序固定，跨题按 ID 分散，避免总是首项正确且不会在重渲染时跳动。
export function orderStudyQuestion<T extends StudyQuestion>(question: T): T {
  const size = question.options.length
  if (size < 2 || question.correctIndex < 0 || question.correctIndex >= size) return question
  let hash = 2166136261
  for (const char of question.id) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619) >>> 0
  const shift = hash % size
  const options = [...question.options.slice(shift), ...question.options.slice(0, shift)]
  return { ...question, options, correctIndex: (question.correctIndex - shift + size) % size }
}
