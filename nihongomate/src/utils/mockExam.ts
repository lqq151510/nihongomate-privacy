import { MOCK_EXAM_BLUEPRINTS, type MockExamCategory, type MockExamLevel } from '../data/mockExamBlueprint'
import type { MockExamQuestion } from '../data/mockExamBank'

export interface MockExamSection {
  id: string
  label: string
  durationMinutes: number
  questions: MockExamQuestion[]
  answers: Record<string, number>
  submittedAt: number | null
  submitReason: 'manual' | 'timeout' | null
}
export interface MockExamState {
  version: 1
  level: MockExamLevel
  sections: MockExamSection[]
  sectionIndex: number
  phase: 'running' | 'break' | 'complete'
  deadline: number | null
  lastObservedAt: number
}

function validQuestion(q: unknown, level: MockExamLevel): q is MockExamQuestion {
  if (!q || typeof q !== 'object') return false
  const v = q as MockExamQuestion
  return typeof v.id === 'string' && !!v.id && typeof v.sourceId === 'string' && !!v.sourceId && v.level === level
    && ['vocab', 'grammar', 'reading', 'listening'].includes(v.category)
    && typeof v.prompt === 'string' && !!v.prompt.trim() && typeof v.explanation === 'string'
    && Array.isArray(v.options) && v.options.length === 4 && v.options.every(option => typeof option === 'string' && !!option.trim())
    && new Set(v.options).size === 4 && Number.isInteger(v.correctIndex) && v.correctIndex >= 0 && v.correctIndex < v.options.length
    && (v.category !== 'listening' || (typeof v.audioReading === 'string' && !!v.audioReading.trim()))
}

function hasConsistentGroups(questions: readonly MockExamQuestion[]): boolean {
  const groups = new Map<string, string>()
  for (const question of questions) {
    if (!question.groupId) continue
    const signature = JSON.stringify([question.category, question.passage, question.audioReading, question.transcript, question.translation])
    const old = groups.get(question.groupId)
    if (old !== undefined && old !== signature) return false
    groups.set(question.groupId, signature)
  }
  return true
}

const LARGE_TARGETS: Record<MockExamCategory, number> = { vocab: 11, grammar: 20, reading: 16, listening: 16 }
const SMALL_TARGETS: Record<MockExamCategory, number> = { vocab: 11, grammar: 15, reading: 10, listening: 12 }

/** 通过种子生成稳定的伪随机序列，用于同一套题的预览与创建。 */
function seededRandom(seed: string): () => number {
  let value = 2166136261
  for (let i = 0; i < seed.length; i++) value = Math.imul(value ^ seed.charCodeAt(i), 16777619)
  return () => {
    value = (value + 0x6d2b79f5) | 0
    let mixed = Math.imul(value ^ (value >>> 15), value | 1)
    mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61)
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296
  }
}
function shuffle<T>(items: T[], random: () => number): T[] {
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[items[i], items[j]] = [items[j]!, items[i]!]
  }
  return items
}

/** 按素材来源轮流取完整题组，随机调整组的顺序但保留组内顺序。 */
function chooseGroups(items: readonly MockExamQuestion[], limit: number, seed: string): MockExamQuestion[] {
  const grouped = new Map<string, MockExamQuestion[]>()
  for (const item of items) {
    const key = item.groupId ? `group:${item.groupId}` : `question:${item.id}`
    const group = grouped.get(key) ?? []
    group.push(item)
    grouped.set(key, group)
  }
  const sources = new Map<string, MockExamQuestion[][]>()
  for (const group of grouped.values()) {
    const id = group[0]!.id
    const source = id.includes(':') ? id.slice(0, id.indexOf(':')) : 'standalone'
    const queue = sources.get(source) ?? []
    queue.push(group)
    sources.set(source, queue)
  }
  const orderedGroups: MockExamQuestion[][] = []
  const random = seededRandom(seed)
  let queues = shuffle([...sources.values()].map(queue => shuffle(queue, random)), random)
  while (queues.some(queue => queue.length)) {
    for (const queue of queues) {
      const group = queue.shift()
      if (group) orderedGroups.push(group)
    }
    queues = queues.filter(queue => queue.length > 0)
  }
  // 保留随机且来源轮换的优先顺序，选择尽量接近目标的完整题组。
  // 简单贪心可能先选了三题组，使剩余名额无法由两题组填满。
  const choices: Array<MockExamQuestion[][] | undefined> = Array(limit + 1)
  choices[0] = []
  for (const group of orderedGroups) {
    for (let count = limit; count >= group.length; count--) {
      const previous = choices[count - group.length]
      if (!choices[count] && previous) choices[count] = [...previous, group]
    }
    if (choices[limit]) break
  }
  for (let count = limit; count >= 0; count--) {
    if (choices[count]) return choices[count]!.flat()
  }
  return []
}

