export const DAILY_NEW_WORD_LIMIT = 10

/**
 * 今日任务先复习到期词，再学习剩余额度内的新词。
 * 可调整的学习策略：到期词顺序来自存储层，新词保持词库顺序。
 * 纯函数不修改记录，方便用少量代码尝试其他排序策略并验证。
 * 可选练习 TODO：尝试在每日额度内调整新词顺序；保留当前完整实现即可正常运行。
 */
export function buildStudyQueue(
  wordIds: readonly string[],
  learnedWordIds: readonly string[],
  dueWordIds: readonly string[],
  newWordAllowance = DAILY_NEW_WORD_LIMIT
): string[] {
  const available = new Set(wordIds)
  const learned = new Set(learnedWordIds)
  const due = [...new Set(dueWordIds)].filter(id => available.has(id) && learned.has(id))
  const newWords = [...new Set(wordIds)].filter(id => !learned.has(id))
  const allowance = Math.max(0, Math.floor(newWordAllowance))
  return [...due, ...newWords.slice(0, allowance)]
}
