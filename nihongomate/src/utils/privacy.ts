export const PRIVACY_VERSION = '2026-11-01-social-cloud-voice'
export const PRIVACY_STORAGE_KEY = 'nihongomate_privacy_decision'
export const PRIVACY_UPDATED_EVENT = 'nihongomate:privacy-updated'
export type PrivacyChoice = 'accepted' | 'local-only'
export interface PrivacyDecision {
  version: string
  choice: PrivacyChoice
}

// 选择立即在本次会话生效；按存储对象隔离，避免测试或不同容器互相污染。
const sessionDecisions = new WeakMap<Storage, PrivacyDecision>()

export function readPrivacyDecision(storage: Storage = localStorage): PrivacyDecision | null {
  try {
    const saved = JSON.parse(storage.getItem(PRIVACY_STORAGE_KEY) || 'null')
    if (saved?.version === PRIVACY_VERSION && ['accepted', 'local-only'].includes(saved.choice)) {
      return { version: PRIVACY_VERSION, choice: saved.choice }
    }
  } catch {
    // 损坏或不可访问的存储不代表用户已经同意。
  }
  return null
}

export function readEffectivePrivacyDecision(storage: Storage = localStorage): PrivacyDecision | null {
  return sessionDecisions.get(storage) ?? readPrivacyDecision(storage)
}

export function savePrivacyDecision(choice: PrivacyChoice, storage: Storage = localStorage): boolean {
  const decision = { version: PRIVACY_VERSION, choice }
  sessionDecisions.set(storage, decision)
  try {
    storage.setItem(PRIVACY_STORAGE_KEY, JSON.stringify(decision))
    storage.removeItem('nihongomate_privacy_agreed')
    return true
  } catch {
    if (choice === 'local-only') {
      try {
        // 配额不足时写入可能失败，但删除通常仍可用；避免下次启动恢复旧同意。
        storage.removeItem(PRIVACY_STORAGE_KEY)
      } catch {
        // 连删除也不可用时，本次会话仍执行更严格的选择，由界面提示重开后重选。
      }
    }
    return false
  } finally {
    if (typeof window !== 'undefined') window.dispatchEvent(new Event(PRIVACY_UPDATED_EVENT))
  }
}
