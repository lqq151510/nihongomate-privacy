interface ListeningWord {
  id: string
  reading: string
}

/** Treat kana spelling variants as the same sound; no pitch-accent data is available. */
export function normalizeListeningReading(reading: string): string {
  return reading.normalize('NFKC').replace(/\s+/gu, '').replace(/[\u30a1-\u30f6\u30fd\u30fe]/gu,
    kana => String.fromCharCode(kana.charCodeAt(0) - 0x60))
}

function shuffle<T>(items: readonly T[], random: () => number): T[] {
  const result = [...items]
  for (let i = result.length - 1; i > 0; i--) {
    const value = random()
    const index = Math.floor((Number.isFinite(value) ? Math.min(Math.max(value, 0), 1 - Number.EPSILON) : 0) * (i + 1))
    ;[result[i], result[index]] = [result[index]!, result[i]!]
  }
  return result
}

/** Return exactly four distinguishable options, or none when a fair question cannot be built. */
export function buildListeningOptions<T extends ListeningWord>(answer: T | undefined, pool: readonly T[], random = Math.random): T[] {
  if (!answer) return []
  const answerReading = normalizeListeningReading(answer.reading)
  if (!answerReading) return []

  const readings = new Set([answerReading])
  const ids = new Set([answer.id])
  const candidates: T[] = []
  for (const item of pool) {
    const reading = normalizeListeningReading(item.reading)
    if (!reading || readings.has(reading) || ids.has(item.id)) continue
    readings.add(reading)
    ids.add(item.id)
    candidates.push(item)
  }
  if (candidates.length < 3) return []
  return shuffle([answer, ...shuffle(candidates, random).slice(0, 3)], random)
}
