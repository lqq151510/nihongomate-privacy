# 腾讯云服务器部署准备（尚未连接或部署）

这些是本地模板。先只读确认服务器系统、SSH 登录方式、现有站点/端口、域名 DNS 和证书，
再按实际环境调整。无需把密码、私钥或令牌发到聊天；使用用户已有的 SSH 配置或本机密钥。
**不能直接覆盖现有 nginx.conf、站点、systemd 服务或数据库。**

## 目录与启动

建议代码按版本放入 `/opt/nihongomate-social/releases/版本/backend/`，
`/opt/nihongomate-social/current` 链接到当前版本目录；数据始终留在
`/var/lib/nihongomate-social/social.db`。旧版本目录保留用于回退。
只传源码与 `uv.lock`；不要传 Mac `.venv`、测试数据库、聊天数据或 Android 签名文件。

服务器需 Python 3.12–3.14、uv、systemd、Nginx 及可验证的 HTTPS 证书。
在新版本的 `backend/` 目录用部署账号执行：

```sh
# 必须先核对实际系统 Python 路径；此处是示例，不是安装命令。
uv sync --frozen --no-dev --python /usr/bin/python3.12
```

`.venv/bin/python` 的最终解释器必须位于服务账号可读的系统路径或 `/opt` 下，
不能链接到 `/root/.local/share/uv/python` 或其他 home 目录，否则 `ProtectHome=true` 会阻止启动。
虚拟环境应在最终版本目录创建，不在服务器间复制或移动。

`nihongomate-social.service` 使用独立的非 root 系统账号。先核对账号是否已存在，
再由管理员创建/分配专用账号；代码目录由部署管理员管理，服务账号只需读取/执行。
`StateDirectory` 自动建立权限 0700 的持久目录；`UMask=0077` 保护数据库及 WAL/SHM。
模板仅监听 `127.0.0.1:8001`、单 worker；无需向腾讯云安全组开放 8001。
用目标服务器的 `systemd-analyze verify 模板路径` 验证兼容性后，
再安装**新服务名**、`daemon-reload` 并启动；这些操作目前均未执行。

## HTTPS 与反向代理

`nginx-social.conf.example` 使用保留域名 `social.example.invalid` 和无效证书路径，
必须替换成实际专用域名和已有可信证书。先确认 Nginx/面板现有配置由谁管理，
选择一个新的站点文件，不覆盖默认站点；80/443 的安全组或防火墙变更另行按实际需要处理。
如服务器前面还有 CDN/负载均衡，先确认真实来源 IP 的可信代理链，再调整限流识别。

添加独立站点后执行 `nginx -t`，成功才 reload；失败则保留原运行配置并撤回这份新站点。
无需改 Android 明文/混合内容策略。服务端接收 HTTP 回环请求，对外由 Nginx 提供 HTTPS。
Nginx 保留 `/api/` 前缀并覆盖转发 IP，Uvicorn 仅信任 `127.0.0.1` 的代理头，不能改为信任 `*`。

服务模板明确设置 `NIHONGOMATE_CORS_ORIGINS=https://localhost`，对应打包 Android 的来源。
若另部署网页版，追加其**完整 HTTPS 来源**（协议、域名、必要端口），不加路径、不使用通配符；
仅修改 service 后需 `daemon-reload` 和 restart。Nginx 不再设置第二套 CORS 头。

启动后先在服务器核验回环健康检查，再从外网核验 HTTPS 和 Android CORS：

```sh
curl --fail --show-error http://127.0.0.1:8001/api/health
curl --fail --show-error https://social.example.invalid/api/health
curl --fail --show-error -i -X OPTIONS https://social.example.invalid/api/me \
  -H 'Origin: https://localhost' \
  -H 'Access-Control-Request-Method: GET' \
  -H 'Access-Control-Request-Headers: authorization'
```

健康结果应为 `{"ok":true,"service":"nihongomate-social"}`；预检应准确返回
`Access-Control-Allow-Origin: https://localhost`，未登录 GET `/api/me` 应为 401。
再用两个测试账号在手机/另一独立会话验好友申请、私密邀请码、发言、退出和重连。
健康检查只证明路由可达，不能替代数据库写入及完整双账号流程。
查看启动失败用 `journalctl -u nihongomate-social --since '10 minutes ago'`，
不要在命令或工单中打印密码、Authorization 头、聊天正文；当前模板关闭访问日志。

## 在线备份与升级回退

备份包含用户资料、密码/令牌摘要及讨论正文，需限制读取权限并按实际保留策略管理。
以服务账号在服务器执行下面的脚本；脚本用 Python 标准库 SQLite 在线 backup API，
即使服务运行且 WAL 有新提交，也生成一致的独立数据库，目标权限 0600，并输出 hash/完整性结果：

```sh
sudo -u nihongomate-social /opt/nihongomate-social/current/backend/.venv/bin/python \
  /opt/nihongomate-social/current/backend/deploy/backup_sqlite.py \
  /var/lib/nihongomate-social/social.db \
  /var/lib/nihongomate-social/backups/social-YYYYMMDD-HHMMSS.db
```

替换时间戳，避免重名；脚本拒绝覆盖已有备份，失败保留 `.incomplete` 文件。
不要用普通 `cp social.db` 备份运行中的 WAL 数据库。备份成功后才升级，保留备份 hash 和旧版本路径。

升级顺序：准备新版本与独立虚拟环境 → 测试/记录旧版本 → 在线备份 → 停服务 →
将 `current` 改向新版本 → 启动 → 回环/外网健康和双账号验收。
不覆盖 `/var/lib/nihongomate-social`，也不把开发数据库上传替换线上数据。

普通代码回退：停服务 → `current` 改回记录的旧版本 → 启动并验收，**保留现有数据库**。
当前服务没有自动数据库迁移；以后若引入迁移，应单独记录前后 schema 及兼容性。

只有明确确认数据损坏或版本确实不兼容时才恢复数据库；恢复会丢失备份后的变动，需单独确认范围。
恢复前停服务，确认进程退出，把当前 `social.db`、`social.db-wal`、`social.db-shm`（若存在）
一起移动到新建的故障留存目录。再把已验证备份以权限 0600、服务账号所有权放回 `social.db`，
不要让旧 WAL/SHM 与恢复库混用；选择匹配代码版本，启动并重复验收。故障留存和旧备份不删除。

模板未在目标 Linux 上加载：systemd/Nginx 语法、服务用户、端口占用、证书续期、备份介质和
真实手机网络都需服务器可访问后验证。账号找回/删除、审核举报等正式公开运营能力仍见上层 README 的限制。

参考：[systemd 执行与 StateDirectory](https://www.freedesktop.org/software/systemd/man/latest/systemd.exec.html)、
[Nginx 反向代理](https://nginx.org/en/docs/http/ngx_http_proxy_module.html)、
[Python SQLite backup](https://docs.python.org/3/library/sqlite3.html#sqlite3.Connection.backup)。
