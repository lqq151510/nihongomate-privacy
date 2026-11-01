"""在线备份 SQLite；只读源库，排他发布备份，失败时保留 .incomplete 证据。"""

from __future__ import annotations

import argparse
from contextlib import closing
import hashlib
import json
import os
from pathlib import Path
import sqlite3
import tempfile
import time


def backup(source: Path, destination: Path) -> dict:
    source = source.resolve(strict=True)
    destination = destination.absolute()
    if not source.is_file():
        raise ValueError("源路径必须是已存在的数据库文件。")
    if destination.exists():
        raise FileExistsError("备份目标已存在，拒绝覆盖。")
    destination.parent.mkdir(parents=True, mode=0o700, exist_ok=True)
    # Temporary file is 0600 and on the same filesystem as the final destination.
    fd, temporary_name = tempfile.mkstemp(prefix=destination.name + ".", suffix=".incomplete", dir=destination.parent)
    os.close(fd)
    temporary = Path(temporary_name)
    deadline = time.monotonic() + 60

    def progress(_status: int, _remaining: int, _total: int):
        if time.monotonic() > deadline:
            raise TimeoutError("备份超过 60 秒，请检查数据库锁或磁盘空间。")

    try:
        with closing(sqlite3.connect(source.as_uri() + "?mode=ro", uri=True, timeout=10)) as origin:
            with closing(sqlite3.connect(temporary, timeout=10)) as target:
                origin.backup(target, pages=256, progress=progress, sleep=0.05)
                target.execute("PRAGMA journal_mode=DELETE")
                result = target.execute("PRAGMA quick_check").fetchall()
                if result != [("ok",)]:
                    raise RuntimeError("备份数据库完整性检查失败。")
        with temporary.open("rb") as stream:
            digest = hashlib.file_digest(stream, "sha256").hexdigest()
            os.fsync(stream.fileno())
        # link() fails atomically if another process already created the target.
        os.link(temporary, destination)
        temporary.unlink()
        return {"path": str(destination), "size": destination.stat().st_size, "sha256": digest, "quick_check": "ok"}
    except BaseException as exc:
        raise RuntimeError(f"备份未完成；已保留临时文件：{temporary}") from exc


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source", type=Path)
    parser.add_argument("destination", type=Path)
    args = parser.parse_args()
    try:
        print(json.dumps(backup(args.source, args.destination), ensure_ascii=False))
    except (OSError, ValueError, RuntimeError) as exc:
        parser.exit(1, f"{exc}\n")


if __name__ == "__main__":
    main()

