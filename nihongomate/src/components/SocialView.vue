<template>
  <div class="social-page h-full min-h-0 overflow-y-auto">
    <div class="social-content">
      <header class="social-heading">
        <div><p class="eyebrow">LEARN TOGETHER</p><h2>一起学，走得更远。</h2><p>找一位搭子，把坚持变成日常。</p></div>
        <span class="heading-icon" aria-hidden="true"><UsersRound :size="28" :stroke-width="1.5" /></span>
      </header>

      <p v-if="error" class="notice error" role="alert">{{ error }}<button type="button" @click="error = ''" aria-label="关闭错误提示">×</button></p>
      <p v-if="notice" class="notice success" role="status">{{ notice }}</p>

      <section v-if="!privacyAccepted" class="panel welcome-panel">
        <ShieldCheck :size="27" class="rose" aria-hidden="true" />
        <h3>联网共学，由你选择</h3>
        <p>好友和自习室需要连接服务。请先查看隐私政策并选择允许联网，再单独开启学习搭子功能。</p>
        <p>本地课程与学习记录仍可正常使用。</p>
        <button type="button" class="primary" @click="openPrivacy">查看隐私与联网选择</button>
      </section>

      <template v-else>
        <section v-if="showConnection || !state.enabled" class="panel">
          <h3><Server :size="18" aria-hidden="true" /> {{ state.baseUrl ? '连接学习搭子服务' : '多人学习服务待配置' }}</h3>
          <p class="muted">与伙伴连接同一服务后，即可添加好友、加入自习室并讨论学习。</p>
          <p v-if="!state.baseUrl" class="inline-tip">当前开发阶段尚未配置可供手机访问的多人学习服务。配置完成后即可使用；本地课程和学习记录不受影响。</p>
          <form class="stack" @submit.prevent="connectService">
            <label>服务地址<input v-model="serviceUrl" type="url" required maxlength="300" placeholder="https://study.example.com" autocomplete="url" /></label>
            <label class="check-line"><input v-model="uploadConsent" type="checkbox" required /><span>我同意将主动填写的在线资料、好友关系、自习室和讨论消息发送至此服务。学习记录不会自动上传。</span></label>
            <p class="muted">请填写运营方提供的可信服务地址。手机连接须使用 HTTPS，账号密码只发往上面的地址。</p>
            <div class="actions"><button class="primary" type="submit" :disabled="!!busy || !uploadConsent">{{ state.enabled ? '保存连接设置' : '开启联网功能' }}</button><button v-if="state.enabled" class="secondary" type="button" @click="showConnection = false">收起设置</button></div>
          </form>
        </section>

        <template v-if="state.enabled">
          <div class="connection-bar"><span><span class="connection-dot" aria-hidden="true"></span>{{ state.baseUrl }}</span><button type="button" @click="showConnection = !showConnection">连接设置</button><button type="button" :disabled="!!busy" @click="disconnect">关闭联网</button></div>

          <section v-if="!state.token || !state.user" class="panel account-panel">
            <div class="section-heading"><h3>{{ authMode === 'register' ? '创建在线账号' : '登录在线账号' }}</h3><span class="badge">与本机资料独立</span></div>
            <p class="muted">已有学习进度留在本机。请为共学单独填写在线昵称，默认不出现在搭子推荐中。</p>
            <div class="segmented" aria-label="账号操作"><button type="button" :aria-pressed="authMode === 'login'" @click="authMode = 'login'">登录</button><button type="button" :aria-pressed="authMode === 'register'" @click="authMode = 'register'">注册</button></div>
            <form class="stack" @submit.prevent="authenticate">
              <label>用户名<input v-model="authForm.username" required minlength="3" maxlength="24" pattern="[A-Za-z0-9_]+" autocomplete="username" placeholder="3–24 位字母、数字或下划线" /></label>
              <label>密码<input v-model="authForm.password" type="password" required minlength="8" maxlength="128" :autocomplete="authMode === 'register' ? 'new-password' : 'current-password'" placeholder="至少 8 位" /></label>
              <div v-if="authMode === 'register'" class="form-grid"><label>在线昵称<input v-model="authForm.nickname" required maxlength="16" autocomplete="nickname" placeholder="给共学伙伴看的昵称" /></label><label>学习级别<select v-model="authForm.level"><option v-for="level in levels" :key="level">{{ level }}</option></select></label></div>
              <button class="primary" type="submit" :disabled="!!busy">{{ busy === 'auth' ? '正在连接…' : authMode === 'register' ? '注册并登录' : '登录学习搭子' }}</button>
            </form>
          </section>

          <template v-else>
            <section class="panel identity-panel">
              <div class="identity-top"><div class="identity-avatar" aria-hidden="true">{{ state.user.nickname.slice(0, 1) }}</div><div class="identity-info"><strong>{{ state.user.nickname }}</strong><span>@{{ state.user.username }} · {{ state.user.level }}</span></div><button type="button" class="text-button" @click="showProfile = !showProfile">在线资料</button><button type="button" class="text-button" :disabled="!!busy" @click="logout">退出</button></div>
              <form v-if="showProfile" class="stack profile-form" @submit.prevent="saveProfile">
                <div class="form-grid"><label>在线昵称<input v-model="profileForm.nickname" required maxlength="16" /></label><label>学习级别<select v-model="profileForm.level"><option v-for="level in levels" :key="level">{{ level }}</option></select></label></div>
                <label>共学简介<textarea v-model="profileForm.bio" maxlength="120" rows="2" placeholder="想练什么、通常什么时候有空？" /></label>
                <label class="check-line"><input v-model="profileForm.discoverable" type="checkbox" /><span>允许出现在搭子推荐和昵称搜索中</span></label>
                <p class="muted">即使关闭推荐，知道完整用户名的人仍可精确找到你。</p>
                <button class="primary" type="submit" :disabled="!!busy">{{ busy === 'profile' ? '保存中…' : '保存在线资料' }}</button>
              </form>
            </section>

            <div class="social-tabs" aria-label="共学内容"><button v-for="tab in tabs" :key="tab.id" type="button" :aria-pressed="activeTab === tab.id" @click="changeTab(tab.id)"><component :is="tab.icon" :size="17" aria-hidden="true" />{{ tab.label }}<span v-if="tab.id === 'friends' && friends.incoming.length" class="count">{{ friends.incoming.length }}</span></button></div>

            <section v-if="activeTab === 'discover'" class="stack">
              <div class="section-heading"><div><h3>找到同路的学习伙伴</h3><p class="muted">按级别或昵称发现，或搜索完整用户名。</p></div><button class="text-button" type="button" :disabled="loading" @click="refreshCommunity()">刷新</button></div>
              <form class="search-form" @submit.prevent="searchUsers"><label class="sr-only" for="partner-search">搜索学习搭子</label><input id="partner-search" v-model="searchQuery" type="search" maxlength="40" placeholder="昵称或完整用户名" /><label class="sr-only" for="partner-level">搭子级别</label><select id="partner-level" v-model="searchLevel"><option value="">全部级别</option><option v-for="level in levels" :key="level">{{ level }}</option></select><button class="secondary" :disabled="loading" type="submit"><Search :size="17" aria-hidden="true" /><span>搜索</span></button></form>
              <p v-if="!state.user.discoverable" class="inline-tip">你尚未开启搭子推荐。可以在“在线资料”中主动开启。</p>
              <p v-if="loading && !users.length" class="empty" role="status">正在寻找伙伴…</p>
              <div v-else-if="!users.length" class="panel empty"><UsersRound :size="30" aria-hidden="true" /><h3>还没有找到搭子</h3><p>让伙伴注册同一服务，再搜索对方的完整用户名；也可以开启推荐，等待同级别伙伴加入。</p></div>
              <article v-for="user in users" :key="user.id" class="panel person-card"><div class="person-avatar" aria-hidden="true">{{ user.nickname.slice(0, 1) }}</div><div class="person-info"><div><strong>{{ user.nickname }}</strong><span class="badge">{{ user.level }}</span></div><p class="username">@{{ user.username }}</p><p>{{ user.bio || '一起积累，一起进步。' }}</p></div><button class="secondary" type="button" :disabled="!!busy || relation(user.id) !== 'add'" @click="requestFriend(user.id)">{{ relation(user.id) === 'friend' ? '已是好友' : relation(user.id) === 'outgoing' ? '已申请' : relation(user.id) === 'incoming' ? '待你处理' : '加好友' }}</button></article>
            </section>

            <section v-else-if="activeTab === 'friends'" class="stack">
              <div class="section-heading"><h3>我的共学好友</h3><button class="text-button" type="button" :disabled="loading" @click="refreshCommunity()">刷新好友</button></div>
              <div v-if="friends.incoming.length" class="stack"><h4>收到的好友申请 · {{ friends.incoming.length }}</h4><article v-for="request in friends.incoming" :key="request.id" class="panel request-card"><div><strong>{{ request.user.nickname }}</strong><p class="muted">@{{ request.user.username }} · {{ request.user.level }}</p></div><div class="actions"><button class="primary" type="button" :disabled="!!busy" @click="respondFriend(request.id, true)">同意</button><button class="secondary" type="button" :disabled="!!busy" @click="respondFriend(request.id, false)">拒绝</button></div></article></div>
              <p v-if="!friends.friends.length" class="panel empty">暂时还没有好友。去“找搭子”搜索伙伴，申请获同意后就会显示在这里。</p>
              <article v-for="friend in friends.friends" :key="friend.id" class="panel person-card"><div class="person-avatar" aria-hidden="true">{{ friend.nickname.slice(0, 1) }}</div><div class="person-info"><strong>{{ friend.nickname }}</strong><p class="username">@{{ friend.username }} · {{ friend.level }}</p><p>{{ friend.bio || '互相鼓励，继续进步。' }}</p></div><button class="text-button" type="button" :disabled="!!busy" @click="removeFriend(friend)">移除好友</button></article>
              <div class="inline-tip">想邀请好友一起讨论？创建自习室，把房间邀请码分享给对方即可。对方主动加入后才能查看消息。</div>
              <div v-if="friends.outgoing.length" class="stack"><h4>已发出的申请 · {{ friends.outgoing.length }}</h4><div v-for="request in friends.outgoing" :key="request.id" class="panel request-card"><div><strong>{{ request.user.nickname }}</strong><p class="muted">@{{ request.user.username }}</p></div><span class="muted">等待对方确认</span></div></div>
            </section>

            <section v-else class="stack">
              <template v-if="!roomDetail">
                <div class="section-heading"><div><h3>找一个房间，一起专注</h3><p class="muted">加入后可查看成员、交流学习问题。</p></div><button class="text-button" type="button" :disabled="loading" @click="refreshCommunity()">刷新房间</button></div>
                <div class="actions"><button class="primary" type="button" @click="showCreateRoom = !showCreateRoom"><Plus :size="17" aria-hidden="true" />创建自习室</button><button class="secondary" type="button" @click="showInviteJoin = !showInviteJoin"><KeyRound :size="17" aria-hidden="true" />邀请码加入</button></div>
                <form v-if="showInviteJoin" class="panel stack" @submit.prevent="joinByCode"><label>自习室邀请码<input v-model="inviteCode" required maxlength="40" autocomplete="off" placeholder="输入伙伴分享的邀请码" /></label><button class="primary" type="submit" :disabled="!!busy">加入此自习室</button></form>
                <form v-if="showCreateRoom" class="panel stack" @submit.prevent="createRoom"><h3>创建你的共学空间</h3><label>房间名称<input v-model="roomForm.title" required maxlength="40" placeholder="例如：N5 每日共学" /></label><label>共学主题<textarea v-model="roomForm.description" rows="2" maxlength="200" placeholder="想一起学什么？约定怎样讨论？" /></label><div class="form-grid"><label>学习级别<select v-model="roomForm.level"><option v-for="level in levels" :key="level">{{ level }}</option></select></label><label>人数上限<input v-model.number="roomForm.capacity" type="number" min="2" max="50" required /></label></div><label>房间可见性<select v-model="roomForm.visibility"><option value="public">公开 · 登录用户可以发现并加入</option><option value="private">私密 · 仅凭邀请码加入</option></select></label><button class="primary" type="submit" :disabled="!!busy">{{ busy === 'create-room' ? '创建中…' : '创建并进入' }}</button></form>
                <p v-if="loading && !rooms.length" class="empty" role="status">正在读取自习室…</p>
                <div v-else-if="!rooms.length" class="panel empty"><BookOpen :size="30" aria-hidden="true" /><h3>第一间自习室，等你开启</h3><p>还没有可见的自习室。创建一间，或用伙伴分享的邀请码加入。</p></div>
                <article v-for="room in rooms" :key="room.id" class="panel room-card"><div class="section-heading"><span class="badge">{{ room.level }} · {{ room.visibility === 'private' ? '私密' : '公开' }}</span><span class="muted">{{ room.member_count }}/{{ room.capacity }} 位成员</span></div><h3>{{ room.title }}</h3><p>{{ room.description || '在这里讨论今天的学习问题。' }}</p><div class="room-footer"><span class="muted">{{ room.is_member ? '你已加入' : '加入后可参与讨论' }}</span><button class="secondary" type="button" :disabled="!!busy || (!room.is_member && room.member_count >= room.capacity)" @click="enterRoom(room)">{{ room.is_member ? '进入自习室' : room.member_count >= room.capacity ? '人数已满' : '加入自习室' }}</button></div></article>
              </template>
              <template v-else>
                <div class="room-top"><button class="text-button" type="button" @click="closeRoom"><ArrowLeft :size="16" aria-hidden="true" />房间列表</button><button class="text-button danger" type="button" :disabled="!!busy" @click="leaveRoom">退出自习室</button></div>
                <section class="panel room-detail"><div class="section-heading"><span class="badge">{{ roomDetail.room.level }} · {{ roomDetail.room.visibility === 'private' ? '私密' : '公开' }}</span><span class="muted">{{ roomDetail.room.member_count }}/{{ roomDetail.room.capacity }} 位成员</span></div><h3>{{ roomDetail.room.title }}</h3><p>{{ roomDetail.room.description }}</p><div v-if="roomDetail.room.invite_code" class="invite-line"><label>房间邀请码<input :value="roomDetail.room.invite_code" readonly aria-label="房间邀请码" @focus="($event.target as HTMLInputElement).select()" /></label><button class="secondary" type="button" @click="copyInvite"><Copy :size="15" aria-hidden="true" />复制</button></div><p class="muted">分享邀请码可邀请好友。请只发给你希望加入的伙伴。</p><details><summary>查看成员（{{ roomDetail.members.length }}）</summary><div class="member-list"><span v-for="member in roomDetail.members" :key="member.id">{{ member.nickname }}<small>{{ member.id === roomDetail.room.owner_id ? '房主' : member.level }}</small></span></div></details></section>
                <section class="panel discussion-panel" aria-label="自习室文字讨论"><div class="section-heading"><h3><MessageCircle :size="18" aria-hidden="true" />学习讨论</h3><span class="muted">每 4 秒同步</span></div><p class="muted">只显示最近 100 条消息。围绕学习友好交流，不要发送密码或个人隐私。</p><p v-if="roomLoading" class="empty" role="status">正在读取讨论…</p><div v-else-if="!messages.length" class="empty">还没有讨论。说说今天想一起学什么吧。</div><div v-else ref="messageList" class="message-list" tabindex="0" aria-label="讨论消息"><article v-for="message in messages" :key="message.id" :class="['message', { mine: message.user_id === state.user.id }]"><div class="message-meta"><strong>{{ message.nickname }}</strong><time :datetime="message.created_at">{{ formatTime(message.created_at) }}</time></div><p>{{ message.content }}</p></article></div><form class="stack composer" @submit.prevent="sendMessage"><label class="sr-only" for="room-message">讨论消息</label><textarea id="room-message" v-model="messageDraft" maxlength="1000" rows="3" placeholder="分享问题、学习方法，或今天的目标…" :disabled="roomLoading" /><div class="section-heading"><span class="muted">{{ messageDraft.length }}/1000 · {{ sendFailed ? '发送失败，可保留原文重试' : '文字讨论' }}</span><button class="primary" type="submit" :disabled="!!busy || roomLoading || !messageDraft.trim()"><Send :size="16" aria-hidden="true" />{{ busy === 'send' ? '发送中…' : sendFailed ? '重试发送' : '发送消息' }}</button></div></form></section>
              </template>
            </section>
          </template>
        </template>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, reactive, ref } from 'vue'
