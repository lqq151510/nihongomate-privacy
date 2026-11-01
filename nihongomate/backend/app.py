"""真实多人学习服务；默认本机运行，不包含演示账号或模拟消息。"""

from __future__ import annotations

from collections import defaultdict, deque
from contextlib import contextmanager
from datetime import datetime, timezone
import hashlib
import hmac
import os
from pathlib import Path
import secrets
import sqlite3
from threading import Lock
import time
from typing import Annotated, Literal
from uuid import uuid4

from fastapi import Depends, FastAPI, HTTPException, Query, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel, ConfigDict, Field, StringConstraints

Level = Literal["N5", "N4", "N3", "N2", "N1"]
PUBLIC_COLUMNS = "id, username, nickname, level, bio, discoverable"
PBKDF2_ITERATIONS = 600_000
SESSION_SECONDS = 7 * 24 * 60 * 60
DEFAULT_ORIGINS = [
    "http://localhost:5174", "http://127.0.0.1:5174",
    "http://localhost:4174", "http://127.0.0.1:4174", "https://localhost",
]


class Input(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)


class Register(Input):
    username: str = Field(min_length=3, max_length=24, pattern=r"^[a-zA-Z0-9_]+$")
    password: Annotated[str, StringConstraints(strip_whitespace=False, min_length=8, max_length=128)]
    nickname: str = Field(min_length=1, max_length=16)
    level: Level = "N5"



class Login(Input):
    username: str = Field(min_length=3, max_length=24, pattern=r"^[a-zA-Z0-9_]+$")
    password: Annotated[str, StringConstraints(strip_whitespace=False, min_length=8, max_length=128)]


class ProfileUpdate(Input):
    nickname: str | None = Field(default=None, min_length=1, max_length=16)
    level: Level | None = None
    bio: str | None = Field(default=None, max_length=120)
    discoverable: bool | None = None


class FriendInput(Input):
    user_id: str = Field(min_length=1, max_length=64)


class RespondInput(Input):
    accept: bool


class RoomInput(Input):
    title: str = Field(min_length=1, max_length=40)
    description: str = Field(default="", max_length=200)
    level: Level = "N5"
    capacity: int = Field(default=8, ge=2, le=50, strict=True)
    visibility: Literal["public", "private"] = "public"


class InviteInput(Input):
    invite_code: str = Field(min_length=6, max_length=64)


class MessageInput(Input):
    content: str = Field(min_length=1, max_length=1000)
    client_id: str = Field(min_length=8, max_length=100, pattern=r"^[a-zA-Z0-9_-]+$")


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def password_hash(password: str, salt: str | None = None) -> str:
    salt = salt or secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), bytes.fromhex(salt), PBKDF2_ITERATIONS)
    return f"{salt}${digest.hex()}"


def password_matches(password: str, stored: str) -> bool:
    return hmac.compare_digest(password_hash(password, stored.split("$", 1)[0]), stored)


def public_user(row: sqlite3.Row) -> dict:
    return {key: bool(row[key]) if key == "discoverable" else row[key] for key in PUBLIC_COLUMNS.split(", ")}


