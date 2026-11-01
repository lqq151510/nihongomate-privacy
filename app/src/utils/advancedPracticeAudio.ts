/** 长篇按句切分；没有标点的长段再按字符限制，避免系统语音超时。 */
export function segmentPracticeAudio(text: string, maxChars = 100): string[] {
  if (!Number.isInteger(maxChars) || maxChars < 1) return []
  const sentences = text.match(/[^。！？.!?\n]+[。！？.!?]?/gu) ?? []
  const result: string[] = []
  for (const raw of sentences) {
    // 角色标签用于阅读，不作为对话内容朗读；保留完整文字供界面展示。
    const spoken = raw.trim().replace(/^(?:男性|女性|男|女|話者[\dＡ-ＺA-Z一二三四]?|[Ａ-ＺA-Z])\s*[：:]\s*/u, '').replace(/[「」『』]/gu, '')
    const chars = Array.from(spoken)
    for (let i = 0; i < chars.length; i += maxChars) {
      const chunk = chars.slice(i, i + maxChars).join('').trim()
      if (chunk) result.push(chunk)
    }
  }
  return result
}

/** 逐句串行播放；每段开始前检查课程是否仍在当前页面。 */
export async function playPracticeAudio(
  chunks: string[], speak: (text: string) => Promise<boolean>, isCurrent: () => boolean,
): Promise<boolean> {
  if (!chunks.length) return false
  for (const chunk of chunks) {
    if (!isCurrent() || !await speak(chunk)) return false
  }
  return isCurrent()
}
