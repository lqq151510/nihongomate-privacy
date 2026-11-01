import type { GrammarLessonQuestion } from '../data/grammarLessons'

export interface GrammarAnswer {
  selectedOptionIndex: number
  correct: boolean
  hintUsed: boolean
}

export interface GrammarSession {
  questionIds: string[]
  answers: Record<string, GrammarAnswer>
  hintedQuestionIds: string[]
  currentIndex: number
  completed: boolean
}

export interface GrammarLearningState {
  expanded: boolean
  round: GrammarSession | null
  firstResult: GrammarSession | null
  mode: 'initial' | 'retry'
  correctedQuestionIds: string[]
  completedAt: number | null
  saved: boolean
  saveError: boolean
  draft: string
  referenceVisible: boolean
}

export function createGrammarLearningState(): GrammarLearningState {
  return {
    expanded: false, round: null, firstResult: null, mode: 'initial', correctedQuestionIds: [],
    completedAt: null, saved: false, saveError: false, draft: '', referenceVisible: false,
  }
}

export function createGrammarSession(questionIds: readonly string[]): GrammarSession {
  const ids = [...new Set(questionIds)]
  return { questionIds: ids, answers: {}, hintedQuestionIds: [], currentIndex: 0, completed: ids.length === 0 }
}

export function revealGrammarHint(session: GrammarSession): GrammarSession {
  const id = session.questionIds[session.currentIndex]
  if (session.completed || !id || session.answers[id] || session.hintedQuestionIds.includes(id)) return session
  return { ...session, hintedQuestionIds: [...session.hintedQuestionIds, id] }
}

export function answerGrammarQuestion(session: GrammarSession, question: GrammarLessonQuestion, selectedOptionIndex: number): GrammarSession {
  if (session.completed || session.questionIds[session.currentIndex] !== question.id || session.answers[question.id]) return session
  if (![selectedOptionIndex, question.correctIndex].every(index => Number.isInteger(index) && index >= 0 && index < question.options.length)) return session
  return {
    ...session,
    answers: {
      ...session.answers,
      [question.id]: {
        selectedOptionIndex,
        correct: selectedOptionIndex === question.correctIndex,
        hintUsed: session.hintedQuestionIds.includes(question.id),
      },
    },
  }
}

export function advanceGrammarQuestion(session: GrammarSession): GrammarSession {
  const id = session.questionIds[session.currentIndex]
  if (session.completed || !id || !session.answers[id]) return session
  return session.currentIndex + 1 === session.questionIds.length
    ? { ...session, completed: true }
    : { ...session, currentIndex: session.currentIndex + 1 }
}

export function summarizeGrammarSession(session: GrammarSession) {
  let independentCorrect = 0
  let hintedCorrect = 0
  const wrongQuestionIds: string[] = []
  for (const id of session.questionIds) {
    const answer = session.answers[id]
    if (!answer) continue
    if (!answer.correct) wrongQuestionIds.push(id)
    else if (answer.hintUsed) hintedCorrect++
    else independentCorrect++
  }
  return {
    total: session.questionIds.length,
    independentCorrect,
    hintedCorrect,
    wrongCount: wrongQuestionIds.length,
    answeredCount: independentCorrect + hintedCorrect + wrongQuestionIds.length,
    wrongQuestionIds,
  }
}

export function createGrammarRetry(session: GrammarSession): GrammarSession | null {
  if (!session.completed) return null
  const wrong = summarizeGrammarSession(session).wrongQuestionIds
  return wrong.length ? createGrammarSession(wrong) : null
}
