# 个人中心与声音自定义 · 2026-11-01

本轮按用户要求优化个人中心及日语朗读设置。已实现、完成本地验证并生成测试 APK；未提交、推送、安装到设备或发布。

## 使用入口

- 我的 → 自定义主页：照片/预设头像、昵称、简介、樱花粉/海盐蓝/抹茶绿/暮紫四色封面，修改时即时预览。
- 我的 → 更换朗读声音：直接滚动到声音设置并将焦点移到日语音色选择框。
- 声音设置：真实设备音色选择、上一种/下一种音色、0.75/0.9/1/1.15 四档语速、五档声音高低、问候/单词/句子试听、停止、刷新及恢复默认。
- 我的 → 学习偏好：设置 N5–N1 目标。课程缓存同步目标标记，保留当前正在学习的等级、题目和草稿。

封面配色只作用于个人资料卡及编辑预览。声音高低调整当前声音，不冒充新增音色或男女声；可选音色由设备语音服务实际提供。本地模式继续只列系统标记为离线的日语音色。Android 更换系统语音引擎后可能需要重新打开应用。

## 实现范围

本轮共 14 个运行/测试文件，其中 12 个基线已有文件、2 个新增文件：

- 个人中心：`src/components/SettingsView.vue`、`EditProfileModal.vue`、`src/utils/auth.ts`，新增 `src/utils/profileAppearance.ts`、`tests/profile-appearance.test.ts`，调整 `tests/privacy-auth.test.ts`。
- 声音：`src/components/SpeechSettings.vue`、`src/utils/speechPreferences.ts`、`nativeSpeech.ts`、`audio.ts`、`android/app/src/main/java/com/zebao/nihongomate/NativeSpeechPlugin.java`、`tests/speech-preferences.test.ts`、`tests/native-speech.test.ts`。
- 目标同步：`src/components/CurriculumView.vue`。

旧资料自动补默认封面；空简介再次编辑保持为空。旧朗读偏好补自然音高 1；非法值不能保存。保存失败保留旧值和当前输入。Web 与 Android 均使用同一音高偏好；Android 校验空值、有限数值及范围，并检查设置结果。

独立审查发现 Java 三元表达式将可空 Double 自动拆箱的问题，已将缺省分支改为 `Double.valueOf(1.0)`，并用 JDK 21 实际微复现验证空值等 9 个分支。浏览器 SpeechSynthesisUtterance 的浮点参数用 1e-6 容差断言，存储离散值仍精确比较。

## 验证结果

| 检查 | 实际结果 |
| --- | --- |
| 任务开始前测试 | 298 通过，0 失败 |
| 最终隔离副本全量测试 | 306 通过，0 失败，135899 次断言，48 个文件 |
| Vue/TypeScript 与 Vite | 通过；仍有既有大 JS 包体积提示 |
| Capacitor 同步与 Android release | JDK 21 离线构建通过 |
| APK 签名、ZIP 完整性、zipalign | 全部通过，沿用原证书 |
| APK 网页资源 | dist 的 10 个文件与 APK 对应内容逐字节相同 |
| 既有 Android res 资源 | 378 项路径和字节与任务前 APK 完全相同，包括图标 |
| 既有工作目录 APK | 2 个原有 APK 哈希保持 |
| 独立代码/发布审查 | 无剩余新增阻断项 |

浏览器使用独立本地端口与测试资料。最终隔离包在 `http://127.0.0.1:4202/` 验收：

