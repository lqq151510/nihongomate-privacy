# 随身日语伴侣

本仓库同时保留隐私政策网站和日语学习应用源码：

- [`index.html`](index.html)：原有隐私政策与用户服务协议页面，继续作为根目录网站入口。
- [`nihongomate/`](nihongomate/)：Vue / TypeScript / Capacitor 应用，以及可选的社交后端和联网语音服务。
- [应用运行与开发说明](nihongomate/README.md)

此次源码导入保留根隐私页面原字节，不修改 GitHub Pages 配置。源码提交不代表 App 网站、后端或语音服务已经部署，也不代表 Android 真机声音问题已经验证通过。

导入仅包含当前源码快照，不包含原 App Git 历史、发布签名材料、实际环境配置、数据库、依赖缓存或 APK。

## 开源许可

本项目自有源码及文档采用 [MIT License](LICENSE)，允许商用、修改及再分发，使用时需保留版权与许可声明。

第三方数据、依赖、Gradle wrapper 及素材继续遵守各自的许可证，不因本项目采用 MIT 而变更授权。派生词库 [`src/data/importedVocabulary.json`](nihongomate/src/data/importedVocabulary.json) 与 [`public/data/vocabulary-source.json`](nihongomate/public/data/vocabulary-source.json) 继续按 **CC BY-SA 4.0** 分发；来源、修改记录及上游许可声明见 [`nihongomate/public/licenses/`](nihongomate/public/licenses/)。
