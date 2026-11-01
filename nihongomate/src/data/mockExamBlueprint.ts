export type MockExamLevel = 'N1' | 'N2' | 'N3' | 'N4' | 'N5'
export type MockExamCategory = 'vocab' | 'grammar' | 'reading' | 'listening'
export interface MockSectionBlueprint { id: string; label: string; durationMinutes: number; categories: readonly MockExamCategory[] }

// 仅参考 JLPT 官方分科时长；听力实际时间会随录音长度变化。
const combined = (written: number, listening: number): readonly MockSectionBlueprint[] => [
  { id: 'written', label: '语言知识（词汇・语法）与阅读', durationMinutes: written, categories: ['vocab', 'grammar', 'reading'] },
  { id: 'listening', label: '听力', durationMinutes: listening, categories: ['listening'] },
]
const divided = (vocab: number, written: number, listening: number): readonly MockSectionBlueprint[] => [
  { id: 'vocabulary', label: '语言知识（文字・词汇）', durationMinutes: vocab, categories: ['vocab'] },
  { id: 'written', label: '语言知识（语法）与阅读', durationMinutes: written, categories: ['grammar', 'reading'] },
  { id: 'listening', label: '听力', durationMinutes: listening, categories: ['listening'] },
]
export const MOCK_EXAM_BLUEPRINTS: Record<MockExamLevel, readonly MockSectionBlueprint[]> = {
  N1: combined(110, 55), N2: combined(105, 50), N3: divided(30, 70, 40),
  N4: divided(25, 55, 35), N5: divided(20, 40, 30),
}
