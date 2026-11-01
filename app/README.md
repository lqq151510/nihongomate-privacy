# 随身日语伴侣

日语学习应用源码，包含分级课程、专项练习和模拟考场。课程题目用于学习参考，并非 JLPT 官方试题；题目内容尚需日语专业人员审校。听力使用设备语音合成，音色和可用性因设备而异。

## 开发

需安装 Bun 和 Node.js。进入本目录后执行：

```sh
bun install --frozen-lockfile
bun run dev
```

运行测试和构建：

```sh
bun test ./tests
bun run build
```

Android 项目使用 Capacitor。安装依赖并构建网页后，可执行 `bunx cap sync android`，再使用 Android Studio 打开 `android/`。发布签名需要自行安全配置；本仓库不包含签名文件或口令。

词汇数据的来源和授权信息见 `public/licenses/` 与 `public/data/vocabulary-source.json`。应用源码快照位于独立分支的 `app/` 目录，仓库根目录的隐私政策页面保持原样。
