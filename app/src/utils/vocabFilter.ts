import type { VocabItem } from '../data/vocab'
import type { WordStudyRecord } from './storage'

export const VOCAB_POS_OPTIONS = ['全部词性', '动词', '形容词', '名词', '副词', '代词', '接续词'] as const
export type VocabPartOfSpeech = typeof VOCAB_POS_OPTIONS[number]
export type VocabStudyFilter = 'all' | 'unlearned' | 'due' | 'mastered'

export function normalizeVocabQuery(value: string): string {
  return value.normalize('NFKC').toLowerCase()
    .replace(/[ァ-ヶ]/g, char => String.fromCharCode(char.charCodeAt(0) - 0x60))
    .trim().replace(/\s+/g, ' ')
}

/**
 * 空格分开的每个关键词都需命中，可分别命中词形、读音、释义或罗马音。
 * 可选练习：调整下面完整的匹配策略，比较“全部关键词命中”和“任一关键词命中”。
 * 此函数只读取单词，不改变学习进度或查询范围。
 */
export function matchesVocabQuery(word: VocabItem, query: string): boolean {
  const terms = normalizeVocabQuery(query).split(' ').filter(Boolean)
  if (terms.length === 0) return true
  const fields = [word.kanji, word.reading, word.meaning, word.romaji]
  const searchable = normalizeVocabQuery(fields.join(' '))
  return terms.every(term => searchable.includes(term))
}

export function getVocabPartOfSpeechGroups(label: string): VocabPartOfSpeech[] {
  const groups = new Set<VocabPartOfSpeech>()
  for (const part of label.normalize('NFKC').split(/[\/、,，;；]/)) {
    if (/形容词|形容动词|[いな]形/.test(part)) groups.add('形容词')
    if (/动词|[サカ][变変]/.test(part.replace(/形容动词/g, ''))) groups.add('动词')
    if (part.includes('名词') && !part.includes('代名词')) groups.add('名词')
    if (part.includes('副词')) groups.add('副词')
    if (/代词|代名词/.test(part)) groups.add('代词')
    if (part.includes('接续词')) groups.add('接续词')
  }
  return [...groups]
}

export function isVocabDue(record: WordStudyRecord | undefined, now: number): boolean {
  return Boolean(record && Number.isFinite(record.nextReviewTime) && record.nextReviewTime <= now)
}

export function getVocabStudyLabel(record: WordStudyRecord | undefined, now: number): string {
  if (!record) return '未学'
  const status = { mastered: '已掌握', vague: '模糊', unfamiliar: '生疏' }[record.status] || '已学习'
  return isVocabDue(record, now) ? `${status} · 待复习` : status
}

interface VocabFilterOptions {
  level: VocabItem['level'] | 'all'
  query: string
  partOfSpeech: VocabPartOfSpeech
  studyState: VocabStudyFilter
  records: Readonly<Record<string, WordStudyRecord>>
  now: number
}

export function filterVocabulary(words: readonly VocabItem[], options: VocabFilterOptions): VocabItem[] {
  return words.filter(word => {
    if (options.level !== 'all' && word.level !== options.level) return false
    if (options.partOfSpeech !== '全部词性' && !getVocabPartOfSpeechGroups(word.partOfSpeech).includes(options.partOfSpeech)) return false
    if (!matchesVocabQuery(word, options.query)) return false
    const record = options.records[word.id]
    if (options.studyState === 'unlearned') return !record
    if (options.studyState === 'due') return isVocabDue(record, options.now)
    if (options.studyState === 'mastered') return record?.status === 'mastered'
    return true
  })
}
