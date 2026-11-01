import { describe, expect, test } from 'bun:test'
import { COMPREHENSIVE_VOCAB } from '../src/data/vocab'
import type { WordStudyRecord } from '../src/utils/storage'
import {
  filterVocabulary,
  getVocabPartOfSpeechGroups,
  getVocabStudyLabel,
  isVocabDue,
  matchesVocabQuery,
  normalizeVocabQuery,
} from '../src/utils/vocabFilter'

const now = Date.UTC(2026, 10, 1, 4)
const eat = COMPREHENSIVE_VOCAB.find(word => word.kanji === '食べる')!
const quiet = COMPREHENSIVE_VOCAB.find(word => word.kanji === '静か')!
const higherLevelWord = COMPREHENSIVE_VOCAB.find(word => word.level === 'N4')!
const sampleWords = [eat, quiet, higherLevelWord]

function record(wordId: string, status: WordStudyRecord['status'], nextReviewTime = now): WordStudyRecord {
  return { wordId, status, nextReviewTime, level: 'N5', reviewCount: 1, lastReviewTime: now - 1000, easeFactor: 2.5 }
}

function options(overrides: Partial<Parameters<typeof filterVocabulary>[1]> = {}): Parameters<typeof filterVocabulary>[1] {
  return { level: 'N5', query: '', partOfSpeech: '全部词性', studyState: 'all', records: {}, now, ...overrides }
}

describe('词库查询归一与组合筛选', () => {
  test('首尾空格、全角罗马音与大小写不影响匹配', () => {
    for (const query of [' taberu ', 'ＴＡＢＥＲＵ', 'TaBeRu']) {
      expect(matchesVocabQuery(eat, query)).toBe(true)
    }
    expect(normalizeVocabQuery('　ＴＡＢＥＲＵ   吃　')).toBe('taberu 吃')
  })

  test('全角和半角片假名都匹配平假名读音', () => {
    expect(matchesVocabQuery(eat, 'タベル')).toBe(true)
    expect(matchesVocabQuery(quiet, 'ｼｽﾞｶ')).toBe(true)
    expect(normalizeVocabQuery('ヴァ')).toBe('ゔぁ')
  })

  test('汉字、中文及跨字段关键词匹配，所有关键词都需命中', () => {
    expect(matchesVocabQuery(eat, '食べる')).toBe(true)
    expect(matchesVocabQuery(eat, '吃')).toBe(true)
    expect(matchesVocabQuery(eat, 'タベル 吃')).toBe(true)
    expect(matchesVocabQuery(eat, 'taberu 喝')).toBe(false)
  })

  test('空查询不缩小结果，默认仅查询当前等级', () => {
    expect(filterVocabulary(sampleWords, options({ query: '　 ' }))).toEqual([eat, quiet])
  })

  test('全部等级扩大查询范围，输入条件与原顺序保持不变', () => {
    const currentOptions = options({ query: higherLevelWord.kanji })
    expect(filterVocabulary(sampleWords, currentOptions)).toEqual([])
    expect(filterVocabulary(sampleWords, options({ level: 'all', query: higherLevelWord.kanji }))).toEqual([higherLevelWord])
    expect(currentOptions.level).toBe('N5')
    expect(sampleWords).toEqual([eat, quiet, higherLevelWord])
  })

  test('形容动词不会进入动词筛选，静か正确归入形容词', () => {
    expect(filterVocabulary([eat, quiet], options({ partOfSpeech: '动词' }))).toEqual([eat])
    expect(filterVocabulary([eat, quiet], options({ partOfSpeech: '形容词' }))).toEqual([quiet])
    expect(getVocabPartOfSpeechGroups('形容动词 (な形)')).toEqual(['形容词'])
  })

  test('复合词性可同时属于多个分类，代词保持独立', () => {
    expect(getVocabPartOfSpeechGroups('名词/サ变/な形').sort()).toEqual(['名词', '动词', '形容词'].sort())
    expect(getVocabPartOfSpeechGroups('名词/サ变动词').sort()).toEqual(['名词', '动词'].sort())
    expect(getVocabPartOfSpeechGroups('副词/接续词').sort()).toEqual(['副词', '接续词'].sort())
    expect(getVocabPartOfSpeechGroups('名词/副词').sort()).toEqual(['名词', '副词'].sort())
    expect(getVocabPartOfSpeechGroups('副词/な形').sort()).toEqual(['副词', '形容词'].sort())
    expect(getVocabPartOfSpeechGroups('代词')).toEqual(['代词'])
    expect(getVocabPartOfSpeechGroups('代名词')).toEqual(['代词'])
  })

  test('未学与已掌握按实际学习记录筛选', () => {
    const records = { [eat.id]: record(eat.id, 'mastered', now + 1000) }
    expect(filterVocabulary([eat, quiet], options({ records, studyState: 'unlearned' }))).toEqual([quiet])
    expect(filterVocabulary([eat, quiet], options({ records, studyState: 'mastered' }))).toEqual([eat])
    expect(getVocabStudyLabel(undefined, now)).toBe('未学')
    expect(getVocabStudyLabel(records[eat.id], now)).toBe('已掌握')
  })

  test('到期筛选包括刚好到期记录，排除未来、未学和非法时间', () => {
    const records = {
      [eat.id]: record(eat.id, 'mastered', now),
      [quiet.id]: record(quiet.id, 'vague', now + 1),
    }
    expect(filterVocabulary(sampleWords, options({ level: 'all', records, studyState: 'due' }))).toEqual([eat])
    expect(isVocabDue(record('invalid', 'unfamiliar', Number.NaN), now)).toBe(false)
    expect(getVocabStudyLabel(records[eat.id], now)).toBe('已掌握 · 待复习')
    expect(getVocabStudyLabel(records[quiet.id], now)).toBe('模糊')
  })

  test('词性、关键词、学习状态共同生效，冲突条件返回空结果', () => {
    const records = { [quiet.id]: record(quiet.id, 'unfamiliar', now - 1) }
    expect(filterVocabulary(sampleWords, options({ query: 'シズカ', partOfSpeech: '形容词', studyState: 'due', records }))).toEqual([quiet])
    expect(filterVocabulary(sampleWords, options({ query: 'シズカ', partOfSpeech: '动词', studyState: 'due', records }))).toEqual([])
    expect(getVocabStudyLabel(records[quiet.id], now)).toBe('生疏 · 待复习')
  })

  test('查询只读，不修改词库、记录或复习时间', () => {
    const records = Object.freeze({ [eat.id]: Object.freeze(record(eat.id, 'mastered', now)) })
    const words = Object.freeze([...sampleWords])
    const before = JSON.stringify({ records, words })
    filterVocabulary(words, options({ records, level: 'all', studyState: 'due' }))
    expect(JSON.stringify({ records, words })).toBe(before)
  })
})
