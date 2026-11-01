import { describe, expect, test } from 'bun:test'
import { AuthManager } from '../src/utils/auth'
import { PROFILE_THEMES, getProfileTheme, normalizeProfileTheme } from '../src/utils/profileAppearance'

class MemoryStorage implements Storage {
  values = new Map<string, string>()
  get length() { return this.values.size }
  clear() { this.values.clear() }
  getItem(key: string) { return this.values.get(key) ?? null }
  key(index: number) { return [...this.values.keys()][index] ?? null }
  removeItem(key: string) { this.values.delete(key) }
  setItem(key: string, value: string) { this.values.set(key, value) }
}
const profileKey = 'nihongomate_user_auth'

describe('个人主页配色', () => {
  test('只接受内置配色，异常或旧数据回到樱花粉', () => {
    for (const theme of PROFILE_THEMES) {
      expect(normalizeProfileTheme(theme.id)).toBe(theme.id)
      expect(getProfileTheme(theme.id)).toBe(theme)
    }
    for (const value of [undefined, null, '', 'external-css', {}, 1]) {
      expect(normalizeProfileTheme(value)).toBe('sakura')
      expect(getProfileTheme(value).id).toBe('sakura')
    }
  })

  test('旧资料补默认配色，保留原昵称与空简介', () => {
    const storage = new MemoryStorage()
    storage.setItem(profileKey, JSON.stringify({ uid: 'local_fixture', nickname: '练习者', avatar: '🍵', bio: '' }))
    const profile = new AuthManager(storage).getProfile()
    expect(profile).toMatchObject({ nickname: '练习者', avatar: '🍵', bio: '', theme: 'sakura' })
  })

  test('配色与资料一起保存，重读保留；重置不影响学习和朗读偏好', () => {
    const storage = new MemoryStorage()
    const manager = new AuthManager(storage)
    storage.setItem('nihongomate_word_records', 'keep-learning')
    storage.setItem('nihongomate_speech_preferences', 'keep-speech')
    expect(manager.updateProfile({ nickname: '海风', theme: 'ocean', bio: '' })).toBe(true)
    expect(manager.getProfile()).toMatchObject({ nickname: '海风', theme: 'ocean', bio: '' })
    expect(manager.resetProfile()).toBe(true)
    expect(manager.getProfile().theme).toBe('sakura')
    expect(storage.getItem('nihongomate_word_records')).toBe('keep-learning')
    expect(storage.getItem('nihongomate_speech_preferences')).toBe('keep-speech')
  })

  test('写入失败不替换已保存的配色与资料', () => {
    const storage = new MemoryStorage()
    const manager = new AuthManager(storage)
    expect(manager.updateProfile({ nickname: '原昵称', theme: 'matcha', bio: '' })).toBe(true)
    const before = storage.getItem(profileKey)
    storage.setItem = () => { throw new Error('quota exceeded') }
    expect(manager.updateProfile({ nickname: '未保存', theme: 'violet', bio: '未保存' })).toBe(false)
    expect(storage.getItem(profileKey)).toBe(before)
    expect(manager.getProfile()).toMatchObject({ nickname: '原昵称', theme: 'matcha', bio: '' })
  })
})
