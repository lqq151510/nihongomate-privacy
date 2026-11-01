# 体验优化验收记录 · 2026-11-01

本轮按用户选择优化操作反馈、页面切换和易用性。保留前两轮未提交修改、每日全等级合计最多 10 个新词和搜索“多个关键词全部命中”的默认规则。课程继续免费；本轮没有接入广告、付费或远端服务，也没有提交、推送或发布。

## 已实现

- 四个学习页面使用有界 KeepAlive 缓存，切换底部导航后保留词卡位置/翻面、查询条件、滚动位置、进行中的练习答案。设置页不缓存。页面状态只在本次应用会话内保留，不承诺进程重启后恢复未完成轮次。
- 页面停用时停止朗读；连续假名/对话播放用轮次标记取消过期异步工作。假名测验不再自动播放下一题。
- 顶部非阻塞提示取代普通 alert；重复消息合并，普通提示到期消失，重要错误保留至手动关闭。保存目标成功后才更新界面。
- 资料编辑提供字段旁错误提示、输入焦点定位和保存失败保留输入；头像读取与异步裁剪结果有失效守卫。打卡复制/朗读的过期结果不会在关闭后回写。
- 根布局使用动态视口高度和独立滚动区，底部导航占正常布局空间并考虑安全区域。打卡、隐私选择、资料弹层限制总高度，正文内部滚动。
- 清除学习记录先读取完整快照；删除失败尝试恢复原字节，回滚不完整明确报告部分状态并使学习缓存失效。保留原生确认步骤。

## 修改范围

既有文件共 14 个：`src/App.vue`、`src/style.css`、`src/utils/audio.ts`、`src/utils/storage.ts`，以及 `src/components/` 下的 `ListeningLab.vue`、`CheckInModal.vue`、`CurriculumView.vue`、`SettingsView.vue`、`VocabFlashcard.vue`、`ExamPracticeView.vue`、`GojuonBoard.vue`、`GojuonQuiz.vue`、`PrivacyModal.vue`、`EditProfileModal.vue`。

新增运行文件：`src/utils/feedback.ts`、`src/utils/pageScroll.ts`、`src/utils/sequencePlayback.ts`、`src/utils/learningGoal.ts`、`src/components/ToastHost.vue`。

新增测试：`tests/feedback.test.ts`、`tests/navigation-ux.test.ts`、`tests/progress-reset.test.ts`。

对本轮开始前 40 个文件的 SHA-256 清单进行比对，只有上述 14 个既有文件发生变化，其余 26 个保持原字节；`src/` 下没有生成 JavaScript 副本。

## 自动化与构建

- `TZ=Asia/Shanghai bun test ./tests`：**78 项通过，0 失败，459 次断言**。包括连续朗读取消、存储失败不假成功、通知去重/保留、清除快照与完整/不完整回滚，以及此前学习队列、筛选和练习回归。
- 独立只读验证：本轮目标测试及相关隐私测试共 31 项、108 次断言通过；最终弹层补丁通过静态复核。
- `bun run build`：Vue/TypeScript 类型检查及 Vite 生产构建成功。短屏弹层最终补丁后重新构建成功。
- `cap sync android` 成功后，JDK 21 下 `./gradlew :app:assembleRelease --offline --max-workers=2 --console=plain` 成功。现有 flatDir/Gradle 弃用提示仍存在。
- `git diff --check` 通过。

## 真实浏览器验证

使用本机生产预览 `http://127.0.0.1:4193/` 和合成测试资料；不连接用户的真实学习记录。