import { ArrowLeft, BookOpen, Copy, KeyRound, MessageCircle, Plus, Search, Send, Server, ShieldCheck, UserRoundCheck, UsersRound } from 'lucide-vue-next'
import { readEffectivePrivacyDecision } from '@/utils/privacy'
import { socialClient, type FriendState, type RoomDetail, type RoomMessage, type SocialState, type SocialUser, type StudyRoom } from '@/utils/social'

type CommunityTab = 'discover' | 'friends' | 'rooms'
const levels = ['N5', 'N4', 'N3', 'N2', 'N1']
const tabs = [{ id: 'discover' as const, label: '找搭子', icon: UsersRound }, { id: 'friends' as const, label: '好友', icon: UserRoundCheck }, { id: 'rooms' as const, label: '自习室', icon: BookOpen }]
const state = ref<SocialState>(socialClient.getState())
const privacyAccepted = ref(readEffectivePrivacyDecision()?.choice === 'accepted')
const activeTab = ref<CommunityTab>('discover')
const serviceUrl = ref(state.value.baseUrl)
const uploadConsent = ref(false)
const showConnection = ref(!state.value.enabled)
const authMode = ref<'login' | 'register'>('login')
const authForm = reactive({ username: '', password: '', nickname: '', level: 'N5' })
const profileForm = reactive({ nickname: '', level: 'N5', bio: '', discoverable: false })
const showProfile = ref(false)
const searchQuery = ref('')
const searchLevel = ref('')
const users = ref<SocialUser[]>([])
const friends = ref<FriendState>({ friends: [], incoming: [], outgoing: [] })
const rooms = ref<StudyRoom[]>([])
const roomDetail = ref<RoomDetail | null>(null)
const messages = ref<RoomMessage[]>([])
const messageDraft = ref('')
const sendFailed = ref(false)
const messageList = ref<HTMLElement | null>(null)
const showCreateRoom = ref(false)
const showInviteJoin = ref(false)
const inviteCode = ref('')
const roomForm = reactive({ title: '', description: '', level: 'N5', capacity: 8, visibility: 'public' as 'public' | 'private' })
const busy = ref('')
const loading = ref(false)
const roomLoading = ref(false)
const error = ref('')
const notice = ref('')
const signedIn = computed(() => privacyAccepted.value && state.value.enabled && !!state.value.token && !!state.value.user)
let alive = true
let sessionGeneration = 0
let roomGeneration = 0
let searchGeneration = 0
// 仅 GET 拉取的消息推进游标；POST 回包不能越过其他成员尚未同步的消息。
let lastFetchedMessageId = 0
let sessionController = new AbortController()
let roomController = new AbortController()
let polling = false
let timer: ReturnType<typeof setInterval> | undefined
let pendingMessage: { room: string; content: string; clientId: string } | null = null

