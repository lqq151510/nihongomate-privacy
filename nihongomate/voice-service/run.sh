#!/bin/sh
set -eu
cd "$(dirname "$0")"
if [ ! -x .venv/bin/python ]; then
    printf '%s\n' '请先运行：python3 -m venv .venv，然后 .venv/bin/python -m pip install -r requirements.txt'
    exit 1
fi
exec .venv/bin/python -m uvicorn voice_service:create_app --factory --host 127.0.0.1 --port 4210 --workers 1 --no-access-log
