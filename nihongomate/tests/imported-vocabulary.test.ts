import { describe, expect, test } from 'bun:test'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import vocabulary from '../src/data/importedVocabulary.json'
import manifest from '../public/licenses/vocabulary-source-manifest.json'
import { getVocabPartOfSpeechGroups } from '../src/utils/vocabFilter'

const root = new URL('../', import.meta.url)
const read = (path: string) => readFileSync(new URL(path, root))

describe('licensed imported vocabulary', () => {
  test('the complete pinned snapshot has every expected level, without inflating variants', () => {
    expect(vocabulary.length).toBe(7736)
    const counts = Object.fromEntries(['N5', 'N4', 'N3', 'N2', 'N1'].map(level => [
      level, vocabulary.filter(word => word.level === level).length,
    ]))
    expect(counts).toEqual({ N5: 690, N4: 646, N3: 1641, N2: 1732, N1: 3027 })
    expect(manifest.counts.byLevel).toEqual(counts)
    expect(manifest.counts.importedEntries).toBe(vocabulary.length)
    expect(new Set(vocabulary.map(word => word.id)).size).toBe(vocabulary.length)
    expect(new Set(vocabulary.map(word => word.sourceId)).size).toBe(vocabulary.length)
    expect(new Set(vocabulary.map(word => `${word.kanji.normalize('NFKC')}\0${word.reading}`)).size).toBe(vocabulary.length)
  })

  test('every item has real display fields, kana pronunciation and a stable source-linked ID', () => {
    for (const word of vocabulary) {
      for (const value of Object.values(word)) expect(value.trim().length).toBeGreaterThan(0)
      expect(word.level).toMatch(/^N[1-5]$/)
      expect(word.reading).toMatch(/^[ぁ-ゖゝ-ゟァ-ヺヽ-ヿー・]+$/u)
      expect(word.meaning).toMatch(/[\u3400-\u9fff]/u)
      expect(word.sourceId).toMatch(/^\d+$/)
      const suffix = createHash('sha256').update(`${word.kanji}\0${word.reading}`).digest('hex').slice(0, 8)
      expect(word.id).toBe(`tomoshi_${word.sourceId}_${suffix}`)
      expect('example' in word).toBe(false)
      expect('audio' in word).toBe(false)
    }
  })

  test('distributable data is byte-identical and its hash and attribution are retained', () => {
    const source = read('src/data/importedVocabulary.json')
    expect(read('public/data/vocabulary-source.json').equals(source)).toBe(true)
    expect(createHash('sha256').update(source).digest('hex')).toBe(manifest.derivedSha256)
    expect(manifest.sourceCommit).toBe('4f1fec127ec6a50fa0892235942e1caa414a882b')
    expect(manifest.license).toBe('CC-BY-SA-4.0')
    expect(manifest.tableLicenses.map(item => item.table).sort()).toEqual(['entries', 'freq_rank', 'vocab_jlpt', 'zh_defs'])
    expect(manifest.tableLicenses.every(item => item.license === 'CC-BY-SA-4.0' && item.attribution)).toBe(true)
    expect(read('public/licenses/tomoshi-NOTICE.md').toString()).toContain('Electronic Dictionary Research and Development')
    expect(read('public/licenses/vocabulary.html').toString()).toContain('../data/vocabulary-source.json')
  })

  test('common teaching selections and genuinely distinct readings remain usable', () => {
    expect(vocabulary.find(word => word.sourceId === '1158450')?.meaning).toBe('维持；保持')
    expect(vocabulary.find(word => word.sourceId === '1198500')?.meaning).toBe('会见；会面；接见')
    expect(vocabulary.filter(word => word.kanji === '何').map(word => word.reading).sort()).toEqual(['なに', 'なん'])
    expect(vocabulary.find(word => word.kanji === '今日')?.reading).toBe('きょう')
    expect(vocabulary.find(word => word.kanji === '明日')?.reading).toBe('あした')
    expect(vocabulary.find(word => word.kanji === '箸')?.reading).toBe('はし')
    expect(getVocabPartOfSpeechGroups(vocabulary.find(word => word.kanji === '運動')!.partOfSpeech)).toEqual(['名词', '动词'])
    expect(getVocabPartOfSpeechGroups(vocabulary.find(word => word.kanji === '安全')!.partOfSpeech)).toEqual(['名词', '形容词'])
  })
})