| 场景 | 实际观察 |
| --- | --- |
| 词卡切换到设置再返回 | N5 浏览全部第 3/20 张“飲む”的反面保留 |
| 查询切页 | `タベル`、全部等级范围保留，仍匹配 1/62 个词 |
| 词库滚动 | 切页前后 `scrollTop` 均为 1688 |
| 练习切页 | N5 第 2/4 题、已选错误答案、正确答案及解析保留 |
| 修改学习目标 | 保存成功后顶部显示 N4 及成功提示，无 JS alert |
| 空昵称 | 显示字段旁错误，焦点回到 `profile-nickname`，弹层保留 |
| 保存合成资料 | 名称更新、弹层关闭、顶部成功提示出现，无 JS alert |
| 390×844 布局 | 文档宽度 390，导航底边 844，无横向溢出 |
| 390×400 隐私选择 | 卡片 top=16/bottom=384，两个选择按钮位于可见范围；完整政策可打开并返回 |
| 390×400 打卡 | 卡片 top=16/bottom=384；正文 clientHeight=183、scrollHeight=436；可以完成打卡，向下滚动可见复制按钮，关闭按钮位置固定 |
| 320×320 打卡/资料 | 卡片 top=16/bottom=304，文档宽度 320；可滚动到复制入口、关闭打卡，并完成合成昵称保存 |

短屏问题在修改前已真实复现：390×400 下打卡关闭按钮 top=-95.25，签到按钮 bottom=489.25，无法正常访问；修复后按上表复测。

截图位于 `/Users/liuyongze/.codex/visualizations/2026/11/01/01a194c1-1a8e-7dd3-a49e-e46bbadb6024/`：

- `ux-profile-validation-mobile.jpg`：空昵称与焦点提示。
- `ux-profile-saved-mobile.jpg`：合成资料保存成功反馈。
- `ux-checkin-short-screen.jpg`：390×400 短屏内滚动后按钮及关闭入口。

## 未验证与工具限制

- 清除记录的真实 UI 取消流程未完成：IAB 点击原生确认入口后发生自动化超时，对话框句柄不可用。没有发送确认删除操作，也不能把取消尝试记为已取消成功。测试标签页关闭尝试同样超时，未重启浏览器或清除站点数据。后续切换独立 Edge 测试页完成其他验收；该页已关闭、视口已恢复，生产预览服务已停止。
- Edge 控制台只观察到来自 `chrome-extension://.../build/hook-exec.js` 的重复 Vue Devtools 扩展提示，未观察到应用来源的错误；不据此改动用户扩展。IAB 卡住后无法完成其最终日志检查。
- 未在 vivo 真机或 Android 模拟器安装运行；真实系统键盘、手势安全区和 Android 日语语音包仍需设备验收。朗读异步取消与不可用分支以自动化模拟验证为主，没有声称完成真人听音或真机语音验证。
- 本地存储的清除成功/失败/部分回滚由模拟存储测试覆盖，不能替代真机存储故障测试。

## 测试安装包

- 路径：`/Users/liuyongze/Desktop/随身日语伴侣-v1.0-体验优化测试版-20261101.apk`
- 大小：3,352,331 字节（约 3.20 MiB）。
- SHA-256：`e319abc0171659b950d935d01e0792753f032fc04a68a38b84c481677bfed4bd`
- 证书 SHA-256：`4e4edecddcf850e55295be63c848ea77c1fa5a822a5fcb6a73a13f8c546dd56b`，与上一轮“功能优化测试版”相同。
- `apksigner verify` 通过；ZIP 完整性通过；当前 dist 的 4 个文件与 APK 中 `assets/public/` 对应文件逐字节一致。
- 包名及版本沿用原配置 `com.zebao.nihongomate` / `1.0` / versionCode `1`，本包用于本地测试，没有商店发布动作。前两轮桌面 APK 保留。

## 回退与复盘

本轮开始前源码快照：`/Users/liuyongze/.local/share/nihongomate/task-backups/20261101-ux-pass-123937/source-before.tar.gz`，同目录 `manifest.json` 是 40 个文件的校验清单。需要回退时先解压到临时目录、逐文件比较并恢复本轮差异，另行处理本轮新增文件；不要用 `git reset --hard` 或按 HEAD 整体恢复，否则会丢失前两轮未提交成果。APK 可选前一轮保留版本，但同签名覆盖安装是否保留设备数据仍须真机验收。

本次最有价值的检查是同时测“窄”和“矮”：缓存状态与错误处理可由目标测试覆盖，弹层按钮是否可达必须补实际布局验证。今后复用“卡片限高、固定标题/关闭入口、正文滚动”的结构，并在点击原生确认框前确认测试工具支持对话框取消。
