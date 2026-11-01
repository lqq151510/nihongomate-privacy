import { GRAMMAR_PROGRESS_KEY } from './grammarProgress'
import { N5_COURSE_PROGRESS_KEY } from './n5CourseProgress'
import { N5_SUPPLEMENT_PROGRESS_KEY } from './n5SupplementProgress'
import { GRADED_COURSE_PROGRESS_KEY } from './gradedCourseProgress'
import { ADVANCED_PRACTICE_PROGRESS_KEY } from './advancedPracticeProgress'

export const MOCK_EXAM_SESSION_KEY = 'nihongomate_mock_exam_session_v1'

/**
 * 随身日语伴侣 - 本地学习记录与简易间隔复习。
 * 学习数据存于当前设备的 LocalStorage，不提供云端同步。
 */

export interface WordStudyRecord {
  wordId: string
  level: string
  status: 'mastered' | 'vague' | 'unfamiliar'
  reviewCount: number
  lastReviewTime: number
  nextReviewTime: number
  easeFactor: number // 简易度因子 (参考 Anki SM-2 算法)
}

export interface UserStudyStats {
  totalLearnedWords: number
  todayReviewCount: number
  studyStreakDays: number
  lastStudyDate: string
  targetLevel: string
  checkInDates: string[]      // 历史已打卡日期 YYYY-MM-DD
  todayExamQuestionsCount: number // 今日做题数
  todayNewWordIds: string[]   // 当天首次学习的词，跨等级共用每日额度
}

const STORAGE_KEY_RECORDS = 'nihongomate_word_records'
const STORAGE_KEY_STATS = 'nihongomate_study_stats'
const STORAGE_KEY_MISTAKES = 'nihongomate_exam_mistakes'
export const STUDY_UPDATED_EVENT = 'nihongomate:study-updated'
// Signals that cached study sessions must be rebuilt, not that every reset succeeded.
export const PROGRESS_RESET_EVENT = 'nihongomate:progress-reset'

// 日历日期应跟随设备当地时间，不能用 UTC 的 toISOString() 截取日期。
export function localDateKey(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function notifyStudyUpdated() {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(STUDY_UPDATED_EVENT))
}

function checkInStreak(dates: string[], now = new Date()): number {
  const checked = new Set(dates)
  const cursor = new Date(now)
  if (!checked.has(localDateKey(cursor))) cursor.setDate(cursor.getDate() - 1)
  let streak = 0
  while (checked.has(localDateKey(cursor))) {
    streak += 1
    cursor.setDate(cursor.getDate() - 1)
  }
  return streak
}

// 只在保存前严格检查：缺失表示首次使用，其余损坏内容不能当作空记录覆盖。
function parseObjectForWrite(raw: string | null, label: string): Record<string, unknown> {
  if (raw === null) return {}
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    throw new Error(`${label}无法读取，已停止保存以保护原始数据。`)
  }
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error(`${label}格式异常，已停止保存以保护原始数据。`)
  }
  return parsed as Record<string, unknown>
}

function isRecordObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function isSafeWordRecord(value: unknown): boolean {
  if (!isRecordObject(value)) return false
  const stringFields = ['wordId', 'level', 'status']
  const numberFields = ['reviewCount', 'lastReviewTime', 'nextReviewTime', 'easeFactor']
  if (stringFields.some(key => key in value && typeof value[key] !== 'string') ||
      numberFields.some(key => key in value && (typeof value[key] !== 'number' || !Number.isFinite(value[key])))) return false
  if ('reviewCount' in value && (!Number.isInteger(value.reviewCount) || (value.reviewCount as number) < 0)) return false
  if (['lastReviewTime', 'nextReviewTime'].some(key => key in value && (value[key] as number) < 0)) return false
  if ('easeFactor' in value && (value.easeFactor as number) <= 0) return false
  return !('status' in value) || ['mastered', 'vague', 'unfamiliar'].includes(value.status as string)
}

class StudyStorageEngine {
  // 获取所有单词的学习记录
  getAllRecords(): Record<string, WordStudyRecord> {
    try {
      const data = localStorage.getItem(STORAGE_KEY_RECORDS)
      if (data === null) return {}
      const parsed: unknown = JSON.parse(data)
      if (!isRecordObject(parsed)) return {}
      // 只读视图跳过无效条目，避免因单条损坏造成页面崩溃；不会改写本地原始值。
      return Object.fromEntries(Object.entries(parsed).filter(([, value]) => isRecordObject(value))) as Record<string, WordStudyRecord>
    } catch {
      return {}
    }
  }

