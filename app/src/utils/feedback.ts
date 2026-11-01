export type FeedbackType = 'success' | 'error' | 'info'
export interface FeedbackMessage {
  id: number
  message: string
  type: FeedbackType
  persistent: boolean
  expiresAt: number | null
}

/** A small, DOM-independent notice queue; the host owns its lifecycle timer. */
export function createFeedbackCenter(now: () => number = Date.now) {
  let nextId = 0
  let messages: FeedbackMessage[] = []
  const listeners = new Set<(messages: FeedbackMessage[]) => void>()
  const snapshot = () => messages.map(message => ({ ...message }))
  const emit = () => listeners.forEach(listener => listener(snapshot()))
  return {
    getMessages: snapshot,
    subscribe(listener: (messages: FeedbackMessage[]) => void) {
      listeners.add(listener)
      listener(snapshot())
      return () => { listeners.delete(listener) }
    },
    notify(message: string, type: FeedbackType = 'info', options: { persistent?: boolean } = {}) {
      message = message.trim()
      if (!message) return
      const previous = messages.find(item => item.message === message && item.type === type)
      const persistent = previous?.persistent || (options.persistent ?? type === 'error')
      const item = { id: previous?.id ?? ++nextId, message, type, persistent, expiresAt: persistent ? null : now() + 5000 }
      if (previous) messages = messages.map(value => value.id === previous.id ? item : value)
      else {
        if (messages.length >= 2) {
          const expendable = messages.findIndex(value => !value.persistent)
          // Routine notices must not dismiss an important error on the user's behalf.
          if (expendable < 0 && !persistent) return
          messages.splice(expendable >= 0 ? expendable : 0, 1)
        }
        messages.push(item)
      }
      emit()
    },
    dismiss(id: number) {
      messages = messages.filter(item => item.id !== id)
      emit()
    },
    expire() {
      const retained = messages.filter(item => item.expiresAt === null || item.expiresAt > now())
      if (retained.length !== messages.length) { messages = retained; emit() }
    },
  }
}

export const feedbackCenter = createFeedbackCenter()
export function notifyUser(message: string, type: FeedbackType = 'info', options?: { persistent?: boolean }): void {
  feedbackCenter.notify(message, type, options)
}
