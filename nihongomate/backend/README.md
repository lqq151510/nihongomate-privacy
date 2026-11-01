# 多人学习后端

2026-11-01 已部署到腾讯云，手机服务地址为 `https://api.quanquan.cloud`；公网可信 TLS、Android CORS、目标机重启持久化及 vivo 业务验证已通过。服务以独立非 root 账号运行，数据位于 `/var/lib/nihongomate-social/social.db`。本轮合成 QA 数据已定向清理，未重置数据库。下文保留本机开发启动方法；服务器部署与回退见 `deploy/README.md`。

提供真实账号、学习搭子发现、双方确认的好友关系、自习室和文字讨论。没有预置用户或模拟消息。
原有课程、学习进度和本机个人资料仍留在前端设备，不上传到此服务。

## 启动

安装 [uv](https://docs.astral.sh/uv/) 后，在此目录执行：

```sh
uv sync --frozen
uv run --frozen uvicorn app:create_app --factory --host 127.0.0.1 --port 8001
```

前端 `bun run dev` 默认端口 5174，在“搭子”页显式同意联网后设置服务地址
`http://127.0.0.1:8001`。使用两个浏览器独立会话注册两个账号即可验证。
健康检查为 `http://127.0.0.1:8001/api/health`，接口文档为 `http://127.0.0.1:8001/docs`。

数据库默认存放在 `backend/data/social.db`，首次启动自动创建，重新启动保留数据。
可通过环境变量 `NIHONGOMATE_DB_PATH` 指定其他路径。
`.venv`、数据库和缓存由本目录的 `.gitignore` 排除，不进入源码提交。

## 隐私、权限与行为

- 注册信息：用户名 3–24 个英文字母、数字或下划线；密码 8–128 字符；昵称 1–16 字符；学习等级 N5–N1。
- 密码使用随机盐 + PBKDF2-HMAC-SHA256（600,000 次）保存，服务不保存明文密码。
- 随机访问令牌仅以 SHA256 摘要保存到数据库，7 天有效；退出登录撤销当前令牌。
- 新账号默认不出现在搭子发现列表；主动开启 `discoverable` 后才进入昵称/用户名模糊查找和列表。
  **即使未开启发现，其他已登录用户仍能通过完整、精确的用户名找到账号。**
  公开资料包括用户名、昵称、学习等级、简介和是否开启发现，不包含密码/令牌。
- 好友申请只能由接收人同意或拒绝；重复和交叉申请不会自动建立好友关系。
- 自习室可公开或私密。私密房间仅成员可列出，通过邀请码加入；邀请码仅成员可读取。
  公开房间可直接加入。每间 2–50 人，创建者自动加入，重复加入不增加人数。
- 只有成员能读取房间资料、成员名单、历史消息和发言；后来加入的成员可见最近 100 条历史消息。
  增量读取用 `after` 消息 ID，每页最多 100 条，按 ID 升序返回。
- 发言最多 1000 字符，空白拒绝。客户端提交 `client_id`，同一用户在同一房间重试相同消息不会重复发送。
- 房主退出后，所有权转给最早加入的剩余成员；最后一个成员退出时房间和消息一起删除。
- 好友关系不授予私密房间访问权限，邀请好友时共享邀请码。
- 所有数据保存在运行此服务的电脑；此版本没有账号删除、密码找回、内容审核、举报或备份恢复界面。
  在正式公开服务前补齐这些运营功能，并确认隐私披露与数据保留策略。

## 配置与运行范围

默认只监听本机回环地址，不自动对局域网或互联网开放。
默认 CORS 允许 `localhost`/`127.0.0.1` 的 5174、4174 前端，以及 Capacitor 的 `https://localhost`。
部署时可用逗号分隔的 `NIHONGOMATE_CORS_ORIGINS` 覆盖明确的前端来源，不使用通配符。
CORS 只约束浏览器来源，不替代接口认证。

本机单进程具备基本限流：每来源 IP 注册 10 次/小时、登录 30 次/分钟；每账号发送 30 条消息/分钟、
好友申请 20 次/分钟、创建房间 10 次/分钟、加入房间 30 次/分钟。429 返回 `Retry-After`。
限流计数只在进程内，重启会清空；多进程或正式公开部署需改用共享限流器和反向代理。
不要直接信任客户端转发的 IP 头。

SQLite 开启外键、WAL（预写日志）和忙等待；关键“检查后写入”使用 `BEGIN IMMEDIATE` 事务，
避免并发加入超容量以及好友关系竞争。数据库操作和密码哈希在 FastAPI 同步端点的工作线程运行。

本地 HTTP 仅用于同机开发。Android 应用使用 HTTPS 来源，跨手机使用需要后续部署的 HTTPS 服务；
不要为了测试而全局关闭 Android 明文或混合内容保护。本次不修改原生网络配置，不包含发布部署。

## 服务器部署准备

本地已准备 [systemd/Nginx 模板与备份、升级回退步骤](deploy/README.md)。
本轮已完成上述服务器部署；后续部署到其他环境前，仍需重新核对服务器、端口、已有站点和证书，不能直接套用本轮运行状态。

## 验证

```sh
uv run --frozen pytest -q
```

测试使用独立临时 SQLite，覆盖账号注册登录退出、令牌失效、发现开关、好友权限与交叉申请、
公开/私密房间、并发容量、成员权限、双账号讨论、消息幂等与分页、离房转移、限流、CORS 和重启持久化。
测试不会清空默认数据库。

## API 契约

所有社交接口均使用 `Authorization: Bearer TOKEN`，注册、登录、健康检查除外。
`HTTPException` 错误返回 `{ "detail": "中文提示" }`；参数验证也不回显密码或正文。

| 方法 | 路径 | 请求/返回 |
| --- | --- | --- |
| POST | `/api/auth/register` | `{username,password,nickname,level}` → `{token,user}` |
| POST | `/api/auth/login` | `{username,password}` → `{token,user}` |
| POST | `/api/auth/logout` | 撤销当前令牌 → `{ok:true}` |
| GET/PATCH | `/api/me` | 读取/更新 `{nickname,level,bio,discoverable}` |
| GET | `/api/users?q=&level=` | 搭子列表，最多 50 人 |
| GET | `/api/friends` | `{friends,incoming,outgoing}`，申请中附对方 `user` |
| POST | `/api/friends/requests` | `{user_id}` → `{ok:true}` |
| POST | `/api/friends/requests/{id}/respond` | `{accept:boolean}` → `{ok:true}` |
| DELETE | `/api/friends/{user_id}` | 删除双方好友关系 |
| GET/POST | `/api/rooms` | 列表/创建 `{title,description,level,capacity,visibility}` |
| POST | `/api/rooms/join` | `{invite_code}` → 房间 |
| POST | `/api/rooms/{id}/join` | 加入公开房间 → 房间 |
| POST | `/api/rooms/{id}/leave` | 退出/转交/解散 → `{ok:true}` |
| GET | `/api/rooms/{id}` | `{room,members}` |
| GET | `/api/rooms/{id}/messages?after=0` | 消息数组 |
| POST | `/api/rooms/{id}/messages` | `{content,client_id}` → 消息 |

