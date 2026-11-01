/** 本机个人资料。这里不提供身份认证、云同步或会员权益。 */
export interface UserProfile {
  uid: string
  nickname: string
  avatar: string
  bio: string
  registeredAt: string
  isLoggedIn: false
}

const STORAGE_KEY_AUTH = 'nihongomate_user_auth'
const STORAGE_KEY_LAST_SMS = 'nihongomate_last_sms_info'
const DEFAULT_BIO = '热爱日语，每天进步一点点 🌸'

export class AuthManager {
  constructor(private readonly profileStorage?: Storage) {}

  private get storage(): Storage {
    return this.profileStorage ?? localStorage
  }

  private normalize(value: Partial<UserProfile> = {}): UserProfile {
    return {
      uid: typeof value.uid === 'string' && value.uid ? value.uid : `local_${globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2)}`,
      nickname: typeof value.nickname === 'string' && value.nickname.trim() ? value.nickname.trim().slice(0, 16) : '日语研习生',
      avatar: typeof value.avatar === 'string' && value.avatar && !/^https?:/i.test(value.avatar) ? value.avatar : '🌸',
      bio: typeof value.bio === 'string' ? value.bio.slice(0, 60) : DEFAULT_BIO,
      registeredAt: typeof value.registeredAt === 'string' ? value.registeredAt : '',
      isLoggedIn: false,
    }
  }

  getProfile(): UserProfile {
    let profile = this.normalize()
    try {
      const saved = this.storage.getItem(STORAGE_KEY_AUTH)
      let parsed: unknown = null
      try {
        parsed = saved ? JSON.parse(saved) : null
      } catch {
        // 单独处理损坏资料，仍继续清除旧短信痕迹。
      }
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        profile = this.normalize(parsed as Partial<UserProfile>)
      }
      // 迁移旧演示账号：只保留本地资料，去除手机号、验证码痕迹和模拟登录态。
      const normalized = JSON.stringify(profile)
      if (saved !== normalized) this.storage.setItem(STORAGE_KEY_AUTH, normalized)
      this.storage.removeItem(STORAGE_KEY_LAST_SMS)
    } catch {
      // 存储受限时仍允许游客学习；不把资料写入日志。
    }
    return profile
  }

  saveProfile(profile: UserProfile): boolean {
    try {
      this.storage.setItem(STORAGE_KEY_AUTH, JSON.stringify(this.normalize(profile)))
      this.storage.removeItem(STORAGE_KEY_LAST_SMS)
      if (typeof window !== 'undefined') window.dispatchEvent(new Event('nihongomate:profile-updated'))
      return true
    } catch {
      return false
    }
  }

  updateProfile(updates: Pick<Partial<UserProfile>, 'nickname' | 'avatar' | 'bio'>): boolean {
    return this.saveProfile({ ...this.getProfile(), ...updates })
  }

  resetProfile(): boolean {
    return this.saveProfile(this.normalize())
  }
}

export const authManager = new AuthManager()
