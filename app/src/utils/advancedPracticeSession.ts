import type { AdvancedQuestion } from '../data/advancedPracticeTypes'

export interface AdvancedPracticeSession { answers: Record<string, number>; submitted: boolean }
export function createAdvancedPracticeSession(): AdvancedPracticeSession {
  return { answers: {}, submitted: false }
}
export function chooseAdvancedAnswer(session: AdvancedPracticeSession, questions: readonly AdvancedQuestion[], id: string, index: number): AdvancedPracticeSession {
  const question = questions.find(item => item.id === id)
  if (session.submitted || !question || !Number.isInteger(index) || index < 0 || index >= question.options.length) return session
  return { ...session, answers: { ...session.answers, [id]: index } }
}
export function canSubmitAdvancedPractice(session: AdvancedPracticeSession, questions: readonly AdvancedQuestion[]): boolean {
  return !session.submitted && questions.length > 0 && questions.every(q => Number.isInteger(session.answers[q.id]) && session.answers[q.id]! >= 0 && session.answers[q.id]! < q.options.length)
}
export function submitAdvancedPractice(session: AdvancedPracticeSession, questions: readonly AdvancedQuestion[]): AdvancedPracticeSession {
  return canSubmitAdvancedPractice(session, questions) ? { ...session, submitted: true } : session
}
