# Azure 联网多音色待配置交付 · 2026-11-01

用户反馈设备音色太少，选择联网多音色，并明确没有 Azure 服务、先接好功能和本机配置入口。本轮已经实现这一准备范围；没有创建云账号、配置真实 Key、发起 Azure 合成、安装设备或发布。

## 现在可以做什么

“我的 → 更换朗读声音”新增“联网多音色（Azure）”。官方候选为 Nanami、Aoi、Mayu、Shiori 四种女声，以及 Keita、Daichi、Naoki 三种男声。它们是不同声音，不是改变音高。

无 Azure 配置时，七项显示“待配置，尚不可用”，不能启用或试听。完成服务连接后，仅当前区域实际返回并确认的声音可以选择。设备声音仍可使用。

本轮对连接地址、访问口令、音色选择、语速/音高、试听停止、失败提示和默认关闭行为完成接入。需要全局隐私允许联网、单独同意发送朗读文本，以及有效的服务连接，才能启用联网朗读。云端失败不静默替换成设备声音。

## 本机配置入口

macOS 可双击：

`/Users/liuyongze/Desktop/日语/nihongomate/voice-service/configure.command`

它在独立 `.venv` 中准备依赖，再以隐藏输入读取 Azure Speech 区域、Key 和自设代理口令；没有 Azure 服务时区域和 Key 可以先留空。真实配置不写进代码或 APK，保存在：

`~/.local/share/nihongomate/voice-service/config.json`（目录 700，文件 600）。

依赖已在本机独立环境安装并通过 `pip check`。启动入口为 `voice-service/run.sh`，默认只监听 `127.0.0.1:4210`，不会自动开放公网。临时验收服务已在测试后停止。

Azure Key 只保留在 Python 服务端。应用填写的是语音服务地址和独立访问口令；手机外出使用还需要另行部署手机可访问的 HTTPS 服务。本轮没有部署公网服务。详细步骤见 `voice-service/README.md`。

## 修改范围

- 新增 `src/utils/cloudSpeech.ts`、`src/components/CloudSpeechSettings.vue`、`tests/cloud-speech.test.ts`。
- 最小调整 `src/utils/audio.ts`、`src/components/SpeechSettings.vue`、`src/components/SettingsView.vue`。
- 更新 `src/utils/privacy.ts`、`src/components/PrivacyModal.vue`、`public/privacy.html` 的可选云语音告知；主目录保留并行社交内容，政策版本追加 cloud-voice。
- 新增独立 `voice-service/`：服务、配置脚本、启动脚本、双击入口、示例配置、依赖、README 与测试。不修改已有 `backend/`。
- `.gitignore` 仅补充本服务的虚拟环境和 Python 测试缓存目录。

服务端使用七声音白名单和实际 Azure 区域声音列表，转义 SSML 文本。声音列表最多重试一次，音频合成 POST 不自动重试。默认每日预算 5000 字符，按上海日期通过 SQLite 持久计数；已发送但失败/超时的请求保守计入。缓存最多 32 项、8 MiB、1 小时，命中不发起合成。最多两个并发合成。预算和缓存不等于已验证 Azure 实际计费。

客户端限制 HTTPS（回环地址开发可 HTTP）、声音 ID、16–512 位 ASCII 访问口令、超时和最多 10 MiB 音频。停止会中止请求并释放媒体及对象 URL；迟到结果不会播放。明确撤销联网即使存储失败，也会在当前会话停用，原存储字节保留并提示失败。

## 实际验证

| 验证 | 结果 |
| --- | --- |
| 隔离版全量前端测试 | 326 通过，0 失败，135991 次断言，49 个文件 |
| 独立语音目标复核 | 54 通过，0 失败，257 次断言 |
| 独立 Python 服务测试 | 15 通过；在独立 venv 重跑通过 |
| Python 环境 | pip check 通过，包含 httpx SOCKS extra |
| Vue/TypeScript、Vite、Capacitor | 通过 |
| Android release | JDK 21 离线构建通过，117 项任务 |
| APK 签名和 zipalign | 通过，沿用原证书 |
| APK 网页资源 | dist 的 10 个文件逐字节相同 |
| Android 既有资源 | 378 项 res 资源与上一版逐字节相同，包括图标 |
| 敏感配置排除 | APK 无 Key、JKS、.env 或 voice-service 目录 |

