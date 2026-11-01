import { describe, expect, test } from 'bun:test'
import { createFeedbackCenter } from '../src/utils/feedback'

describe('非阻塞操作提示', () => {
  test('普通提示五秒后过期，重要错误保留至手动关闭', () => {
    let now = 100
    const center = createFeedbackCenter(() => now)
    center.notify('保存成功', 'success')
    center.notify('选择仅本会话有效', 'error', { persistent: true })
    now = 5099
    center.expire()
    expect(center.getMessages()).toHaveLength(2)
    now = 5100
    center.expire()
    expect(center.getMessages().map(item => item.message)).toEqual(['选择仅本会话有效'])
    now = 900000
    center.expire()
    expect(center.getMessages()).toHaveLength(1)
    center.dismiss(center.getMessages()[0]!.id)
    expect(center.getMessages()).toEqual([])
  })

  test('重复提示合并并刷新短提示期限，订阅可以清理', () => {
    let now = 0
    const center = createFeedbackCenter(() => now)
    let updates = 0
    const unsubscribe = center.subscribe(() => updates++)
    center.notify('已保存', 'success')
    const id = center.getMessages()[0]!.id
    now = 4000
    center.notify('已保存', 'success')
    expect(center.getMessages()).toHaveLength(1)
    expect(center.getMessages()[0]!.id).toBe(id)
    now = 5000
    center.expire()
    expect(center.getMessages()).toHaveLength(1)
    expect(updates).toBe(3)
    unsubscribe()
    center.dismiss(id)
    expect(updates).toBe(3)
  })

  test('普通新提示优先替换旧普通提示，不挤掉持久错误', () => {
    const center = createFeedbackCenter(() => 0)
    center.notify('重要错误', 'error')
    center.notify('成功一', 'success')
    center.notify('成功二', 'success')
    expect(center.getMessages().map(item => item.message)).toEqual(['重要错误', '成功二'])
    center.notify('第二个错误', 'error')
    center.notify('普通消息', 'info')
    expect(center.getMessages().map(item => item.message)).toEqual(['重要错误', '第二个错误'])
    center.notify('最新错误', 'error')
    expect(center.getMessages().map(item => item.message)).toEqual(['第二个错误', '最新错误'])
  })

  test('空消息不入队，返回的快照不能修改内部通知', () => {
    const center = createFeedbackCenter(() => 0)
    center.notify('   ')
    expect(center.getMessages()).toEqual([])
    center.notify('真实消息')
    const snapshot = center.getMessages()
    snapshot[0]!.message = '外部改写'
    expect(center.getMessages()[0]!.message).toBe('真实消息')
  })
})