function syncProfile() {
  if (state.value.user) Object.assign(profileForm, { nickname: state.value.user.nickname, level: state.value.user.level, bio: state.value.user.bio, discoverable: state.value.user.discoverable })
}

function invalidateSession() {
  sessionGeneration += 1
  searchGeneration += 1
  sessionController.abort()
  sessionController = new AbortController()
  clearRoom()
  users.value = []
  friends.value = { friends: [], incoming: [], outgoing: [] }
  rooms.value = []
  loading.value = false
  busy.value = ''
}

function synchronizeState() {
  const next = socialClient.getState()
  privacyAccepted.value = readEffectivePrivacyDecision()?.choice === 'accepted'
  if (next.token !== state.value.token || next.baseUrl !== state.value.baseUrl || !next.enabled || !privacyAccepted.value) invalidateSession()
  state.value = next
  if (!signedIn.value) { authForm.password = ''; showProfile.value = false }
  syncProfile()
}

function openPrivacy() { window.dispatchEvent(new Event('nihongomate:show-privacy')) }
function errorText(value: unknown) { return value instanceof Error ? value.message : '操作失败，请稍后重试。' }
function isCancelled(value: unknown) { return value instanceof Error && (value.name === 'AbortError' || value.message === '请求已取消。') }

async function perform(key: string, task: () => Promise<void>) {
  if (busy.value) return
  error.value = ''; notice.value = ''; busy.value = key
  const generation = sessionGeneration
  try { await task() } catch (failure) {
    if (alive && generation === sessionGeneration && !isCancelled(failure)) error.value = errorText(failure)
  } finally { if (alive && (generation === sessionGeneration || busy.value === key)) busy.value = '' }
}

