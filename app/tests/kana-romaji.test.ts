import { describe, expect, test } from 'bun:test'
import { kanaToRomaji } from '../src/utils/kanaToRomaji'

describe('扩展词库罗马字检索辅助', () => {
  test.each([
    ['たべる', 'taberu'], ['しんよう', "shin'you"], ['かんい', "kan'i"],
    ['がっこう', 'gakkou'], ['まっちゃ', 'matcha'], ['しゅっせき', 'shusseki'],
    ['きょうと', 'kyouto'], ['りょこう', 'ryokou'], ['コンピューター', 'konpyuutaa'],
    ['ｺｰﾋｰ', 'koohii'], ['ティッシュ', 'tisshu'], ['ファイル', 'fairu'],
  ])('%s → %s', (reading, romaji) => { expect(kanaToRomaji(reading)).toBe(romaji) })
})
