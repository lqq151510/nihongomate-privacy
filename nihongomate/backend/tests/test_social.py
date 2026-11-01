from concurrent.futures import ThreadPoolExecutor
import sqlite3
import time

from fastapi.testclient import TestClient
import pytest

from app import create_app, token_hash


@pytest.fixture
def service(tmp_path):
    app = create_app(tmp_path / "test.db", rate_limit_enabled=False)
    with TestClient(app) as client:
        yield client


def register(client, username="alice", **updates):
    body = {"username": username, "password": "test-password-123", "nickname": username, "level": "N5", **updates}
    response = client.post("/api/auth/register", json=body)
    assert response.status_code == 201, response.text
    result = response.json()
    return result["user"], {"Authorization": f"Bearer {result['token']}"}


@pytest.fixture
def people(service):
    return [register(service, name) for name in ("alice", "bob", "carol")]


def room(client, headers, **updates):
    response = client.post("/api/rooms", headers=headers, json={"title": "N5 一起学习", "description": "每天一句", "level": "N5", "capacity": 8, "visibility": "public", **updates})
    assert response.status_code == 201, response.text
    return response.json()


def friend_request(client, sender, recipient):
    response = client.post("/api/friends/requests", headers=sender, json={"user_id": recipient})
    assert response.status_code == 200, response.text


def test_register_login_logout_and_password_storage(service):
    user, headers = register(service)
    assert user["discoverable"] is False
    assert service.get("/api/me", headers=headers).json() == user
    assert service.post("/api/auth/login", json={"username": "ALICE", "password": "test-password-123"}).status_code == 200
    assert service.post("/api/auth/login", json={"username": "alice", "password": "incorrect-password"}).status_code == 401
    with sqlite3.connect(service.app.state.db_path) as db:
        hashed = db.execute("SELECT password_hash FROM users").fetchone()[0]
        assert hashed != "test-password-123" and "$" in hashed
        assert db.execute("SELECT token_hash FROM sessions WHERE token_hash=?", (token_hash(headers["Authorization"][7:]),)).fetchone()
    assert service.post("/api/auth/logout", headers=headers).json() == {"ok": True}
    assert service.get("/api/me", headers=headers).status_code == 401


def test_password_spaces_are_preserved(service):
    register(service, password="  long-password  ")
    assert service.post("/api/auth/login", json={"username": "alice", "password": "long-password"}).status_code == 401
    assert service.post("/api/auth/login", json={"username": "alice", "password": "  long-password  "}).status_code == 200


def test_duplicate_username_is_case_insensitive(service):
    register(service)
    response = service.post("/api/auth/register", json={"username": "ALICE", "password": "long-password", "nickname": "甲", "level": "N5"})
    assert response.status_code == 409


def test_session_expires(service):
    _, headers = register(service)
    with sqlite3.connect(service.app.state.db_path) as db:
        db.execute("UPDATE sessions SET expires_at=?", (time.time() - 1,))
    assert service.get("/api/me", headers=headers).status_code == 401


@pytest.mark.parametrize("path", ["/api/me", "/api/users", "/api/friends", "/api/rooms"])
def test_protected_routes_require_login(service, path):
    assert service.get(path).status_code == 401


def test_discovery_opt_in_exact_username_and_level(service, people):
    (alice, ah), (bob, bh), (carol, _) = people
    assert service.get("/api/users", headers=ah).json() == []
    assert service.get("/api/users?q=bo", headers=ah).json() == []
    assert service.get("/api/users?q=BOB", headers=ah).json() == [bob]
    result = service.patch("/api/me", headers=bh, json={"discoverable": True, "level": "N3", "bio": "一起练听力"}).json()
    assert result["bio"] == "一起练听力"
    assert service.get("/api/users?q=bo&level=N3", headers=ah).json() == [result]
    assert service.get("/api/users?level=N5", headers=ah).json() == []
    assert service.get("/api/users?q=alice", headers=ah).json() == []


def test_friend_request_requires_recipient_acceptance(service, people):
    (alice, ah), (bob, bh), (carol, ch) = people
    friend_request(service, ah, bob["id"])
    sent = service.get("/api/friends", headers=ah).json()
    received = service.get("/api/friends", headers=bh).json()
    assert sent["friends"] == [] and received["friends"] == []
    req_id = received["incoming"][0]["id"]
    assert sent["outgoing"][0]["id"] == req_id
    assert service.post(f"/api/friends/requests/{req_id}/respond", headers=ah, json={"accept": True}).status_code == 404
    assert service.post(f"/api/friends/requests/{req_id}/respond", headers=ch, json={"accept": True}).status_code == 404
    assert service.post(f"/api/friends/requests/{req_id}/respond", headers=bh, json={"accept": True}).status_code == 200
    assert service.get("/api/friends", headers=ah).json()["friends"] == [bob]
    assert service.get("/api/friends", headers=bh).json()["friends"] == [alice]
    assert service.get("/api/friends", headers=bh).json()["incoming"] == []
    assert service.post(f"/api/friends/requests/{req_id}/respond", headers=bh, json={"accept": True}).status_code == 404