  // 记录自评掌握情况，并用简易间隔规则安排下次复习。
  recordWordState(wordId: string, level: string, status: 'mastered' | 'vague' | 'unfamiliar'): WordStudyRecord {
    // 先读取并校验两个键，任何异常都在写入前终止，保留可供恢复的原始内容。
    const previousRecords = localStorage.getItem(STORAGE_KEY_RECORDS)
    const parsedRecords = parseObjectForWrite(previousRecords, '词汇记录')
    if (Object.values(parsedRecords).some(value => !isSafeWordRecord(value))) {
      throw new Error('词汇记录包含异常条目，已停止保存以保护原始数据。')
    }
    const all = parsedRecords as unknown as Record<string, WordStudyRecord>
    const previousStats = localStorage.getItem(STORAGE_KEY_STATS)
    const parsedStats = parseObjectForWrite(previousStats, '学习统计')
    const arrayFields = ['checkInDates', 'todayNewWordIds']
    const numberFields = ['totalLearnedWords', 'todayReviewCount', 'studyStreakDays', 'todayExamQuestionsCount']
    if (arrayFields.some(key => key in parsedStats && (!Array.isArray(parsedStats[key]) || !(parsedStats[key] as unknown[]).every(value => typeof value === 'string'))) ||
        numberFields.some(key => key in parsedStats && (typeof parsedStats[key] !== 'number' || !Number.isInteger(parsedStats[key]) || (parsedStats[key] as number) < 0)) ||
        ['lastStudyDate', 'targetLevel'].some(key => key in parsedStats && typeof parsedStats[key] !== 'string') ||
        ('lastStudyDate' in parsedStats && (typeof parsedStats.lastStudyDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(parsedStats.lastStudyDate)))) {
      throw new Error('学习统计包含异常字段，已停止保存以保护原始数据。')
    }
    const stats = this.getStats(previousStats)
    const now = Date.now()
    const isNewWord = !Object.hasOwn(all, wordId)
    const existing = isNewWord ? {
      wordId,
      level,
      status: 'unfamiliar' as const,
      reviewCount: 0,
      lastReviewTime: now,
      nextReviewTime: now,
      easeFactor: 2.5
    } : { ...all[wordId]! }
    // 允许旧记录缺少字段，但不把显式损坏的数值悄悄覆盖。
    if ((existing.reviewCount !== undefined && (typeof existing.reviewCount !== 'number' || !Number.isFinite(existing.reviewCount))) ||
        (existing.easeFactor !== undefined && (typeof existing.easeFactor !== 'number' || !Number.isFinite(existing.easeFactor)))) {
      throw new Error('词汇记录包含异常字段，已停止保存以保护原始数据。')
    }
    existing.reviewCount = existing.reviewCount ?? 0
    existing.easeFactor = existing.easeFactor ?? 2.5
    existing.wordId = existing.wordId ?? wordId
    existing.level = existing.level ?? level
    existing.status = status
    existing.reviewCount += 1
    existing.lastReviewTime = now

    // 掌握后逐渐延长间隔；模糊一天后、生疏半天后复习。
    let intervalDays = 1
    if (status === 'mastered') {
      existing.easeFactor = Math.min(3.0, existing.easeFactor + 0.15)
      intervalDays = Math.round(existing.reviewCount * existing.easeFactor)
    } else if (status === 'vague') {
      intervalDays = 1
    } else {
      existing.easeFactor = Math.max(1.3, existing.easeFactor - 0.2)
      intervalDays = 0.5 // 半天后再次提示
    }

    existing.nextReviewTime = now + intervalDays * 24 * 60 * 60 * 1000
    Object.defineProperty(all, wordId, { value: existing, enumerable: true, configurable: true, writable: true })

    try {
      localStorage.setItem(STORAGE_KEY_RECORDS, JSON.stringify(all))
      this.updateDailyStats(isNewWord ? wordId : undefined, { stats, records: all })
    } catch (e) {
      // 两个本地键不是数据库事务；统计失败时尽力恢复词汇记录，避免错误占用新词额度。
      try {
        if (previousRecords === null) localStorage.removeItem(STORAGE_KEY_RECORDS)
        else localStorage.setItem(STORAGE_KEY_RECORDS, previousRecords)
      } catch {
        // 设备存储不可写时保留原始错误，交由界面提示，不假称已保存。
      }
      console.warn('LocalStorage save failed:', e)
      throw e
    }

    return existing
  }

