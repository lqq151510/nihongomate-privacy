export interface PracticeAnswer {
  selectedOptionIndex: number
  correct: boolean
}

export interface PracticeSession {
  questionIds: string[]
  answers: Record<string, PracticeAnswer>
  currentIndex: number
  completed: boolean
}

/** 每轮冻结题目顺序，历史错题收藏变化不会改变当前任务。 */
export function createPracticeSession(questionIds: readonly string[]): PracticeSession {
  return { questionIds: [...new Set(questionIds)], answers: {}, currentIndex: 0, completed: false }
}

export function answerPracticeQuestion(
  session: PracticeSession,
  questionId: string,
  selectedOptionIndex: number,
  correctOptionIndex: number,
): PracticeSession {
  if (session.completed || session.questionIds[session.currentIndex] !== questionId || session.answers[questionId]) return session
  if (![selectedOptionIndex, correctOptionIndex].every(index => Number.isInteger(index) && index >= 0 && index < 4)) return session
  return {
    ...session,
    answers: { ...session.answers, [questionId]: { selectedOptionIndex, correct: selectedOptionIndex === correctOptionIndex } },
  }
}

export function advancePracticeQuestion(session: PracticeSession): PracticeSession {
  const currentId = session.questionIds[session.currentIndex]
  if (session.completed || !currentId || !session.answers[currentId]) return session
  if (session.currentIndex + 1 === session.questionIds.length) return { ...session, completed: true }
  return { ...session, currentIndex: session.currentIndex + 1 }
}

export function summarizePracticeSession(session: PracticeSession) {
  let correctCount = 0
  let streak = 0
  let maxStreak = 0
  const wrongQuestionIds: string[] = []
  for (const id of session.questionIds) {
    const answer = session.answers[id]
    if (!answer) continue
    if (answer.correct) {
      correctCount += 1
      streak += 1
      maxStreak = Math.max(maxStreak, streak)
    } else {
      wrongQuestionIds.push(id)
      streak = 0
    }
  }
  const answeredCount = correctCount + wrongQuestionIds.length
  return {
    total: session.questionIds.length,
    answeredCount,
    correctCount,
    wrongQuestionIds,
    streak,
    maxStreak,
    accuracy: answeredCount ? Math.round(correctCount / answeredCount * 100) : 0,
  }
}