def test_friend_duplicate_cross_request_and_self_rejected(service, people):
    (alice, ah), (bob, bh), _ = people
    friend_request(service, ah, bob["id"])
    assert service.post("/api/friends/requests", headers=ah, json={"user_id": bob["id"]}).status_code == 409
    assert service.post("/api/friends/requests", headers=bh, json={"user_id": alice["id"]}).status_code == 409
    assert service.post("/api/friends/requests", headers=ah, json={"user_id": alice["id"]}).status_code == 400
    assert service.post("/api/friends/requests", headers=ah, json={"user_id": "missing"}).status_code == 404


def test_decline_then_reapply_and_remove_friend(service, people):
    (alice, ah), (bob, bh), _ = people
    friend_request(service, ah, bob["id"])
    req = service.get("/api/friends", headers=bh).json()["incoming"][0]
    assert service.post(f"/api/friends/requests/{req['id']}/respond", headers=bh, json={"accept": False}).status_code == 200
    assert service.get("/api/friends", headers=ah).json() == {"friends": [], "incoming": [], "outgoing": []}
    friend_request(service, bh, alice["id"])
    req = service.get("/api/friends", headers=ah).json()["incoming"][0]
    service.post(f"/api/friends/requests/{req['id']}/respond", headers=ah, json={"accept": True})
    assert service.delete(f"/api/friends/{bob['id']}", headers=ah).status_code == 200
    assert service.get("/api/friends", headers=bh).json()["friends"] == []


def test_public_room_join_members_discuss_and_incremental_messages(service, people):
    (alice, ah), (bob, bh), (carol, ch) = people
    created = room(service, ah)
    rid = created["id"]
    listed = service.get("/api/rooms", headers=bh).json()[0]
    assert "invite_code" not in listed and not listed["is_member"]
    assert service.get(f"/api/rooms/{rid}", headers=ch).status_code == 403
    assert service.get(f"/api/rooms/{rid}/messages", headers=ch).status_code == 403
    assert service.post(f"/api/rooms/{rid}/messages", headers=ch, json={"content": "偷偷发言", "client_id": "carol-msg-01"}).status_code == 403
    assert service.post(f"/api/rooms/{rid}/join", headers=bh).json()["member_count"] == 2
    assert service.post(f"/api/rooms/{rid}/join", headers=bh).json()["member_count"] == 2
    detail = service.get(f"/api/rooms/{rid}", headers=bh).json()
    assert {member["id"] for member in detail["members"]} == {alice["id"], bob["id"]}
    first = service.post(f"/api/rooms/{rid}/messages", headers=ah, json={"content": "今日は何を勉強しますか。", "client_id": "alice-msg-01"}).json()
    second = service.post(f"/api/rooms/{rid}/messages", headers=bh, json={"content": "一起学 N5 语法！", "client_id": "bob-msg-0001"}).json()
    assert first["nickname"] == "alice" and second["nickname"] == "bob"
    assert service.get(f"/api/rooms/{rid}/messages", headers=bh).json() == [first, second]
    assert service.get(f"/api/rooms/{rid}/messages?after={first['id']}", headers=ah).json() == [second]
    assert service.get(f"/api/rooms/{rid}/messages?after={second['id']}", headers=ah).json() == []


def test_message_send_is_idempotent_and_conflicting_reuse_rejected(service):
    _, headers = register(service)
    rid = room(service, headers)["id"]
    body = {"content": "こんにちは", "client_id": "repeat-message-0001"}
    first = service.post(f"/api/rooms/{rid}/messages", headers=headers, json=body)
    second = service.post(f"/api/rooms/{rid}/messages", headers=headers, json=body)
    assert first.status_code == second.status_code == 200
    assert first.json() == second.json()
    assert len(service.get(f"/api/rooms/{rid}/messages", headers=headers).json()) == 1
    assert service.post(f"/api/rooms/{rid}/messages", headers=headers, json={**body, "content": "不同内容"}).status_code == 409


def test_private_room_only_joins_by_code(service, people):
    (_, ah), (_, bh), (_, ch) = people
    created = room(service, ah, visibility="private")
    rid = created["id"]
    assert service.get("/api/rooms", headers=bh).json() == []
    assert service.post(f"/api/rooms/{rid}/join", headers=bh).status_code == 403
    assert service.post("/api/rooms/join", headers=bh, json={"invite_code": "invalid-code"}).status_code == 404
    joined = service.post("/api/rooms/join", headers=bh, json={"invite_code": created["invite_code"]})
    assert joined.status_code == 200 and joined.json()["is_member"]
    assert service.get("/api/rooms", headers=bh).json()[0]["id"] == rid
    assert service.get("/api/rooms", headers=ch).json() == []


