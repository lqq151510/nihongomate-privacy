// 读音假名转为便于检索的平文式罗马字；长音保留元音，不用音高或重音标记。
const rows: [string, string[]][] = [
  ['あいうえお', ['a', 'i', 'u', 'e', 'o']],
  ['かきくけこ', ['ka', 'ki', 'ku', 'ke', 'ko']],
  ['さしすせそ', ['sa', 'shi', 'su', 'se', 'so']],
  ['たちつてと', ['ta', 'chi', 'tsu', 'te', 'to']],
  ['なにぬねの', ['na', 'ni', 'nu', 'ne', 'no']],
  ['はひふへほ', ['ha', 'hi', 'fu', 'he', 'ho']],
  ['まみむめも', ['ma', 'mi', 'mu', 'me', 'mo']],
  ['やゆよ', ['ya', 'yu', 'yo']],
  ['らりるれろ', ['ra', 'ri', 'ru', 're', 'ro']],
  ['わをん', ['wa', 'wo', 'n']],
  ['がぎぐげご', ['ga', 'gi', 'gu', 'ge', 'go']],
  ['ざじずぜぞ', ['za', 'ji', 'zu', 'ze', 'zo']],
  ['だぢづでど', ['da', 'ji', 'zu', 'de', 'do']],
  ['ばびぶべぼ', ['ba', 'bi', 'bu', 'be', 'bo']],
  ['ぱぴぷぺぽ', ['pa', 'pi', 'pu', 'pe', 'po']],
  ['ぁぃぅぇぉゃゅょゎゔ', ['a', 'i', 'u', 'e', 'o', 'ya', 'yu', 'yo', 'wa', 'vu']],
]
const kana = Object.fromEntries(rows.flatMap(([characters, values]) => [...characters].map((character, i) => [character, values[i]!])) )
const pairs: Record<string, string> = {
  しゃ: 'sha', しゅ: 'shu', しょ: 'sho', ちゃ: 'cha', ちゅ: 'chu', ちょ: 'cho',
  じゃ: 'ja', じゅ: 'ju', じょ: 'jo', ぢゃ: 'ja', ぢゅ: 'ju', ぢょ: 'jo',
  しぇ: 'she', ちぇ: 'che', じぇ: 'je', てぃ: 'ti', でぃ: 'di', とぅ: 'tu', どぅ: 'du',
  てゅ: 'tyu', でゅ: 'dyu', ふぁ: 'fa', ふぃ: 'fi', ふぇ: 'fe', ふぉ: 'fo', ふゅ: 'fyu',
  ゔぁ: 'va', ゔぃ: 'vi', ゔぇ: 've', ゔぉ: 'vo', ゔゅ: 'vyu',
  うぃ: 'wi', うぇ: 'we', うぉ: 'wo', つぁ: 'tsa', つぃ: 'tsi', つぇ: 'tse', つぉ: 'tso',
}
for (const character of 'きぎにひびぴみり') {
  const root = kana[character]!.slice(0, -1)
  for (const [small, ending] of [['ゃ', 'ya'], ['ゅ', 'yu'], ['ょ', 'yo']]) pairs[character + small] = root + ending
}

export function kanaToRomaji(reading: string): string {
  const text = reading.normalize('NFKC').replace(/[ァ-ヶ]/g, c => String.fromCharCode(c.charCodeAt(0) - 0x60))
  let result = ''
  for (let i = 0; i < text.length; i++) {
    const character = text[i]!
    const next = pairs[text.slice(i + 1, i + 3)] ?? kana[text[i + 1]!] ?? ''
    if (character === 'っ') {
      result += next.startsWith('ch') ? 't' : /^[bcdfghjklmpqrstvwxyz]/.test(next) ? next[0] : ''
    } else if (character === 'ん') {
      result += /^[aeiouy]/.test(next) ? "n'" : 'n'
    } else if (character === 'ー') {
      result += result.match(/[aeiou][^aeiou]*$/)?.[0]?.[0] ?? ''
    } else {
      const pair = pairs[text.slice(i, i + 2)]
      result += pair ?? kana[character] ?? character
      if (pair) i++
    }
  }
  return result
}
