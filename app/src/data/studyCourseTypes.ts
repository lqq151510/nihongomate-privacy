export type StudyLevel = 'N4' | 'N3' | 'N2' | 'N1'
export interface StudyExample { japanese: string; reading: string; chinese: string }
export interface StudyQuestion { id: string; prompt: string; options: string[]; correctIndex: number; explanation: string }
export interface StudyUnit {
  id: string
  level: StudyLevel
  title: string
  goal: string
  vocabulary: StudyExample[]
  steps: { title: string; explanation: string }[]
  examples: StudyExample[]
  listening: { title: string; situation: string; lines: (StudyExample & { speaker: string })[]; questions: StudyQuestion[] }
  reading: { title: string; text: string; reading: string; chinese: string; questions: StudyQuestion[] }
  questions: StudyQuestion[]
  output: { prompt: string; reference: string; reading: string; chinese: string }
}