真实本地服务使用不存在的临时配置路径、空 Azure Key 和测试代理口令启动，未读取用户真实配置：`/health` 返回 configured:false；`/v1/voices` 返回 0 可用、7 待配置；错误口令返回 401。浏览器实际通过 CORS 连接该无 Key 服务，显示“服务已连接，但 Azure 资源尚未配置”，联网按钮禁用。这只验证本地服务，不是 Azure 实际调用。

模拟 Azure/媒体验证：七个声音显示确认后，可以选择 Keita、Aoi；两个试听请求携带各自正确 voiceId、0.75 语速和 0.9 音高；切声音取消旧试听，实际终止回调后才显示结束。没有真人听音或真实 Azure 音频解码验证。

浏览器还验证了 320/360/390/768/1280px 五种宽度无横向溢出，主内容按钮均至少 44px；320×320 的服务地址输入可滚动访问。快捷入口焦点定位到声音来源选择。

独立审查与修复：
- 用户环境有 SOCKS 代理，系统 Python 缺 socksio 导致 HTTPX 构造失败；改用 `httpx[socks]` 独立环境，保留用户代理配置。
- 补齐服务端实际 provider_* 错误码的客户端中文映射，以真实错误码回归。
- 修改服务 URL 时同步清空输入草稿口令并撤销验证；未重填新口令时禁用检测。真实浏览器 A→B 回归：A 请求 1 次，B 请求 0 次，未向 B 发送旧口令。
- 早期浏览器脚本误把完整政策页当同意弹层、用可见文字匹配带 aria-label 的音色卡，已按真实界面路径修正并复测；这些不属于产品已验证缺陷。

## 隔离交付与安装包

沿用上一轮已验证、无社交入口的个人中心隔离副本作为基线，仅加入本轮运行文件和独立服务。本轮云语音告知分别应用到主目录社交版本与隔离基线，保留并行工作，未按 Git HEAD 恢复。

隔离副本：
`/Users/liuyongze/.local/share/nihongomate/task-backups/online-voice-20261101-184546/isolated-release`

APK：
`/Users/liuyongze/Desktop/日语/随身日语伴侣-v1.0-联网多音色待配置测试版-20261101.apk`

- 大小：4,527,865 字节，约 4.32 MiB。
- SHA-256：`f78e706ab1de3785eb7c7ff90226372fa0312e4ad73cf83d369e212fe8361ba1`。
- 证书 SHA-256：`4e4edecddcf850e55295be63c848ea77c1fa5a822a5fcb6a73a13f8c546dd56b`。
- 包名/版本：`com.zebao.nihongomate` / `1.0` / versionCode `1`。
- 前一版个人中心 APK 保留且哈希相同。新包没有覆盖旧包。
- 未安装到手机、未提交、未推送、未发布；没有发起真实 Azure 请求或产生已知云端费用。

## 证据、回退与后续验收

证据目录：
`/Users/liuyongze/Desktop/日语/release-evidence/online-voice-20261101-184546/`

其中包含前端/服务测试、依赖安装、网页/Android 构建、签名对齐、真实无 Key 服务、模拟浏览器流程和交付 JSON。截图为：
`/Users/liuyongze/.codex/visualizations/2026/11/01/01a1969c-f5ca-79b1-8df9-6be63e1eac6d/online-voices-pending.png`。

任务前快照及清单在 `/Users/liuyongze/.local/share/nihongomate/task-backups/online-voice-20261101-184546/`。回退应先解压到临时目录、比较后只还原本轮涉及的已有文件，另行处理新增文件；`.gitignore` 只移除新增的四条 voice-service 缓存忽略项。保留并行社交改动，不能整仓重置。

下一阶段需要 Azure Speech 资源 Key、区域和手机可达 HTTPS 服务，再验证实际区域声音、真实听感、端到端延迟、计费、手机覆盖安装及后台行为。当前候选数量不能当作实际账号已可播放数量。

官方依据：[日语音色列表](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/language-support?tabs=tts)、[Azure REST 文档](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/rest-text-to-speech)、[SSML 参数](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/speech-synthesis-markup-voice)。
