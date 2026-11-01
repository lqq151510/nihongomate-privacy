# 随身日语伴侣源码

这是基于 Vue 3、TypeScript、Vite 和 Capacitor 的日语学习应用，包含五十音、N5–N1 分级课程、词卡、语法、听力和模拟练习。学习记录与本地资料保存在当前设备；“搭子”及联网语音属于需要单独配置、单独同意联网的可选功能。

## 目录

- `src/`：前端页面、课程数据与本地学习逻辑。
- `tests/`：Bun 前端逻辑与内容测试。
- `android/`：Android 原生工程及设备语音插件。
- `backend/`：可选的学习搭子、好友、自习室和文字讨论服务。
- `voice-service/`：可选的 Azure 日语语音代理。
- `public/licenses/`、`docs/`：第三方来源、许可与阶段性验收记录。

## 前端开发与验证

安装 Bun 后，在本目录执行：

```sh
bun install --frozen-lockfile
bun run dev --host 127.0.0.1 --port 5174 --strictPort
```

浏览器访问 `http://127.0.0.1:5174/`。检查与生产构建：

```sh
bun test ./tests
bun run build
bun run preview --host 127.0.0.1 --port 4174 --strictPort
```

`build` 同时执行 Vue / TypeScript 类型检查和 Vite 打包，输出到 `dist/`。本仓库不提交依赖目录、构建产物或实际 `.env` 文件；如需设置社交服务默认地址，可在本机环境中配置 `VITE_SOCIAL_API_URL`。浏览器开发与 Android 手机访问服务的地址不同，请参阅 [本地构建与联调说明](docs/LOCAL_RELEASE.md)。

## 可选 Python 服务

社交后端需要 Python 3.12–3.14 和 uv。在 `backend/` 执行：

```sh
uv sync --frozen
uv run --frozen pytest -q
uv run --frozen uvicorn app:create_app --factory --host 127.0.0.1 --port 8001
```

接口、权限、数据库与部署准备见 [backend/README.md](backend/README.md)。运行时数据库由服务创建，不包含在源码中。默认仅监听本机，不会自动部署到互联网。

联网语音代理使用独立 Python 环境，安装 `voice-service/requirements.txt`；测试另安装 `requirements-dev.txt`，运行 `python -m pytest -q tests`。配置入口、鉴权、预算和使用范围见 [voice-service/README.md](voice-service/README.md)。真实 Azure Key 和代理访问口令只放在本机受保护配置或部署环境，不能写入源码。测试使用模拟传输，不需要真实 Key，也不能据此宣称实际音色已可播放。

## Android 构建

准备 JDK 21、Android SDK 及本机 SDK 路径后，从应用根目录执行：

```sh
bun run build
./node_modules/.bin/cap sync android
cd android
./gradlew assembleDebug
```

发布构建使用 `./gradlew assembleRelease`，需要密钥持有人在仓库之外配置签名。默认配置位置为 `~/.local/share/nihongomate/signing/keystore.properties`，也可通过 `NIHONGOMATE_SIGNING_PROPERTIES` 指定；实际密钥、密码、`local.properties` 和安装包均不提交。详细步骤见 [docs/LOCAL_RELEASE.md](docs/LOCAL_RELEASE.md)。首次构建可能需要下载官方依赖，已有完整缓存时才能使用 `--offline`。

## 验证与许可边界

`docs/` 中的验收记录属于各日期、各阶段的历史证据。源码快照、自动化测试或构建成功不代表当前 vivo 真机的外放、重复播放、后台恢复和联网服务已经验收通过；设备声音问题须按实际安装包及用户听感单独验证。本次源码导入没有执行设备安装或远端服务部署。

第三方词库的来源及许可保留在 [public/licenses/](public/licenses/)，并有对应来源文档。本次没有为整个项目新增开源许可证；使用或再分发时应分别核对项目授权与第三方条款。