function api<T>(path: string, options: { method?: string; body?: unknown; signal?: AbortSignal } = {}) {
  return socialClient.request<T>(`/api${path}`, { ...options, signal: options.signal ?? sessionController.signal })
}

function connectService() {
  error.value = ''; notice.value = ''
  if (!uploadConsent.value) { error.value = '请先确认在线资料和讨论消息的发送范围。'; return }
  try {
    socialClient.configure(serviceUrl.value)
    synchronizeState()
    serviceUrl.value = state.value.baseUrl
    showConnection.value = false
    notice.value = '连接设置已保存，请登录或注册在线账号。'
  } catch (failure) { error.value = errorText(failure) }
}

async function authenticate() {
  await perform('auth', async () => {
    const result = await api<{ token: string; user: SocialUser }>(`/auth/${authMode.value}`, { method: 'POST', body: authMode.value === 'register' ? { ...authForm } : { username: authForm.username, password: authForm.password } })
    socialClient.setSession(result)
    synchronizeState()
    authForm.password = ''
    busy.value = 'auth'
    notice.value = `欢迎，${result.user.nickname}。`
    await refreshCommunity()
  })
}

async function logout() {
  await perform('logout', async () => {
    try { await api('/auth/logout', { method: 'POST' }) } finally { socialClient.clearSession(); synchronizeState() }
  })
}

