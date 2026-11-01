export type ProfileTheme = 'sakura' | 'ocean' | 'matcha' | 'violet'

/** 本地资料封面配色，不改变学习正文的阅读配色。 */
export const PROFILE_THEMES = [
  { id: 'sakura', label: '樱花粉', accent: '#ad3655', background: '#fff0f3', decoration: '#efb6c5' },
  { id: 'ocean', label: '海盐蓝', accent: '#286182', background: '#edf6fb', decoration: '#a8d0e4' },
  { id: 'matcha', label: '抹茶绿', accent: '#426943', background: '#f0f6ec', decoration: '#b7cfaa' },
  { id: 'violet', label: '暮紫', accent: '#70508a', background: '#f5f0fb', decoration: '#cdb9e2' },
] as const

export function normalizeProfileTheme(value: unknown): ProfileTheme {
  return PROFILE_THEMES.some(theme => theme.id === value) ? value as ProfileTheme : 'sakura'
}

export function getProfileTheme(value: unknown) {
  return PROFILE_THEMES.find(theme => theme.id === normalizeProfileTheme(value))!
}
