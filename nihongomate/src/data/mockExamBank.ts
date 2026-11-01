import { JLPT_FULL_EXAM_BANK } from './examQuestions'
import { JLPT_LISTENING_EXAMS } from './listeningTests'
import { GRADED_COURSES } from './gradedCourses'
import { N5_COURSE } from './n5Course'
import { N5_COURSE_LISTENING } from './n5CourseListening'
import { N5_COURSE_READINGS } from './n5CourseReading'
import { N5_COURSE_SUPPLEMENTS } from './n5CourseSupplement'
import { N5_COURSE_PRACTICE_EXTRA } from './n5CoursePracticeExtra'
import { REAL_LISTENING_SCENARIOS } from './listeningScenarios'
import { EXTRA_LISTENING_SCENARIOS } from './extraListeningScenarios'
import { N1_ADVANCED_PRACTICE } from './n1AdvancedPractice'
import { N2_ADVANCED_PRACTICE } from './n2AdvancedPractice'
import { MOCK_EXAM_EXTRA_VOCAB } from './mockExamExtraVocab'
import { MOCK_EXAM_N5_N3_EXPANSION } from './mockExamN5N3Expansion'
import { MOCK_EXAM_N2_EXPANSION } from './mockExamN2Expansion'
import { MOCK_EXAM_N1_EXPANSION } from './mockExamN1Expansion'
import { MOCK_EXAM_N2_LONG_20261101 } from './mockExamN2Long20261101'
import { MOCK_EXAM_N1_LONG_20261101 } from './mockExamN1Long20261101'
import { MOCK_EXAM_N2_RICH_20261101 } from './mockExamN2Rich20261101'
import { MOCK_EXAM_N1_RICH_20261101 } from './mockExamN1Rich20261101'

/** 练习内容为项目已有课程或原创题，并非官方真题。 */
export type MockExamLevel = 'N5' | 'N4' | 'N3' | 'N2' | 'N1'
export type MockExamCategory = 'vocab' | 'grammar' | 'reading' | 'listening'
export interface MockExamQuestion {
  id: string
  sourceId: string
  level: MockExamLevel
  category: MockExamCategory
  prompt: string
  options: string[]
  correctIndex: number
  explanation: string
  groupId?: string
  passage?: string
  audioReading?: string
  transcript?: string
  translation?: string
}

type BaseQuestion = { id: string; prompt: string; options: string[]; correctIndex: number; explanation: string }
function convert(source: string, level: MockExamLevel, category: MockExamCategory, q: BaseQuestion, extra: Partial<MockExamQuestion> = {}): MockExamQuestion {
  return { id: `${source}:${q.id}`, sourceId: q.id, level, category, prompt: q.prompt, options: [...q.options], correctIndex: q.correctIndex, explanation: q.explanation, ...extra }
}

const legacyQuestions: MockExamQuestion[] = JLPT_FULL_EXAM_BANK.filter(q => q.category !== 'listening').map(q => ({
  id: `exam:${q.id}`, sourceId: q.id, level: q.level,
  category: q.category === 'vocab' ? 'vocab' : q.category === 'reading' ? 'reading' : 'grammar',
  prompt: `${q.promptTitle}\n${q.questionText}`, options: [...q.options], correctIndex: q.correctIndex,
  explanation: [q.explanation.analysis, q.explanation.sentenceTranslation, q.explanation.grammarPoint, q.explanation.trapTip].filter(Boolean).join('\n'),
}))