async function disconnect() {
  await perform('disconnect', async () => {
    try { if (state.value.token) await api('/auth/logout', { method: 'POST' }) } finally { socialClient.disable(); synchronizeState(); uploadConsent.value = false; showConnection.value = true }
  })
}

async function saveProfile() {
  await perform('profile', async () => {
    const user = await api<SocialUser>('/me', { method: 'PATCH', body: { ...profileForm } })
    socialClient.setSession({ token: state.value.token, user })
    synchronizeState(); showProfile.value = false; notice.value = '在线资料已保存。'
    await refreshCommunity()
  })
}

async function searchUsers() {
  if (!signedIn.value) return
  const generation = sessionGeneration
  const search = ++searchGeneration
  loading.value = true
  error.value = ''
  try {
    const result = await api<SocialUser[]>(`/users?${new URLSearchParams({ q: searchQuery.value.trim(), ...(searchLevel.value ? { level: searchLevel.value } : {}) })}`)
    if (alive && generation === sessionGeneration && search === searchGeneration) users.value = result
  } catch (failure) { if (generation === sessionGeneration && search === searchGeneration && !isCancelled(failure)) error.value = errorText(failure) }
  finally { if (generation === sessionGeneration && search === searchGeneration) loading.value = false }
}

async function refreshCommunity(silent = false) {
  if (!signedIn.value) return
  const generation = sessionGeneration
  const search = ++searchGeneration
  if (!silent) { loading.value = true; error.value = '' }
  try {
    const result = await Promise.all([
      api<FriendState>('/friends'), api<StudyRoom[]>('/rooms'),
      api<SocialUser[]>(`/users?${new URLSearchParams({ q: searchQuery.value.trim(), ...(searchLevel.value ? { level: searchLevel.value } : {}) })}`),
    ])
    if (!alive || generation !== sessionGeneration) return
    friends.value = result[0]; rooms.value = result[1]
    if (search === searchGeneration) users.value = result[2]
    if (silent && error.value.startsWith('同步失败：')) error.value = ''
  } catch (failure) {
    if (alive && generation === sessionGeneration && !isCancelled(failure)) error.value = `${silent ? '同步失败：' : ''}${errorText(failure)}`
  } finally { if (generation === sessionGeneration && search === searchGeneration) loading.value = false }
}

function relation(id: string) {
  if (friends.value.friends.some(user => user.id === id)) return 'friend'
  if (friends.value.outgoing.some(request => request.user.id === id)) return 'outgoing'
  if (friends.value.incoming.some(request => request.user.id === id)) return 'incoming'
  return 'add'
}

async function requestFriend(id: string) {
  await perform(`friend-${id}`, async () => { await api('/friends/requests', { method: 'POST', body: { user_id: id } }); notice.value = '好友申请已发送，等待对方确认。'; await refreshCommunity() })
}
async function respondFriend(id: string, accept: boolean) {
  await perform(`respond-${id}`, async () => { await api(`/friends/requests/${encodeURIComponent(id)}/respond`, { method: 'POST', body: { accept } }); notice.value = accept ? '已成为好友，邀请对方一起共学吧。' : '已拒绝此申请。'; await refreshCommunity() })
}
async function removeFriend(friend: SocialUser) {
  if (!window.confirm(`移除好友“${friend.nickname}”？之后可以重新申请。`)) return
  await perform(`remove-${friend.id}`, async () => { await api(`/friends/${encodeURIComponent(friend.id)}`, { method: 'DELETE' }); await refreshCommunity(); notice.value = '已移除好友。' })
}

function clearRoom() {
  roomGeneration += 1
  lastFetchedMessageId = 0
  roomController.abort(); roomController = new AbortController()
  roomDetail.value = null; messages.value = []; messageDraft.value = ''; roomLoading.value = false; sendFailed.value = false; pendingMessage = null
}
function closeRoom() { clearRoom(); error.value = ''; void refreshCommunity() }
function changeTab(tab: CommunityTab) { if (tab !== activeTab.value && roomDetail.value) clearRoom(); activeTab.value = tab; notice.value = ''; error.value = '' }

async function createRoom() {
  await perform('create-room', async () => {
    const room = await api<StudyRoom>('/rooms', { method: 'POST', body: { ...roomForm } })
    showCreateRoom.value = false; roomForm.title = ''; roomForm.description = ''
    await openRoom(room)
  })
}
async function joinByCode() {
  await perform('join-code', async () => { const room = await api<StudyRoom>('/rooms/join', { method: 'POST', body: { invite_code: inviteCode.value.trim() } }); showInviteJoin.value = false; inviteCode.value = ''; await openRoom(room) })
}
async function enterRoom(room: StudyRoom) {
  await perform(`join-${room.id}`, async () => {
    const joined = room.is_member ? room : await api<StudyRoom>(`/rooms/${encodeURIComponent(room.id)}/join`, { method: 'POST' })
    await openRoom(joined)
  })
}
async function openRoom(room: StudyRoom) {
  clearRoom(); activeTab.value = 'rooms'; roomLoading.value = true
  roomDetail.value = { room, members: [] }
  await refreshRoom()
}

