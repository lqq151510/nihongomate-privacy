export type LearningLevel = 'N5' | 'N4' | 'N3' | 'N2' | 'N1'

/** 先持久化，再由界面更新目标和通知其他页面。 */
export function saveLearningGoal(level: LearningLevel, storage: Storage = localStorage): boolean {
  try {
    storage.setItem('nihongomate_user_goal', level)
    return true
  } catch {
    return false
  }
}