/** 生成可复用的预览与考卷方案；不足目标时如实保留现有题数。 */
export function planMockExamSections(level: MockExamLevel, bank: readonly MockExamQuestion[], seed: number | string = 0): MockExamSection[] | null {
  const blueprints = MOCK_EXAM_BLUEPRINTS[level]
  if (!blueprints || !Array.isArray(bank)) return null
  const selected = bank.filter(question => question?.level === level)
  if (!selected.length || selected.some(question => !validQuestion(question, level))) return null
  if (new Set(selected.map(question => question.id)).size !== selected.length) return null
  if (!hasConsistentGroups(selected)) return null
  const targets = level === 'N1' || level === 'N2' ? LARGE_TARGETS : SMALL_TARGETS
  const sections: MockExamSection[] = []
  for (const blueprint of blueprints) {
    const questions = blueprint.categories.flatMap(category => chooseGroups(selected.filter(question => question.category === category), targets[category], JSON.stringify([seed, level, category])))
    // 每个明确列出的训练类别都须有题，防止空科目或假装包含阅读。
    if (blueprint.categories.some(category => !questions.some(question => question.category === category))) return null
    sections.push({ id: blueprint.id, label: blueprint.label, durationMinutes: blueprint.durationMinutes,
      questions: questions.map(question => ({ ...question, options: [...question.options] })), answers: {}, submittedAt: null, submitReason: null })
  }
  return sections
}

/** 冻结整场的题目，保证页面切换或题库更新不会改变本轮内容。 */
export function createMockExam(level: MockExamLevel, bank: readonly MockExamQuestion[], now: number, seed: number | string = 0): MockExamState | null {
  if (!Number.isFinite(now) || now < 0) return null
  const sections = planMockExamSections(level, bank, seed)
  if (!sections) return null
  return { version: 1, level, sections, sectionIndex: 0, phase: 'running', deadline: now + sections[0]!.durationMinutes * 60000, lastObservedAt: now }
}

function observedTime(state: MockExamState, now: number): number {
  return Number.isFinite(now) && now >= 0 ? Math.max(now, state.lastObservedAt) : state.lastObservedAt
}
function closeSection(state: MockExamState, at: number, reason: 'manual' | 'timeout'): MockExamState {
  if (state.phase !== 'running') return state
  const sections = state.sections.map((section, index) => index === state.sectionIndex
    ? { ...section, answers: { ...section.answers }, submittedAt: at, submitReason: reason } : section)
  return { ...state, sections, deadline: null, phase: state.sectionIndex === sections.length - 1 ? 'complete' : 'break' }
}
/** 后台恢复时根据真实截止时间检查；不会自动开启下一科。 */
export function tickMockExam(state: MockExamState, now: number): MockExamState {
  const observed = observedTime(state, now)
  const updated = observed === state.lastObservedAt ? state : { ...state, lastObservedAt: observed }
  if (updated.phase === 'running' && updated.deadline !== null && observed >= updated.deadline) return closeSection(updated, updated.deadline, 'timeout')
  return updated
}
export function answerMockExam(state: MockExamState, questionId: string, optionIndex: number, now: number): MockExamState {
  const current = tickMockExam(state, now)
  if (current.phase !== 'running' || !Number.isInteger(optionIndex) || optionIndex < 0 || optionIndex >= 4) return current
  const section = current.sections[current.sectionIndex]
  if (!section?.questions.some(question => question.id === questionId)) return current
  if (section.answers[questionId] === optionIndex) return current
  const sections = current.sections.map((item, index) => index === current.sectionIndex
    ? { ...item, answers: { ...item.answers, [questionId]: optionIndex } } : item)
  return { ...current, sections }
}
export function submitMockExamSection(state: MockExamState, now: number): MockExamState {
  const current = tickMockExam(state, now)
  return current.phase === 'running' ? closeSection(current, current.lastObservedAt, 'manual') : current
}
export function startNextMockExamSection(state: MockExamState, now: number): MockExamState {
  if (state.phase !== 'break' || state.sectionIndex >= state.sections.length - 1) return state
  const observed = observedTime(state, now)
  const sectionIndex = state.sectionIndex + 1
  return { ...state, sectionIndex, phase: 'running', lastObservedAt: observed, deadline: observed + state.sections[sectionIndex]!.durationMinutes * 60000 }
}
export function summarizeMockExam(state: MockExamState) {
  if (state.phase !== 'complete') return null
  const sections = state.sections.map(section => ({
    id: section.id, label: section.label, total: section.questions.length,
    answered: Object.keys(section.answers).length,
    correct: section.questions.filter(question => section.answers[question.id] === question.correctIndex).length,
    submitReason: section.submitReason,
  }))
  return { sections, total: sections.reduce((sum, section) => sum + section.total, 0), answered: sections.reduce((sum, section) => sum + section.answered, 0), correct: sections.reduce((sum, section) => sum + section.correct, 0) }
}

