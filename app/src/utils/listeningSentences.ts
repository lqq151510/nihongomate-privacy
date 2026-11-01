import { JLPT_CURRICULUM } from '../data/curriculum'
import { COMPREHENSIVE_VOCAB } from '../data/vocab'

export type ListeningLevel = 'N5' | 'N4' | 'N3' | 'N2' | 'N1'
interface SentenceText { japanese: string; furigana: string; chinese: string }
interface SentenceCourse {
  level: ListeningLevel
  chapters: { grammars: { id: string; pattern: string; exampleSentence: SentenceText; extraExamples?: SentenceText[] }[] }[]
}
interface SentenceVocabulary { id: string; level: ListeningLevel; kanji: string; example?: SentenceText }
export interface ListeningSentence {
  id: string
  level: ListeningLevel
  sourceLabel: string
  japanese: string
  reading: string
  chinese: string
}

/** 只收录已有完整例句；词库无例句时跳过，不从词义拼装假例句。 */
export function buildListeningSentences(
  curriculum: readonly SentenceCourse[] = JLPT_CURRICULUM,
  vocabulary: readonly SentenceVocabulary[] = COMPREHENSIVE_VOCAB,
): ListeningSentence[] {
  const result: ListeningSentence[] = []
  const seen = new Set<string>()
  const add = (example: SentenceText | undefined, level: ListeningLevel, sourceLabel: string) => {
    if (!example?.japanese?.trim() || !example.furigana?.trim() || !example.chinese?.trim()) return
    const normalized = example.japanese.normalize('NFKC').replace(/\s/g, '')
    if (seen.has(normalized)) return
    seen.add(normalized)
    result.push({ id: `sentence:${normalized}`, level, sourceLabel, japanese: example.japanese.trim(), reading: example.furigana.trim(), chinese: example.chinese.trim() })
  }
  for (const course of curriculum) {
    for (const chapter of course.chapters) {
      for (const grammar of chapter.grammars) {
        add(grammar.exampleSentence, course.level, `语法例句 · ${grammar.pattern}`)
        for (const example of grammar.extraExamples ?? []) add(example, course.level, `语法扩展示例 · ${grammar.pattern}`)
      }
    }
  }
  for (const word of vocabulary) add(word.example, word.level, `词汇例句 · ${word.kanji}`)
  return result
}

export const LISTENING_SENTENCES = buildListeningSentences()

/** 仅计算下一个位置，选择不触发朗读；随机模式不重复当前句。 */
export function nextListeningSentenceIndex(index: number, length: number, random = false, randomValue = Math.random()): number {
  if (length <= 1) return 0
  const current = Math.max(0, Math.min(length - 1, Math.floor(index)))
  if (!random) return (current + 1) % length
  const bounded = Number.isFinite(randomValue) ? Math.max(0, Math.min(0.999999999, randomValue)) : 0
  const candidate = Math.floor(bounded * (length - 1))
  return candidate >= current ? candidate + 1 : candidate
}