def token_hash(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


@contextmanager
def transaction(db: sqlite3.Connection):
    """串行化检查与写入，容量和好友关系不会因并发请求穿透。"""
    db.execute("BEGIN IMMEDIATE")
    try:
        yield
        db.commit()
    except BaseException:
        db.rollback()
        raise


class RateLimiter:
    """本机单进程限流；部署多进程时应换用共享限流器。"""

    def __init__(self, enabled: bool):
        self.enabled = enabled
        self.events: dict[str, deque[float]] = defaultdict(deque)
        self.lock = Lock()

    def check(self, key: str, limit: int, seconds: int = 60):
        if not self.enabled:
            return
        current = time.monotonic()
        with self.lock:
            if len(self.events) > 2000:
                self.events = defaultdict(deque, {
                    k: v for k, v in self.events.items() if v and current - v[-1] < 3600
                })
            history = self.events[key]
            while history and current - history[0] >= seconds:
                history.popleft()
            if len(history) >= limit:
                raise HTTPException(429, "操作太频繁，请稍后再试。", headers={"Retry-After": str(seconds)})
            history.append(current)


SCHEMA = """
CREATE TABLE IF NOT EXISTS users (
 id TEXT PRIMARY KEY, username TEXT COLLATE NOCASE NOT NULL UNIQUE,
 password_hash TEXT NOT NULL, nickname TEXT NOT NULL, level TEXT NOT NULL,
 bio TEXT NOT NULL DEFAULT '', discoverable INTEGER NOT NULL DEFAULT 0,
 created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS sessions (
 token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 expires_at REAL NOT NULL
);
CREATE INDEX IF NOT EXISTS sessions_expiry ON sessions(expires_at);
CREATE TABLE IF NOT EXISTS friend_requests (
 id TEXT PRIMARY KEY, sender_id TEXT NOT NULL REFERENCES users(id),
 recipient_id TEXT NOT NULL REFERENCES users(id), pair_low TEXT NOT NULL,
 pair_high TEXT NOT NULL, created_at TEXT NOT NULL,
 CHECK(sender_id != recipient_id), UNIQUE(pair_low, pair_high)
);
CREATE TABLE IF NOT EXISTS friendships (
 user_low TEXT NOT NULL REFERENCES users(id), user_high TEXT NOT NULL REFERENCES users(id),
 created_at TEXT NOT NULL, PRIMARY KEY(user_low, user_high), CHECK(user_low < user_high)
);
CREATE TABLE IF NOT EXISTS rooms (
 id TEXT PRIMARY KEY, title TEXT NOT NULL, description TEXT NOT NULL,
 level TEXT NOT NULL, capacity INTEGER NOT NULL CHECK(capacity BETWEEN 2 AND 50),
 owner_id TEXT NOT NULL REFERENCES users(id), visibility TEXT NOT NULL,
 invite_code TEXT NOT NULL UNIQUE, created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS room_members (
 room_id TEXT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
 user_id TEXT NOT NULL REFERENCES users(id), joined_at TEXT NOT NULL,
 PRIMARY KEY(room_id, user_id)
);
CREATE INDEX IF NOT EXISTS room_members_user ON room_members(user_id, room_id);
CREATE TABLE IF NOT EXISTS messages (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 room_id TEXT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
 user_id TEXT NOT NULL REFERENCES users(id), content TEXT NOT NULL,
 client_id TEXT NOT NULL, created_at TEXT NOT NULL,
 UNIQUE(room_id, user_id, client_id)
);
CREATE INDEX IF NOT EXISTS messages_room_id ON messages(room_id, id);
"""


def create_app(db_path: str | Path | None = None, *, rate_limit_enabled: bool = True) -> FastAPI:
    path = Path(db_path or os.environ.get("NIHONGOMATE_DB_PATH", Path(__file__).parent / "data" / "social.db"))
    path.parent.mkdir(parents=True, exist_ok=True)

    def connect() -> sqlite3.Connection:
        db = sqlite3.connect(path, timeout=10, isolation_level=None, check_same_thread=False)
        db.row_factory = sqlite3.Row
        db.execute("PRAGMA foreign_keys = ON")
        return db

    with connect() as setup:
        setup.execute("PRAGMA journal_mode = WAL")
        setup.executescript(SCHEMA)
    setup.close()
    app = FastAPI(title="随身日语伴侣 · 多人学习", version="0.1.0")
    app.state.db_path = path
    app.state.limiter = RateLimiter(rate_limit_enabled)
    origins = os.environ.get("NIHONGOMATE_CORS_ORIGINS")
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[value.strip() for value in origins.split(",") if value.strip()] if origins else DEFAULT_ORIGINS,
        allow_methods=["GET", "POST", "PATCH", "DELETE"],
        allow_headers=["Authorization", "Content-Type"],
    )
    bearer = HTTPBearer(auto_error=False)

    @app.exception_handler(RequestValidationError)
    async def validation_error(_: Request, exc: RequestValidationError):
        # 不返回 exc.errors() 的 input，避免把密码或消息正文回显到日志/界面。
        fields = ", ".join(str(error["loc"][-1]) for error in exc.errors())
        return JSONResponse(status_code=422, content={"detail": f"参数格式或长度不正确：{fields}。"})

    @app.exception_handler(sqlite3.OperationalError)
    async def database_error(_: Request, exc: sqlite3.OperationalError):
        return JSONResponse(status_code=503, content={"detail": "数据库暂时不可用，请稍后重试。"})

    def get_db():
        db = connect()
        try:
            yield db
        finally:
            db.close()

    def current_user(
        credentials: HTTPAuthorizationCredentials | None = Depends(bearer),
        db: sqlite3.Connection = Depends(get_db),
    ) -> dict:
        if credentials is None or len(credentials.credentials) > 256:
            raise HTTPException(401, "请先登录多人学习账号。")
        row = db.execute(
            "SELECT u.* FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires_at>?",
            (token_hash(credentials.credentials), time.time()),
        ).fetchone()
        if row is None:
            raise HTTPException(401, "登录已失效，请重新登录。")
        return public_user(row)

    def issue_session(db: sqlite3.Connection, user_id: str) -> dict:
        token = secrets.token_urlsafe(32)
        db.execute("DELETE FROM sessions WHERE expires_at <= ?", (time.time(),))
        db.execute("INSERT INTO sessions VALUES (?, ?, ?)", (token_hash(token), user_id, time.time() + SESSION_SECONDS))
        return {"token": token, "user": public_user(db.execute("SELECT * FROM users WHERE id=?", (user_id,)).fetchone())}

    def room_data(db: sqlite3.Connection, room: sqlite3.Row, user_id: str) -> dict:
        members = db.execute("SELECT user_id FROM room_members WHERE room_id=?", (room["id"],)).fetchall()
        is_member = any(row["user_id"] == user_id for row in members)
        data = {key: room[key] for key in ("id", "title", "description", "level", "capacity", "owner_id", "visibility")}
        data.update(member_count=len(members), is_member=is_member)
        if is_member:
            data["invite_code"] = room["invite_code"]
        return data

    def require_room(db: sqlite3.Connection, room_id: str) -> sqlite3.Row:
        row = db.execute("SELECT * FROM rooms WHERE id=?", (room_id,)).fetchone()
        if row is None:
            raise HTTPException(404, "自习室不存在或已解散。")
        return row

    def require_member(db: sqlite3.Connection, room_id: str, user_id: str) -> sqlite3.Row:
        room = require_room(db, room_id)
        if db.execute("SELECT 1 FROM room_members WHERE room_id=? AND user_id=?", (room_id, user_id)).fetchone() is None:
            raise HTTPException(403, "加入自习室后才能查看成员和参与讨论。")
        return room

    def join_room(db: sqlite3.Connection, room: sqlite3.Row, user_id: str) -> dict:
        existing = db.execute("SELECT 1 FROM room_members WHERE room_id=? AND user_id=?", (room["id"], user_id)).fetchone()
        if not existing:
            count = db.execute("SELECT COUNT(*) FROM room_members WHERE room_id=?", (room["id"],)).fetchone()[0]
            if count >= room["capacity"]:
                raise HTTPException(409, "自习室已满，请选择其他房间。")
            db.execute("INSERT INTO room_members VALUES (?, ?, ?)", (room["id"], user_id, now_iso()))
        return room_data(db, room, user_id)

    def message_data(db: sqlite3.Connection, row: sqlite3.Row) -> dict:
        data = {key: row[key] for key in ("id", "room_id", "user_id", "content", "created_at")}
        data["nickname"] = db.execute("SELECT nickname FROM users WHERE id=?", (row["user_id"],)).fetchone()[0]
        return data

    @app.get("/api/health")
    def health():
        return {"ok": True, "service": "nihongomate-social"}

    @app.post("/api/auth/register", status_code=201)
    def register(body: Register, request: Request, db: sqlite3.Connection = Depends(get_db)):
        app.state.limiter.check(f"register:{request.client.host}", 10, 3600)
        user_id = str(uuid4())
        hashed = password_hash(body.password)
        try:
            with transaction(db):
                db.execute(
                    "INSERT INTO users(id,username,password_hash,nickname,level,created_at) VALUES(?,?,?,?,?,?)",
                    (user_id, body.username.lower(), hashed, body.nickname, body.level, now_iso()),
                )
                return issue_session(db, user_id)
        except sqlite3.IntegrityError:
            raise HTTPException(409, "这个用户名已被使用，请换一个。") from None

    @app.post("/api/auth/login")
    def login(body: Login, request: Request, db: sqlite3.Connection = Depends(get_db)):
        app.state.limiter.check(f"login:{request.client.host}", 30)
        row = db.execute("SELECT * FROM users WHERE username=?", (body.username.lower(),)).fetchone()
        # 无此用户也执行一次同成本哈希，降低用户名枚举的时间差。
        valid = password_matches(body.password, row["password_hash"] if row else "0" * 32 + "$" + "0" * 64)
        if not row or not valid:
            raise HTTPException(401, "用户名或密码不正确。")
        with transaction(db):
            return issue_session(db, row["id"])

    @app.post("/api/auth/logout")
    def logout(
        user: dict = Depends(current_user), credentials: HTTPAuthorizationCredentials = Depends(bearer),
        db: sqlite3.Connection = Depends(get_db),
    ):
        db.execute("DELETE FROM sessions WHERE token_hash=?", (token_hash(credentials.credentials),))
        return {"ok": True}

    @app.get("/api/me")
    def me(user: dict = Depends(current_user)):
        return user

    @app.patch("/api/me")
    def update_me(body: ProfileUpdate, user: dict = Depends(current_user), db: sqlite3.Connection = Depends(get_db)):
        updates = body.model_dump(exclude_unset=True, exclude_none=True)
        if updates:
            db.execute(
                f"UPDATE users SET {', '.join(key + '=?' for key in updates)} WHERE id=?",
                (*updates.values(), user["id"]),
            )
        return public_user(db.execute("SELECT * FROM users WHERE id=?", (user["id"],)).fetchone())

    @app.get("/api/users")
    def users(
        q: str = Query(default="", max_length=60), level: Level | None = None,
        user: dict = Depends(current_user), db: sqlite3.Connection = Depends(get_db),
    ):
        query = q.strip().lower()
        # 不可发现账号只有精确用户名可查；昵称模糊检索仅匹配主动公开的账号。
        rows = db.execute(
            "SELECT * FROM users WHERE id!=? AND (discoverable=1 OR (?!='' AND username=?)) "
            "AND (?='' OR username=? OR (discoverable=1 AND (instr(lower(username),?)>0 OR instr(lower(nickname),?)>0))) "
            "AND (? IS NULL OR level=?) ORDER BY username LIMIT 50",
            (user["id"], query, query, query, query, query, query, level, level),
        ).fetchall()
        return [public_user(row) for row in rows]

    @app.get("/api/friends")
    def friends(user: dict = Depends(current_user), db: sqlite3.Connection = Depends(get_db)):
        rows = db.execute(
            "SELECT u.* FROM friendships f JOIN users u ON u.id=CASE WHEN f.user_low=? THEN f.user_high ELSE f.user_low END "
            "WHERE f.user_low=? OR f.user_high=? ORDER BY u.nickname", (user["id"], user["id"], user["id"]),
        ).fetchall()
        result = {"friends": [public_user(row) for row in rows], "incoming": [], "outgoing": []}
        requests = db.execute("SELECT * FROM friend_requests WHERE sender_id=? OR recipient_id=? ORDER BY created_at", (user["id"], user["id"])).fetchall()
        for row in requests:
            incoming = row["recipient_id"] == user["id"]
            other_id = row["sender_id"] if incoming else row["recipient_id"]
            other = db.execute("SELECT * FROM users WHERE id=?", (other_id,)).fetchone()
            result["incoming" if incoming else "outgoing"].append({"id": row["id"], "user": public_user(other), "created_at": row["created_at"]})
        return result

    @app.post("/api/friends/requests")
    def request_friend(body: FriendInput, user: dict = Depends(current_user), db: sqlite3.Connection = Depends(get_db)):
        app.state.limiter.check(f"friend:{user['id']}", 20)
        if body.user_id == user["id"]:
            raise HTTPException(400, "不能添加自己为好友。")
        pair = sorted([user["id"], body.user_id])
        with transaction(db):
            if not db.execute("SELECT 1 FROM users WHERE id=?", (body.user_id,)).fetchone():
                raise HTTPException(404, "用户不存在。")
            if db.execute("SELECT 1 FROM friendships WHERE user_low=? AND user_high=?", pair).fetchone():
                raise HTTPException(409, "你们已经是好友。")
            if db.execute("SELECT 1 FROM friend_requests WHERE pair_low=? AND pair_high=?", pair).fetchone():
                raise HTTPException(409, "已有待处理的好友申请，请在申请列表中处理。")
            db.execute("INSERT INTO friend_requests VALUES(?,?,?,?,?,?)", (str(uuid4()), user["id"], body.user_id, *pair, now_iso()))
        return {"ok": True}

    @app.post("/api/friends/requests/{request_id}/respond")
    def respond_friend(request_id: str, body: RespondInput, user: dict = Depends(current_user), db: sqlite3.Connection = Depends(get_db)):
        with transaction(db):
            row = db.execute("SELECT * FROM friend_requests WHERE id=? AND recipient_id=?", (request_id, user["id"])).fetchone()
            if row is None:
                raise HTTPException(404, "待处理申请不存在。")
            if body.accept:
                db.execute("INSERT OR IGNORE INTO friendships VALUES(?,?,?)", (row["pair_low"], row["pair_high"], now_iso()))
            db.execute("DELETE FROM friend_requests WHERE id=?", (request_id,))
        return {"ok": True}

    @app.delete("/api/friends/{user_id}")
    def remove_friend(user_id: str, user: dict = Depends(current_user), db: sqlite3.Connection = Depends(get_db)):
        db.execute("DELETE FROM friendships WHERE user_low=? AND user_high=?", sorted([user["id"], user_id]))
        return {"ok": True}

    @app.get("/api/rooms")
    def rooms(user: dict = Depends(current_user), db: sqlite3.Connection = Depends(get_db)):
        rows = db.execute(
            "SELECT r.* FROM rooms r WHERE visibility='public' OR EXISTS(SELECT 1 FROM room_members m WHERE m.room_id=r.id AND m.user_id=?) "
            "ORDER BY created_at DESC LIMIT 100", (user["id"],),
        ).fetchall()
        return [room_data(db, row, user["id"]) for row in rows]

    @app.post("/api/rooms", status_code=201)
    def create_room(body: RoomInput, user: dict = Depends(current_user), db: sqlite3.Connection = Depends(get_db)):
        app.state.limiter.check(f"create-room:{user['id']}", 10)
        room_id = str(uuid4())
        with transaction(db):
            db.execute("INSERT INTO rooms VALUES(?,?,?,?,?,?,?,?,?)", (
                room_id, body.title, body.description, body.level, body.capacity,
                user["id"], body.visibility, secrets.token_urlsafe(12), now_iso(),
            ))
            db.execute("INSERT INTO room_members VALUES(?,?,?)", (room_id, user["id"], now_iso()))
            return room_data(db, require_room(db, room_id), user["id"])

    @app.post("/api/rooms/join")
    def join_invite(body: InviteInput, user: dict = Depends(current_user), db: sqlite3.Connection = Depends(get_db)):
        app.state.limiter.check(f"join:{user['id']}", 30)
        with transaction(db):
            room = db.execute("SELECT * FROM rooms WHERE invite_code=?", (body.invite_code,)).fetchone()
            if room is None:
                raise HTTPException(404, "邀请码无效或自习室已解散。")
            return join_room(db, room, user["id"])

    @app.post("/api/rooms/{room_id}/join")
    def join_public(room_id: str, user: dict = Depends(current_user), db: sqlite3.Connection = Depends(get_db)):
        app.state.limiter.check(f"join:{user['id']}", 30)
        with transaction(db):
            room = require_room(db, room_id)
            if room["visibility"] != "public":
                raise HTTPException(403, "私密自习室需要邀请码。")
            return join_room(db, room, user["id"])

    @app.post("/api/rooms/{room_id}/leave")
    def leave_room(room_id: str, user: dict = Depends(current_user), db: sqlite3.Connection = Depends(get_db)):
        with transaction(db):
            room = require_member(db, room_id, user["id"])
            db.execute("DELETE FROM room_members WHERE room_id=? AND user_id=?", (room_id, user["id"]))
            if room["owner_id"] == user["id"]:
                successor = db.execute("SELECT user_id FROM room_members WHERE room_id=? ORDER BY joined_at,user_id LIMIT 1", (room_id,)).fetchone()
                if successor:
                    db.execute("UPDATE rooms SET owner_id=? WHERE id=?", (successor["user_id"], room_id))
                else:
                    db.execute("DELETE FROM rooms WHERE id=?", (room_id,))
        return {"ok": True}

    @app.get("/api/rooms/{room_id}")
    def room_detail(room_id: str, user: dict = Depends(current_user), db: sqlite3.Connection = Depends(get_db)):
        room = require_member(db, room_id, user["id"])
        members = db.execute("SELECT u.* FROM room_members m JOIN users u ON u.id=m.user_id WHERE m.room_id=? ORDER BY m.joined_at,u.id", (room_id,)).fetchall()
        return {"room": room_data(db, room, user["id"]), "members": [public_user(row) for row in members]}

    @app.get("/api/rooms/{room_id}/messages")
    def messages(room_id: str, after: int = Query(default=0, ge=0), user: dict = Depends(current_user), db: sqlite3.Connection = Depends(get_db)):
        require_member(db, room_id, user["id"])
        if after == 0:
            rows = list(reversed(db.execute("SELECT * FROM messages WHERE room_id=? ORDER BY id DESC LIMIT 100", (room_id,)).fetchall()))
        else:
            rows = db.execute("SELECT * FROM messages WHERE room_id=? AND id>? ORDER BY id LIMIT 100", (room_id, after)).fetchall()
        return [message_data(db, row) for row in rows]

    @app.post("/api/rooms/{room_id}/messages")
    def send_message(room_id: str, body: MessageInput, user: dict = Depends(current_user), db: sqlite3.Connection = Depends(get_db)):
        with transaction(db):
            require_member(db, room_id, user["id"])
            previous = db.execute("SELECT * FROM messages WHERE room_id=? AND user_id=? AND client_id=?", (room_id, user["id"], body.client_id)).fetchone()
            if previous:
                if previous["content"] != body.content:
                    raise HTTPException(409, "消息标识已使用，请刷新后重试。")
                return message_data(db, previous)
            app.state.limiter.check(f"message:{user['id']}", 30)
            cursor = db.execute("INSERT INTO messages(room_id,user_id,content,client_id,created_at) VALUES(?,?,?,?,?)", (room_id, user["id"], body.content, body.client_id, now_iso()))
            row = db.execute("SELECT * FROM messages WHERE id=?", (cursor.lastrowid,)).fetchone()
            return message_data(db, row)

    return app