/** 只恢复结构完整的快照；不静默把损坏内容当作有效考试。 */
export function restoreMockExamState(raw: unknown, now: number): MockExamState | null {
  try {
    const candidate: unknown = typeof raw === 'string' ? JSON.parse(raw) : raw
    if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) return null
    const state = candidate as MockExamState
    if (state.version !== 1 || !Object.hasOwn(MOCK_EXAM_BLUEPRINTS, state.level) || !Number.isFinite(state.lastObservedAt) || state.lastObservedAt < 0) return null
    const blueprints = MOCK_EXAM_BLUEPRINTS[state.level]
    if (!Array.isArray(state.sections) || state.sections.length !== blueprints.length || !Number.isInteger(state.sectionIndex) || state.sectionIndex < 0 || state.sectionIndex >= state.sections.length) return null
    if (!['running', 'break', 'complete'].includes(state.phase)) return null
    if (state.phase === 'running' ? (!Number.isFinite(state.deadline) || state.deadline === null || state.deadline < 0) : state.deadline !== null) return null
    if (state.phase === 'break' && state.sectionIndex === state.sections.length - 1) return null
    if (state.phase === 'complete' && state.sectionIndex !== state.sections.length - 1) return null
    const ids = new Set<string>()
    const allQuestions: MockExamQuestion[] = []
    for (let index = 0; index < state.sections.length; index++) {
      const section = state.sections[index]!, blueprint = blueprints[index]!
      if (!section || section.id !== blueprint.id || section.label !== blueprint.label || section.durationMinutes !== blueprint.durationMinutes || !Array.isArray(section.questions) || !section.questions.length || !section.answers || typeof section.answers !== 'object' || Array.isArray(section.answers)) return null
      for (const question of section.questions) {
        if (!validQuestion(question, state.level) || !blueprint.categories.includes(question.category) || ids.has(question.id)) return null
        ids.add(question.id)
        allQuestions.push(question)
      }
      if (blueprint.categories.some(category => !section.questions.some(question => question.category === category))) return null
      for (const [id, answer] of Object.entries(section.answers)) {
        if (!section.questions.some(q => q.id === id) || !Number.isInteger(answer) || answer < 0 || answer >= 4) return null
      }
      const shouldBeSubmitted = index < state.sectionIndex || (index === state.sectionIndex && state.phase !== 'running')
      if (shouldBeSubmitted) {
        if (!Number.isFinite(section.submittedAt) || section.submittedAt === null || section.submittedAt < 0 || !['manual', 'timeout'].includes(section.submitReason ?? '')) return null
      } else if (section.submittedAt !== null || section.submitReason !== null || (index > state.sectionIndex && Object.keys(section.answers).length > 0)) return null
    }
    if (!hasConsistentGroups(allQuestions)) return null
    return tickMockExam(state, now)
  } catch { return null }
}
