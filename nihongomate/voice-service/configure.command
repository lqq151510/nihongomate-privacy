#!/bin/sh
set -eu
cd "$(dirname "$0")"
finish() {
    if [ -t 0 ]; then
        printf '\n%s' '按回车关闭窗口…'
        read -r voice_setup_done || true
    fi
}
trap finish EXIT
if [ ! -x .venv/bin/python ]; then
    printf '%s\n' '正在创建独立的 Python 环境…'
    python3 -m venv .venv
fi
printf '%s\n' '正在检查语音服务所需依赖…'
.venv/bin/python -m pip install --disable-pip-version-check -r requirements.txt
.venv/bin/python configure.py