  // 获取今日需要复习的单词列表 ID
  getDueReviewWordIds(): string[] {
    const all = this.getAllRecords()
    const now = Date.now()
    return Object.values(all)
      .filter(r => r.nextReviewTime <= now)
      .sort((a, b) => a.nextReviewTime - b.nextReviewTime)
      .map(r => r.wordId)
  }

  // 获取特定等级下已掌握的单词总数
  getMasteredCount(level: string): number {
    const all = this.getAllRecords()
    return Object.values(all).filter(r => r.level === level && r.status === 'mastered').length
  }

  // 获取全局学习统计
  getStats(snapshot?: string | null): UserStudyStats {
    const todayStr = localDateKey()
    const defaults: UserStudyStats = {
      totalLearnedWords: 0,
      todayReviewCount: 0,
      studyStreakDays: 0,
      lastStudyDate: todayStr,
      targetLevel: 'N5',
      checkInDates: [],
      todayExamQuestionsCount: 0,
      todayNewWordIds: []
    }
    let stats = defaults
    try {
      const data = snapshot === undefined ? localStorage.getItem(STORAGE_KEY_STATS) : snapshot
      if (data) {
        const parsed = JSON.parse(data)
        stats = { ...defaults, ...parsed }
        stats.checkInDates = Array.isArray(parsed.checkInDates) ? parsed.checkInDates : []
        stats.todayNewWordIds = Array.isArray(parsed.todayNewWordIds) ? parsed.todayNewWordIds : []
      }
    } catch {
      // fallback
    }

    // 所有入口都读取同一份当日状态，避免只有背词才能触发跨日归零。
    if (stats.lastStudyDate !== todayStr) {
      stats.lastStudyDate = todayStr
      stats.todayReviewCount = 0
      stats.todayExamQuestionsCount = 0
      stats.todayNewWordIds = []
    }
    stats.studyStreakDays = checkInStreak(stats.checkInDates)
    return stats
  }

  // 今日是否已经完成主动打卡
  isTodayCheckedIn(): boolean {
    const stats = this.getStats()
    const todayStr = localDateKey()
    return stats.checkInDates.includes(todayStr)
  }

  // 执行今日打卡操作
  performCheckIn(): { success: boolean; streak: number; already: boolean } {
    const stats = this.getStats()
    const todayStr = localDateKey()

    if (stats.checkInDates.includes(todayStr)) {
      return { success: true, streak: stats.studyStreakDays, already: true }
    }

    stats.checkInDates.push(todayStr)
    stats.studyStreakDays = checkInStreak(stats.checkInDates)
    stats.lastStudyDate = todayStr

    try {
      localStorage.setItem(STORAGE_KEY_STATS, JSON.stringify(stats))
      notifyStudyUpdated()
    } catch (e) {
      console.warn('Check-in save failed:', e)
      return { success: false, streak: this.getStats().studyStreakDays, already: false }
    }

    return { success: true, streak: stats.studyStreakDays, already: false }
  }

  // 获取最近 7 天的打卡状态 (包含日期、星期、是否打卡)
  getRecentWeekDays(): { dateStr: string; dayLabel: string; isToday: boolean; isChecked: boolean }[] {
    const stats = this.getStats()
    const result = []
    const dayNames = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
    const todayStr = localDateKey()

    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const dateStr = localDateKey(d)
      const dayLabel = dayNames[d.getDay()]
      const isToday = dateStr === todayStr
      const isChecked = stats.checkInDates.includes(dateStr)

      result.push({
        dateStr,
        dayLabel,
        isToday,
        isChecked
      })
    }

