export type AdvancedLevel = 'N2' | 'N1'
export type AdvancedKind = 'reading' | 'listening'
export interface AdvancedQuestion {
  id: string
  prompt: string
  options: string[]
  correctIndex: number
  explanation: string
  evidence: string
}
export interface AdvancedPassage {
  id: string
  level: AdvancedLevel
  kind: AdvancedKind
  title: string
  context: string
  text: string
  reading: string
  chinese: string
  questions: AdvancedQuestion[]
}
