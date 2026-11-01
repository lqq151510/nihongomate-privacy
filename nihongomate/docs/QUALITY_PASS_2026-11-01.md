# 2026-11-01 本地修复与验证记录

本批是本地免费学习版本的基础修复，不代表已发布或已通过 vivo 审核。
代码未提交、未推送；在线隐私页面、商店草稿和既有申报材料未同步修改。

## 实际改动

- 今日学习：到期词优先，各等级每天合计最多 10 个新词；完成后停止循环。
  浏览全部不修改学习记录、不消耗每日配额，课程访问不受任务量限制。
- 持久化：本地日历日期统一跨日处理；签到与背词分开统计；保存失败留在当前卡片，
  第二次统计写入失败时尽力恢复此前词汇记录。
- 本地资料：移除模拟短信登录与伪账号入口；迁移旧数据，保留昵称、头像、简介和独立学习记录。
- 隐私：政策版本化，提供完整本地政策与重新选择入口。仅本地模式只调用系统声明为本地服务的日语音色。
  选择立即在当前会话生效；无法持久化时尽力移除旧同意，无法删除时明确提示当前会话限制。
- 语音：无音色、引擎错误、取消和超时会结束等待；对话停止后不继续下一句。
- 内容：按实际数组显示词汇和语法数量；修正假名、读音解释、双正确选项及排序歧义；
  移除未有证据支持的真题、原声、名师、完整课程等描述。
- 构建：类型检查使用 `vue-tsc --noEmit`，Vite 负责生产打包。
  原 24 个同名生成 JavaScript 文件已移到仓库外备份，避免旧文件遮蔽 TypeScript。
- 签名：使用仓库外受限配置和原密钥，缺配置时阻止 release 构建；原两份密钥保留备份。

## 已完成的检查

| 检查 | 结果与边界 |
| --- | --- |
| `TZ=Asia/Shanghai bun test ./tests` | 41 项通过，318 个断言，0 失败；存储和语音使用隔离模拟 |
| `bun run build` | 类型检查与 Vite 生产构建通过；源码目录未再产生 `.js` |
| 浏览器交互 | 完成十词后停止、跨级额度共用、自由浏览、签到 1 天、昵称刷新保留通过 |
| 生产页面 | 完整隐私政策、重新选择本地模式通过；检查期间控制台无警告或错误 |
| 移动尺寸 | 390 × 844 页面截图已检查；不等同 Android 真机验证 |
| 签名配置 | `verifyReleaseSigning` 通过；缺少配置时 `preReleaseBuild` 如预期失败 |
| 补丁格式 | `git diff --check` 通过 |

## 最终 APK 证据

- 首次 Android `assembleRelease` 成功；最终网页同步后，
  `:app:assembleRelease --offline --max-workers=2 --console=plain` 再次成功。
- 桌面安装包：`/Users/liuyongze/Desktop/随身日语伴侣-v1.0-修复测试版-20261101.apk`。
- 大小：3,344,603 字节。包名：`com.zebao.nihongomate`，versionCode：1，versionName：1.0。
- APK SHA-256：`a1f86accfc183c4c27c0ca3f2fbc1035b97d85fed4a5c2ff25f86bcaba648eef`。
- `apksigner verify` 通过；新旧 APK 证书 SHA-256 完全一致：
  `4e4edecddcf850e55295be63c848ea77c1fa5a822a5fcb6a73a13f8c546dd56b`。
- ZIP 完整性通过；APK 的 `assets/public/` 下对应 4 个生产文件逐字节一致：
  `index.html`、`privacy.html`、`assets/index-Drynhcsf.css`、`assets/index-Duo8iYUL.js`。
- 桌面原有 `随身日语伴侣-v1.0.apk` 没有覆盖。这是本地测试包，尚未安装到 vivo 真机或上传商店。

## 验证边界与后续事项

- 未完成 vivo 真机安装、设备日语语音引擎、飞行模式、后台切换与原生系统备份验证。
- 内容仍是精选练习，未扩充成完整 N1–N5 课程；整库授权和专业日语审校未完成。
- 广告、付费会员、支付、云账号尚未接入。运营主体和平台准入按最终商业化方案另行核验。
- Git 历史仍保留旧签名材料；本批只处理当前工作树，没有重写历史或更换发布密钥。
- 申报截图、使用说明书、托管隐私政策和商店文案需要与最终待提交版本同步。

## 备份与回退

构建与签名步骤见 `docs/LOCAL_RELEASE.md`。本次改动前 APK 保留于：

`~/.local/share/nihongomate/build-backups/20261101-before-quality-pass.apk`

同名生成文件保留于 `~/.local/share/nihongomate/build-backups/20261101-generated-js/`。
原签名文件保留于 `~/.local/share/nihongomate/signing/backups/20261101-quality-pass/`。
若需回退，按本批差异还原应用逻辑，保留仓库外签名配置；不要把密钥或密码重新填回仓库。