    return result
  }

  // 记录练习作答次数；getStats 已处理跨日归零。
  recordExamAnswered(): boolean {
    const stats = this.getStats()
    stats.todayExamQuestionsCount = (stats.todayExamQuestionsCount || 0) + 1
    try {
      localStorage.setItem(STORAGE_KEY_STATS, JSON.stringify(stats))
    } catch (e) {
      console.warn('Exam stats save failed:', e)
      return false
    }
    notifyStudyUpdated()
    return true
  }

  // 单次练习提交：先写幂等的错题收藏，最后增加统计；失败时界面不推进。
  recordExamAnswer(questionId: string, correct: boolean): boolean {
    let previousMistakes: string | null = null
    let changedMistakes = false
    try {
      if (!correct) {
        previousMistakes = localStorage.getItem(STORAGE_KEY_MISTAKES)
        const mistakes = this.getExamMistakes()
        if (!mistakes.includes(questionId)) {
          localStorage.setItem(STORAGE_KEY_MISTAKES, JSON.stringify([...mistakes, questionId]))
          changedMistakes = true
        }
      }
      const stats = this.getStats()
      stats.todayExamQuestionsCount += 1
      localStorage.setItem(STORAGE_KEY_STATS, JSON.stringify(stats))
    } catch (e) {
      if (changedMistakes) {
        try {
          if (previousMistakes === null) localStorage.removeItem(STORAGE_KEY_MISTAKES)
          else localStorage.setItem(STORAGE_KEY_MISTAKES, previousMistakes)
        } catch {
          // 回滚不可写时可能留下收藏；重试按 ID 去重，作答次数尚未增加。
        }
      }
      console.warn('Exam answer save failed:', e)
      return false
    }
    notifyStudyUpdated()
    return true
  }

  // 更新学习次数，不把学习操作当成主动打卡。
  updateDailyStats(newWordId?: string, snapshot?: { stats: UserStudyStats; records: Record<string, WordStudyRecord> }) {
    const stats = snapshot?.stats ?? this.getStats()
    stats.todayReviewCount += 1
    if (newWordId && !stats.todayNewWordIds.includes(newWordId)) stats.todayNewWordIds.push(newWordId)
    const all = snapshot?.records ?? this.getAllRecords()
    stats.totalLearnedWords = Object.keys(all).length

    localStorage.setItem(STORAGE_KEY_STATS, JSON.stringify(stats))
    notifyStudyUpdated()
  }

  // 只清学习记录；多键删除失败时尽力还原，不把部分清除当成成功。
  clearAllProgress(): { success: boolean; partial: boolean } {
    const keys = [STORAGE_KEY_RECORDS, STORAGE_KEY_STATS, STORAGE_KEY_MISTAKES, GRAMMAR_PROGRESS_KEY, N5_COURSE_PROGRESS_KEY, N5_SUPPLEMENT_PROGRESS_KEY, GRADED_COURSE_PROGRESS_KEY, ADVANCED_PRACTICE_PROGRESS_KEY, MOCK_EXAM_SESSION_KEY]
    let snapshots: Array<[string, string | null]>
    try {
      snapshots = keys.map(key => [key, localStorage.getItem(key)])
    } catch {
      return { success: false, partial: false }
    }
    try {
      keys.forEach(key => localStorage.removeItem(key))
    } catch {
      let partial = false
      for (const [key, value] of snapshots) {
        try {
          if (value === null) localStorage.removeItem(key)
          else localStorage.setItem(key, value)
        } catch { partial = true }
      }
      if (partial) {
        notifyStudyUpdated()
        if (typeof window !== 'undefined') window.dispatchEvent(new Event(PROGRESS_RESET_EVENT))
      }
      return { success: false, partial }
    }
    notifyStudyUpdated()
    if (typeof window !== 'undefined') window.dispatchEvent(new Event(PROGRESS_RESET_EVENT))
    return { success: true, partial: false }
  }

  // 记录考试错题
  recordExamMistake(questionId: string): boolean {
    try {
      const mistakes = this.getExamMistakes()
      if (!mistakes.includes(questionId)) {
        mistakes.push(questionId)
        localStorage.setItem(STORAGE_KEY_MISTAKES, JSON.stringify(mistakes))
        notifyStudyUpdated()
      }
    } catch (e) {
      console.warn('Mistake save failed:', e)
      return false
    }
    return true
  }

  // 移出错题本 (掌握后)
  removeExamMistake(questionId: string): boolean {
    try {
      const mistakes = this.getExamMistakes().filter(id => id !== questionId)
      localStorage.setItem(STORAGE_KEY_MISTAKES, JSON.stringify(mistakes))
      notifyStudyUpdated()
    } catch (e) {
      console.warn('Mistake remove failed:', e)
      return false
    }
    return true
  }

  // 获取所有错题 ID 列表
  getExamMistakes(): string[] {
    try {
      const data = localStorage.getItem(STORAGE_KEY_MISTAKES)
      const parsed: unknown = data ? JSON.parse(data) : []
      return Array.isArray(parsed) ? [...new Set(parsed.filter((id): id is string => typeof id === 'string' && id.length > 0))] : []
    } catch {
      return []
    }
  }

  // 获取当前错题数量
  getMistakeCount(): number {
    return this.getExamMistakes().length
  }
}

export const studyStorage = new StudyStorageEngine()