- 320/360/390/768/1280px 五种宽度：文档及主内容无横向溢出，主内容可见按钮均至少 44px 高。
- 320×320：可滚动到保存并完成空简介保存，再次打开仍为空；关闭按钮 44×44，位于屏幕内。
- 海盐蓝、狐狸头像、昵称和简介刷新后保留；声音快捷入口将焦点交给音色选择框。
- 本机实际枚举 9 种日语音色；所选 Kyoko、0.75× 语速、0.9 音高刷新保留。手机可选数量不由此推断。
- 拦截发声请求，实际读到所选音色与速度/音高；切换例句、音高及离开页面会取消旧试听，不回写过期结果。
- 注入存储失败：资料/目标/朗读设置均提示失败，原字节和选中态保留，资料输入保留。
- 恢复朗读默认值为自动音色、0.9×、自然音高，合成学习记录字节保留。
- 模拟仅有一个离线音色与一个在线音色时，本地模式只显示离线项；模拟无音色时禁用试听并显示语音包指引。
- 控制台错误日志未观察到应用错误。工具脚本早期的浮点精确比较、文案匹配及等待已停用按钮已修正，后续验证通过。

音色枚举是真实系统结果；发声、可用音色异常及存储故障分支使用模拟拦截。未完成手机实际听音、系统语音引擎切换、覆盖安装保留数据和真机后台行为验证。

## 并行修改与隔离交付

任务期间同工作目录出现并行的“搭子”社交入口、隐私版本和 backend 修改，未纳入本轮功能范围。主目录保留这些改动；本轮最终交付从任务前快照加上述 14 个文件的隔离副本构建。早期主目录混合构建日志仅保留过程证据，不作为交付产物。

副本路径：
`/Users/liuyongze/.local/share/nihongomate/task-backups/personalization-20261101-182015/isolated-release`

构建前，202 个非本轮基线文件与快照完全一致。构建后，199 个保持原字节，其余 3 个差异均为正常 Android 网页生成资源（入口 HTML 和旧哈希 JS/CSS）；没有非预期源码变更。14 个本轮文件在构建后仍与主目录当前内容逐字节一致。副本 App/隐私使用基线版本，无社交入口、backend 或 JKS 密钥。签名继续从仓库外受限配置读取。

## 安装包与证据

- APK：`/Users/liuyongze/Desktop/日语/随身日语伴侣-v1.0-个人中心与声音自定义测试版-20261101.apk`
- 大小：4,520,729 字节，约 4.31 MiB。
- SHA-256：`833afdde16faf667e5a2d2d64ce6beade9939d6f5b60cc19c8268d66fefa9b52`
- 证书 SHA-256：`4e4edecddcf850e55295be63c848ea77c1fa5a822a5fcb6a73a13f8c546dd56b`
- 包名/版本：`com.zebao.nihongomate` / `1.0` / versionCode `1`。
- 证据目录：`/Users/liuyongze/Desktop/日语/release-evidence/20261101-personalization/`，含 isolated- 构建日志/清单、签名与对齐校验、浏览器结果、Java 微复现、delivery.json。
- 截图：`/Users/liuyongze/.codex/visualizations/2026/11/01/01a1969c-f5ca-79b1-8df9-6be63e1eac6d/` 下 `personal-center-final.png`、`voice-settings-final.png`、`profile-short-screen.png`，均为测试资料。
- 设计参考：[Stitch 私人项目](https://stitch.withgoogle.com/projects/15939085116966665661)，新增 screen `42d568fc48894d7d9612f07ed0cdea2c`；仅复用布局/配色，未采用设计稿虚构的 ID、计划、版本或缓存量。
- API 依据：[Android TextToSpeech](https://developer.android.com/reference/android/speech/tts/TextToSpeech#setPitch(float))、[浏览器 pitch](https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesisUtterance/pitch)。

## 回退与复盘

任务前源码与清单：`/Users/liuyongze/.local/share/nihongomate/task-backups/personalization-20261101-182015/source-before.tar.gz` 及 `manifest.json`。需要回退时先解压到临时目录，比较后只恢复本轮 12 个旧文件的差异，并另行处理两个新增文件；保留所有并行修改，不执行整仓库重置。旧 APK 保留。

本轮可复用的做法是：有界偏好兼容旧数据、持久化成功后再反馈、Web/原生同时验证，以及在共享工作目录出现并行变化时使用快照加白名单隔离交付。

