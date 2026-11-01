import type { StudyLevel, StudyUnit } from './studyCourseTypes'
import { N4_COURSE } from './courseN4'
import { N3_COURSE } from './courseN3'
import { N2_COURSE } from './courseN2'
import { N1_COURSE } from './courseN1'

export const GRADED_COURSES: Record<StudyLevel, StudyUnit[]> = {
  N4: N4_COURSE, N3: N3_COURSE, N2: N2_COURSE, N1: N1_COURSE,
}
export function findStudyUnit(id: string): StudyUnit | undefined {
  return Object.values(GRADED_COURSES).flat().find(unit => unit.id === id)
}
export function studyQuestionCount(unit: StudyUnit): number {
  return unit.questions.length + unit.listening.questions.length + unit.reading.questions.length
}
