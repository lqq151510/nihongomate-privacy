# Azure 联网日语语音服务

这是随身日语伴侣的独立可选语音代理，不依赖或修改社交后端。Azure Key 只由服务端读取；APK 使用代理地址和独立访问口令。

## 本机配置入口

macOS 可直接双击本目录的 **`configure.command`**：它会创建独立 Python 环境、安装所需依赖，然后打开隐藏输入的终端配置。不会自动启动服务、开放网络或创建 Azure 账号。

也可以在终端运行：

```sh
cd /Users/liuyongze/Desktop/日语/nihongomate/voice-service
python3 -m venv .venv
.venv/bin/python -m pip install -r requirements.txt
.venv/bin/python configure.py
./run.sh
```

配置程序通过终端隐藏输入读取 Azure Speech Key 和自设访问口令，不从命令行参数接收密钥。没有 Azure 服务时可以将区域和 Key 留空，先设置至少 16 位无空格 ASCII 访问口令；服务会返回待配置状态，不会产生 Azure 调用。

服务沿用运行环境中的 HTTP/HTTPS/SOCKS 代理设置。依赖使用 `httpx[socks]`，包含 SOCKS 代理需要的 `socksio`；请在独立环境安装本目录 requirements，不要通过关闭环境代理读取或修改系统代理来绕过缺少依赖的问题。

配置保存在 `~/.local/share/nihongomate/voice-service/config.json`（目录 700，文件 600），不会写入源码或安装包。再次配置会替换旧值，需要重新输入要保留的值。也可由部署环境提供 `AZURE_SPEECH_KEY`、`AZURE_SPEECH_REGION`、`NIHONGOMATE_VOICE_TOKEN`，以及可选的 `NIHONGOMATE_VOICE_DAILY_LIMIT`、`NIHONGOMATE_VOICE_ORIGINS`。环境变量优先于文件。测试或隔离部署可用 `NIHONGOMATE_VOICE_CONFIG` 指定独立配置文件；日预算数据库位于该文件同一目录。不要把真实 Key、访问口令放进工单、截图、聊天或 Git。

`run.sh` 默认只监听 `127.0.0.1:4210`，仅用于本机开发，不会使手机在外出时可访问。手机实际使用需要另行部署自己可访问的 HTTPS 代理地址，保留鉴权并配置明确的 CORS 来源；本任务没有开放公网、创建云账号或部署云服务。默认运行单 worker，共享 SQLite 字符预算。

## 接口

- `GET /health`：公开返回 `{ "provider": "azure", "configured": false }` 等服务状态，不包含密钥。
- `GET /v1/voices`：使用 `Authorization: Bearer <代理访问口令>`。未配置 Azure 时返回 `configured:false`、空 `voices` 和七项未验证 `catalog`。配置后由当前 Azure 区域实际列表确认可用音色。
- `POST /v1/speech`：同样鉴权；JSON 字段 `text`（1–4000 字符）、`voiceId`、`rate`（0.5–1.5）、`pitch`（0.8/0.9/1/1.1/1.2）；返回 `audio/mpeg`。只接受本区域实际确认可用的七种常规 `ja-JP` Neural 声音。
- 错误统一为 `{ "detail": { "code": "...", "message": "..." } }`，不会返回 Azure 原始错误正文或请求内容。

候选为 Nanami、Keita、Aoi、Daichi、Mayu、Naoki、Shiori。它们是官方目录，不能在无密钥时宣称已经可播。音高使用 SSML 百分比，与系统引擎的听感可能有差异。

## 费用和请求边界

默认每日最多请求 5000 个字符，按上海日期记录 SQLite 计数；预算包含已发送但失败或超时的请求，采用保守计数。停止前端播放不能保证 Azure 已接收的请求不产生费用。合成 POST 不自动重试；列表 GET 最多重试一次。最多两个并发合成，超过排队时间返回忙碌。

内存缓存最多 32 项/8 MiB/1 小时，以文本、声音、速度和音高的 SHA-256 为键，不保存原文；缓存命中不发起合成、不再次扣预算。缓存不写磁盘，重启会清空，SQLite 日预算保留。HTTP 访问日志默认关闭，应用也不打印密钥、口令或朗读文本。

## 验证

```sh
.venv/bin/python -m pip install -r requirements-dev.txt
.venv/bin/python -m pytest -q tests
```

测试使用 HTTPX MockTransport 模拟 Azure，不需要真实密钥，不产生付费调用。真实区域音色枚举和实际听音须配置 Azure 后单独验证。

官方参考：[日语音色与语言列表](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/language-support?tabs=tts)、[REST 接口](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/rest-text-to-speech)、[费用](https://azure.microsoft.com/en-us/pricing/details/speech/)。