const n5Grammar = [
  ...N5_COURSE.flatMap(unit => unit.questions.map(q => convert('n5-course', 'N5', 'grammar', q))),
  ...N5_COURSE_SUPPLEMENTS.flatMap(unit => unit.questions.map(q => convert('n5-supplement', 'N5', 'grammar', q))),
]
const n5Reading = [
  ...N5_COURSE_READINGS.flatMap(item => item.questions.map(q => convert('n5-reading', 'N5', 'reading', q, { groupId: `n5-reading:${item.unitId}`, passage: item.text, translation: item.chinese }))),
  ...N5_COURSE_PRACTICE_EXTRA.flatMap(item => item.reading.questions.map(q => convert('n5-extra-reading', 'N5', 'reading', q, { groupId: `n5-extra-reading:${item.unitId}`, passage: item.reading.text, translation: item.reading.chinese }))),
]
const n5Listening = [
  ...N5_COURSE_LISTENING.map(item => convert('n5-listening', 'N5', 'listening', { ...item.question, id: item.unitId }, {
    groupId: `n5-listening:${item.unitId}`, audioReading: item.lines.map(line => line.reading).join('\n'), transcript: item.lines.map(line => `${line.speaker}：${line.japanese}`).join('\n'), translation: item.lines.map(line => `${line.speaker}：${line.chinese}`).join('\n'),
  })),
  ...N5_COURSE_PRACTICE_EXTRA.flatMap(item => item.listening.questions.map(q => convert('n5-extra-listening', 'N5', 'listening', q, {
    groupId: `n5-extra-listening:${item.unitId}`, audioReading: item.listening.lines.map(line => line.reading).join('\n'), transcript: item.listening.lines.map(line => `${line.speaker}：${line.japanese}`).join('\n'), translation: item.listening.lines.map(line => `${line.speaker}：${line.chinese}`).join('\n'),
  }))),
]
const gradedQuestions: MockExamQuestion[] = Object.values(GRADED_COURSES).flatMap(units => units.flatMap(unit => [
  ...unit.questions.map(q => convert('graded', unit.level, 'grammar', q)),
  ...unit.reading.questions.map(q => convert('graded', unit.level, 'reading', q, { groupId: `graded-reading:${unit.id}`, passage: unit.reading.text, translation: unit.reading.chinese })),
  ...unit.listening.questions.map(q => convert('graded', unit.level, 'listening', q, { groupId: `graded-listening:${unit.id}`, audioReading: unit.listening.lines.map(line => line.reading).join('\n'), transcript: unit.listening.lines.map(line => `${line.speaker}：${line.japanese}`).join('\n'), translation: unit.listening.lines.map(line => `${line.speaker}：${line.chinese}`).join('\n') })),
]))

const advancedQuestions: MockExamQuestion[] = [...N2_ADVANCED_PRACTICE, ...N1_ADVANCED_PRACTICE].flatMap(item => item.questions.map(q => convert('advanced', item.level, item.kind, q, item.kind === 'reading'
  ? { groupId: `advanced:${item.id}`, passage: item.text, translation: item.chinese }
  : { groupId: `advanced:${item.id}`, audioReading: item.reading, transcript: item.text, translation: item.chinese })))

const scenarioQuestions: MockExamQuestion[] = [...REAL_LISTENING_SCENARIOS, ...EXTRA_LISTENING_SCENARIOS].map(item => convert('scenario', item.level, 'listening', {
  id: item.id, prompt: item.comprehensionQuestion.question, options: item.comprehensionQuestion.options,
  correctIndex: item.comprehensionQuestion.correctAnswer, explanation: item.comprehensionQuestion.explanation,
}, { groupId: `scenario:${item.id}`, audioReading: item.sentences.map(line => line.furigana).join('\n'), transcript: item.sentences.map(line => `${line.speaker}：${line.japanese}`).join('\n'), translation: item.sentences.map(line => `${line.speaker}：${line.chinese}`).join('\n') }))

// 旧听力模拟题只用事先提供的假名对话，不朗读可能含汉字的题干。
const listeningExamQuestions: MockExamQuestion[] = JLPT_LISTENING_EXAMS.map(item => convert('listening-exam', item.level, 'listening', {
  id: item.id, prompt: item.type === 'instant_response' ? '请根据录音选择最合适的应答。' : item.questionText, options: item.options, correctIndex: item.correctIndex, explanation: item.explanation,
}, { groupId: `listening-exam:${item.id}`, audioReading: item.script.map(line => line.furigana).join('\n'), transcript: item.script.map(line => `${line.speaker}：${line.text}`).join('\n'), translation: item.script.map(line => `${line.speaker}：${line.translation}`).join('\n') }))

export const MOCK_EXAM_BANK: MockExamQuestion[] = [
  ...MOCK_EXAM_EXTRA_VOCAB, ...legacyQuestions, ...n5Grammar, ...n5Reading, ...n5Listening,
  ...gradedQuestions, ...advancedQuestions, ...scenarioQuestions, ...listeningExamQuestions,
  ...MOCK_EXAM_N5_N3_EXPANSION, ...MOCK_EXAM_N2_EXPANSION, ...MOCK_EXAM_N1_EXPANSION,
  ...MOCK_EXAM_N2_LONG_20261101, ...MOCK_EXAM_N1_LONG_20261101,
  ...MOCK_EXAM_N2_RICH_20261101, ...MOCK_EXAM_N1_RICH_20261101,
]