def test_capacity_checked_atomically_for_concurrent_joins(service, people):
    (_, ah), (_, bh), (_, ch) = people
    rid = room(service, ah, capacity=2)["id"]
    with ThreadPoolExecutor(max_workers=2) as pool:
        results = list(pool.map(lambda headers: service.post(f"/api/rooms/{rid}/join", headers=headers).status_code, [bh, ch]))
    assert sorted(results) == [200, 409]
    assert service.get(f"/api/rooms/{rid}", headers=ah).json()["room"]["member_count"] == 2


def test_owner_leaves_transfers_then_last_member_deletes_room(service, people):
    (_, ah), (bob, bh), (_, ch) = people
    rid = room(service, ah)["id"]
    service.post(f"/api/rooms/{rid}/join", headers=bh)
    assert service.post(f"/api/rooms/{rid}/leave", headers=ch).status_code == 403
    assert service.post(f"/api/rooms/{rid}/leave", headers=ah).status_code == 200
    assert service.get(f"/api/rooms/{rid}", headers=bh).json()["room"]["owner_id"] == bob["id"]
    assert service.get(f"/api/rooms/{rid}/messages", headers=ah).status_code == 403
    assert service.post(f"/api/rooms/{rid}/leave", headers=bh).status_code == 200
    assert service.get("/api/rooms", headers=ah).json() == []
    assert service.get(f"/api/rooms/{rid}", headers=bh).status_code == 404


@pytest.mark.parametrize("content", ["", "   ", "x" * 1001])
def test_invalid_message_rejected_without_echoing_input(service, content):
    _, headers = register(service)
    rid = room(service, headers)["id"]
    result = service.post(f"/api/rooms/{rid}/messages", headers=headers, json={"content": content, "client_id": "validate-message"})
    assert result.status_code == 422
    assert "input" not in result.text
    assert "参数" in result.json()["detail"]


@pytest.mark.parametrize("updates", [{"capacity": 1}, {"capacity": 51}, {"capacity": 2.5}, {"title": "  "}, {"level": "N6"}, {"visibility": "secret"}])
def test_invalid_room_rejected(service, updates):
    _, headers = register(service)
    result = service.post("/api/rooms", headers=headers, json={"title": "学习", **updates})
    assert result.status_code == 422


def test_cors_explicit_origins_and_no_wildcard(service):
    allowed = service.options("/api/me", headers={"Origin": "http://localhost:5174", "Access-Control-Request-Method": "GET", "Access-Control-Request-Headers": "authorization"})
    denied = service.options("/api/me", headers={"Origin": "https://untrusted.example", "Access-Control-Request-Method": "GET"})
    assert allowed.status_code == 200
    assert allowed.headers["access-control-allow-origin"] == "http://localhost:5174"
    assert "access-control-allow-origin" not in denied.headers


def test_message_rate_limit_returns_429_and_idempotent_retry_still_works(tmp_path):
    with TestClient(create_app(tmp_path / "limited.db")) as client:
        _, headers = register(client)
        rid = room(client, headers)["id"]
        for i in range(30):
            response = client.post(f"/api/rooms/{rid}/messages", headers=headers, json={"content": str(i), "client_id": f"rate-message-{i:04}"})
            assert response.status_code == 200
        assert client.post(f"/api/rooms/{rid}/messages", headers=headers, json={"content": "30", "client_id": "rate-message-0030"}).status_code == 429
        assert client.post(f"/api/rooms/{rid}/messages", headers=headers, json={"content": "0", "client_id": "rate-message-0000"}).status_code == 200


def test_persistence_across_app_restart(tmp_path):
    path = tmp_path / "persistent.db"
    with TestClient(create_app(path)) as first:
        user, headers = register(first)
        created = room(first, headers)
    with TestClient(create_app(path)) as second:
        assert second.get("/api/me", headers=headers).json() == user
        assert second.get("/api/rooms", headers=headers).json()[0]["id"] == created["id"]


def test_recent_message_window_and_incremental_pages(service):
    user, headers = register(service)
    rid = room(service, headers)["id"]
    with sqlite3.connect(service.app.state.db_path) as db:
        db.executemany("INSERT INTO messages(room_id,user_id,content,client_id,created_at) VALUES(?,?,?,?,?)", [(rid, user["id"], str(i), f"page-msg-{i}", "2026-11-01T00:00:00+00:00") for i in range(120)])
    recent = service.get(f"/api/rooms/{rid}/messages", headers=headers).json()
    assert len(recent) == 100 and recent[0]["content"] == "20" and recent[-1]["content"] == "119"
    page = service.get(f"/api/rooms/{rid}/messages?after=1", headers=headers).json()
    assert len(page) == 100 and page[0]["id"] == 2 and page[-1]["id"] == 101