function mergeMessages(incoming: RoomMessage[]) {
  const merged = new Map(messages.value.map(message => [message.id, message]))
  incoming.forEach(message => merged.set(message.id, message))
  messages.value = [...merged.values()].sort((left, right) => left.id - right.id).slice(-100)
}

async function refreshRoom() {
  const room = roomDetail.value?.room
  if (!room || !signedIn.value) return
  const generation = roomGeneration
  const session = sessionGeneration
  const after = lastFetchedMessageId
  const shouldScroll = !messageList.value || messageList.value.scrollHeight - messageList.value.scrollTop - messageList.value.clientHeight < 80
  try {
    const [detail, incoming] = await Promise.all([
      api<RoomDetail>(`/rooms/${encodeURIComponent(room.id)}`, { signal: roomController.signal }),
      api<RoomMessage[]>(`/rooms/${encodeURIComponent(room.id)}/messages?after=${after}`, { signal: roomController.signal }),
    ])
    if (!alive || session !== sessionGeneration || generation !== roomGeneration) return
    roomDetail.value = detail; mergeMessages(incoming)
    if (incoming.length) lastFetchedMessageId = Math.max(lastFetchedMessageId, ...incoming.map(message => message.id))
    roomLoading.value = false
    if (error.value.startsWith('同步失败：')) error.value = ''
    if (shouldScroll) { await nextTick(); messageList.value?.scrollTo({ top: messageList.value.scrollHeight }) }
  } catch (failure) {
    if (alive && session === sessionGeneration && generation === roomGeneration && !isCancelled(failure)) error.value = `同步失败：${errorText(failure)}`
  } finally { if (generation === roomGeneration) roomLoading.value = false }
}

async function sendMessage() {
  const room = roomDetail.value?.room
  const content = messageDraft.value.trim()
  if (!room || !content) return
  if (!pendingMessage || pendingMessage.room !== room.id || pendingMessage.content !== content) pendingMessage = { room: room.id, content, clientId: crypto.randomUUID() }
  const pending = pendingMessage
  const generation = roomGeneration
  await perform('send', async () => {
    try {
      const message = await api<RoomMessage>(`/rooms/${encodeURIComponent(room.id)}/messages`, { method: 'POST', body: { content, client_id: pending.clientId }, signal: roomController.signal })
      if (!alive || generation !== roomGeneration) return
      mergeMessages([message]); sendFailed.value = false; pendingMessage = null
      if (messageDraft.value.trim() === content) messageDraft.value = ''
      await nextTick(); messageList.value?.scrollTo({ top: messageList.value.scrollHeight })
    } catch (failure) { if (generation === roomGeneration && !isCancelled(failure)) sendFailed.value = true; throw failure }
  })
}

async function leaveRoom() {
  const room = roomDetail.value?.room
  if (!room) return
  const ownerText = room.owner_id === state.value.user?.id ? '你是房主：有其他成员时将自动移交房主，否则房间会解散。' : ''
  if (!window.confirm(`退出“${room.title}”？${ownerText}`)) return
  await perform('leave-room', async () => { await api(`/rooms/${encodeURIComponent(room.id)}/leave`, { method: 'POST' }); clearRoom(); await refreshCommunity(); notice.value = '已退出自习室。' })
}

async function copyInvite() {
  const code = roomDetail.value?.room.invite_code
  if (!code) return
  try { await navigator.clipboard.writeText(code); notice.value = '邀请码已复制，可分享给共学伙伴。' }
  catch { notice.value = '无法自动复制，请点选上面的邀请码后手动复制。' }
}
function formatTime(value: string) { const date = new Date(value); return Number.isNaN(date.getTime()) ? '' : date.toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }) }

async function poll() {
  if (polling || busy.value || loading.value || roomLoading.value || document.visibilityState !== 'visible' || !signedIn.value) return
  polling = true
  try { if (roomDetail.value) await refreshRoom(); else await refreshCommunity(true) } finally { polling = false }
}
function onVisibility() {
  if (document.visibilityState === 'hidden') {
    sessionController.abort(); sessionController = new AbortController()
    roomController.abort(); roomController = new AbortController()
  } else void poll()
}

onMounted(async () => {
  window.addEventListener('nihongomate:social-updated', synchronizeState)
  window.addEventListener('nihongomate:privacy-updated', synchronizeState)
  document.addEventListener('visibilitychange', onVisibility)
  syncProfile()
  timer = setInterval(() => { void poll() }, 4000)
  if (signedIn.value) {
    await perform('restore', async () => {
      const user = await api<SocialUser>('/me')
      socialClient.setSession({ token: state.value.token, user }); synchronizeState()
      await refreshCommunity()
    })
  }
})
onUnmounted(() => {
  alive = false; if (timer) clearInterval(timer)
  window.removeEventListener('nihongomate:social-updated', synchronizeState)
  window.removeEventListener('nihongomate:privacy-updated', synchronizeState)
  document.removeEventListener('visibilitychange', onVisibility)
  invalidateSession()
})
</script>

<style scoped>
.social-page { background: #faf8f9; color: #243247; }
.social-content { width: 100%; max-width: 840px; margin: auto; padding: 22px 20px 32px; display: flex; flex-direction: column; gap: 16px; }
.social-heading { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 3px 0 5px; }
.eyebrow { color: #a8566b; font-size: 10px; letter-spacing: .16em; font-weight: 700; margin: 0 0 8px; }
.social-heading h2 { font-family: 'Songti SC', 'Noto Serif SC', serif; font-size: clamp(20px, 3vw, 27px); font-weight: 700; margin: 0 0 8px; }
.social-heading > div > p:last-child { font-size: 12px; color: #768091; }
.heading-icon { background: #f6e8ed; color: #be3455; display: grid; place-items: center; width: 58px; height: 58px; border-radius: 20px; flex-shrink: 0; }
.panel { background: white; border: 1px solid #e9e5e8; border-radius: 18px; padding: 18px; min-width: 0; }
h3 { font-size: 15px; font-weight: 700; margin: 0; line-height: 1.5; display: flex; align-items: center; gap: 7px; }
h4 { font-size: 12px; font-weight: 700; color: #758091; margin: 0; }
p { margin: 0; line-height: 1.7; font-size: 12px; overflow-wrap: anywhere; }
.panel > p { margin-top: 7px; }
.muted { color: #738091; font-size: 11px; font-weight: 400; line-height: 1.7; }
.rose { color: #be3455; }
.stack { display: flex; flex-direction: column; gap: 13px; min-width: 0; }
form.stack { margin-top: 15px; }
label { display: flex; flex-direction: column; gap: 6px; font-size: 12px; font-weight: 600; min-width: 0; }
input:not([type='checkbox']), select, textarea { width: 100%; min-width: 0; border: 1px solid #e2e4e9; border-radius: 10px; background: #fbfbfc; color: #243247; font-size: 13px; padding: 10px 11px; outline: none; font-weight: 400; }
input:not([type='checkbox']), select { min-height: 43px; }
input:focus, select:focus, textarea:focus { border-color: #be3455; box-shadow: 0 0 0 2px #be345515; }
textarea { resize: vertical; line-height: 1.7; }
.check-line { flex-direction: row; align-items: flex-start; font-weight: 400; line-height: 1.8; gap: 9px; }
.check-line input { margin-top: 4px; accent-color: #be3455; flex-shrink: 0; width: 16px; height: 16px; }
button { display: inline-flex; align-items: center; justify-content: center; gap: 6px; transition: background-color .15s; }
button:disabled { cursor: default; opacity: .5; }
.primary, .secondary { min-height: 42px; border-radius: 11px; padding: 10px 14px; font-size: 12px; font-weight: 650; line-height: 1.5; }
.primary { background: #be3455; color: white; border: 1px solid #be3455; }
.primary:hover:not(:disabled) { background: #a82b49; }
.secondary { color: #a82c4d; background: #fff; border: 1px solid #ead4dc; }
.secondary:hover:not(:disabled) { background: #fff4f7; }
.text-button { color: #a73553; font-size: 11px; padding: 8px 0; min-height: 36px; flex-shrink: 0; }
.actions { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
.section-heading { display: flex; align-items: center; justify-content: space-between; gap: 9px; min-width: 0; }
.section-heading h3 { overflow-wrap: anywhere; }
.form-grid { display: grid; grid-template-columns: minmax(0, 2fr) minmax(0, 1fr); gap: 12px; }
.notice { position: relative; padding: 11px 35px 11px 13px; border-radius: 11px; font-size: 12px; line-height: 1.7; }
.notice.error { color: #a62d48; background: #fff0f3; border: 1px solid #f3cdd7; }
.notice.success { color: #32704e; background: #f0f8f2; border: 1px solid #d6e9dc; }
.notice button { position: absolute; right: 4px; top: 2px; width: 32px; height: 32px; font-size: 20px; }
.connection-bar { display: flex; flex-wrap: wrap; align-items: center; gap: 7px 13px; color: #738091; font-size: 10px; }
.connection-bar > span { flex: 1; min-width: 80px; overflow-wrap: anywhere; }
.connection-bar button { color: #a73553; min-height: 28px; }
.connection-dot { display: inline-block; width: 6px; height: 6px; margin-right: 6px; background: #a0a7b3; border-radius: 100%; }
.welcome-panel { display: flex; flex-direction: column; gap: 10px; align-items: flex-start; padding: 24px; }
.welcome-panel > p { margin: 0; }
.badge { display: inline-flex; align-items: center; border-radius: 6px; background: #f8eef2; color: #a73553; font-size: 10px; padding: 3px 7px; white-space: nowrap; font-weight: 600; }
.segmented { display: flex; background: #f4f3f6; border-radius: 11px; padding: 4px; margin-top: 14px; gap: 4px; }
.segmented button { flex: 1; padding: 8px; font-size: 12px; border-radius: 8px; color: #738091; }
.segmented button[aria-pressed='true'] { background: white; color: #a73553; font-weight: 700; }
.identity-panel { padding: 14px 16px; }
.identity-top { display: flex; align-items: center; gap: 11px; }
.identity-avatar, .person-avatar { display: grid; place-items: center; color: #a73553; background: #f7edf1; border-radius: 14px; font-family: 'Songti SC', serif; flex-shrink: 0; }
.identity-avatar { width: 42px; height: 42px; font-size: 20px; }
.identity-info { display: flex; flex: 1; flex-direction: column; min-width: 0; gap: 3px; }
.identity-info strong { font-size: 13px; overflow-wrap: anywhere; }
.identity-info span { font-size: 10px; color: #738091; overflow-wrap: anywhere; }
.profile-form { border-top: 1px solid #efedf0; padding-top: 15px; }
.social-tabs { display: flex; gap: 3px; border-bottom: 1px solid #e7e3e8; }
.social-tabs button { position: relative; flex: 1; min-width: 0; min-height: 47px; font-size: 13px; color: #738091; padding: 0 5px 10px; }
.social-tabs button[aria-pressed='true'] { color: #b33152; font-weight: 700; }
.social-tabs button[aria-pressed='true']::after { content: ''; position: absolute; bottom: -1px; width: 34px; height: 3px; border-radius: 5px 5px 0 0; background: #be3455; }
.count { display: inline-grid; place-items: center; background: #be3455; color: white; border-radius: 100%; min-width: 17px; height: 17px; font-size: 9px; }
.search-form { display: flex; gap: 7px; min-width: 0; }
.search-form > input { flex: 1; width: 0; }
.search-form select { width: 95px; padding-left: 7px; padding-right: 4px; flex-shrink: 0; font-size: 11px; }
.search-form button { padding: 8px 10px; }
.inline-tip { background: #f3f2f5; color: #738091; border-radius: 11px; padding: 11px 13px; font-size: 11px; line-height: 1.8; }
.empty { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 30px 18px; gap: 10px; color: #788192; text-align: center; font-size: 12px; line-height: 1.8; }
.empty svg { color: #b58e9c; }
.empty h3 { color: #536074; font-size: 14px; }
.person-card { display: flex; align-items: center; gap: 12px; padding: 15px; }
.person-avatar { width: 43px; height: 47px; font-size: 22px; }
.person-info { min-width: 0; flex: 1; }
.person-info > div { display: flex; align-items: center; flex-wrap: wrap; gap: 7px; }
.person-info strong { font-size: 13px; overflow-wrap: anywhere; }
.person-info p { color: #738091; font-size: 11px; margin-top: 3px; }
.person-info p.username { font-size: 10px; color: #8e94a0; }
.person-card > button { flex-shrink: 0; font-size: 10px; padding: 7px 9px; }
.request-card { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 10px; }
.request-card strong { font-size: 13px; overflow-wrap: anywhere; }
.request-card .primary, .request-card .secondary { min-height: 36px; padding: 7px 12px; font-size: 11px; }
.room-card h3 { margin-top: 13px; font-size: 17px; font-family: 'Songti SC', 'Noto Serif SC', serif; }
.room-card > p { min-height: 22px; color: #738091; }
.room-footer { display: flex; justify-content: space-between; align-items: center; gap: 10px; border-top: 1px solid #f0edf0; padding-top: 13px; margin-top: 14px; }
.room-top { display: flex; justify-content: space-between; gap: 10px; }
.danger { color: #9a485a; }
.room-detail > h3 { font-size: 20px; font-family: 'Songti SC', 'Noto Serif SC', serif; margin-top: 11px; }
.invite-line { display: flex; align-items: flex-end; gap: 9px; margin-top: 15px; }
.invite-line label { flex: 1; min-width: 0; color: #738091; font-size: 10px; }
.invite-line input { letter-spacing: .08em; font-size: 13px; background: #fbf7f9; }
.room-detail details { font-size: 11px; color: #738091; margin-top: 13px; border-top: 1px solid #efedf0; padding-top: 12px; }
.room-detail summary { cursor: pointer; padding: 3px 0; }
.member-list { display: flex; flex-wrap: wrap; gap: 8px; padding-top: 10px; }
.member-list > span { border: 1px solid #e9e5e8; border-radius: 8px; padding: 5px 8px; color: #536074; }
.member-list small { margin-left: 6px; color: #a73553; font-size: 9px; }
.discussion-panel { padding: 16px; }
.discussion-panel > p { font-size: 10px; }
.message-list { display: flex; flex-direction: column; gap: 16px; max-height: 340px; min-height: 90px; overflow-y: auto; padding: 18px 4px 8px; overscroll-behavior: contain; }
.message { max-width: 88%; align-self: flex-start; min-width: 100px; }
.message.mine { align-self: flex-end; }
.message-meta { display: flex; flex-wrap: wrap; gap: 3px 9px; color: #8a91a0; font-size: 9px; margin-bottom: 4px; }
.message-meta strong { font-weight: 500; color: #738091; overflow-wrap: anywhere; }
.message.mine .message-meta { justify-content: flex-end; }
.message > p { background: #f3f4f7; color: #435066; padding: 10px 12px; border-radius: 0 12px 12px 12px; font-size: 12px; line-height: 1.9; white-space: pre-wrap; overflow-wrap: anywhere; }
.message.mine > p { background: #f8e9ee; color: #82334b; border-radius: 12px 0 12px 12px; }
.composer { padding-top: 14px; border-top: 1px solid #eeebef; }
.composer textarea { font-size: 12px; background: white; }
.composer .section-heading > span { max-width: 60%; font-size: 9px; }
@media (min-width: 600px) { .social-content { padding: 28px 32px 40px; gap: 20px; } .panel { padding: 22px; } .person-card { padding: 18px; } .message-list { max-height: 400px; } }
@media (max-width: 359px) { .social-content { padding-left: 12px; padding-right: 12px; } .panel { padding: 14px; } .heading-icon { width: 47px; height: 47px; } .search-form { gap: 5px; } .search-form select { width: 81px; } .search-form button span { display: none; } .person-card { gap: 8px; } .person-avatar { width: 34px; height: 40px; font-size: 18px; } .badge { font-size: 9px; } .identity-top { gap: 8px; } .identity-top .text-button { font-size: 10px; } }
</style>
