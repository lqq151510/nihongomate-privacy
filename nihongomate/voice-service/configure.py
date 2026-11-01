"""Interactive, local-only setup. Secrets are never accepted as command-line arguments."""
from __future__ import annotations

import getpass
import json
import os
from pathlib import Path
import tempfile

from voice_service import CONFIG_PATH, Settings


def write_config(path: Path, settings: Settings) -> None:
    values = {
        'azure_key': settings.azure_key, 'region': settings.region,
        'proxy_token': settings.proxy_token, 'origins': list(settings.origins),
        'daily_character_limit': settings.daily_character_limit,
    }
    path.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
    path.parent.chmod(0o700)
    descriptor, temporary_name = tempfile.mkstemp(prefix='.voice-config-', dir=path.parent)
    temporary = Path(temporary_name)
    try:
        os.fchmod(descriptor, 0o600)
        with os.fdopen(descriptor, 'w') as target:
            json.dump(values, target, ensure_ascii=False, indent=2)
            target.write('\n')
            target.flush()
            os.fsync(target.fileno())
        os.replace(temporary, path)
    finally:
        temporary.unlink(missing_ok=True)


def main() -> int:
    print('随身日语伴侣 · Azure 联网语音本机配置')
    print('密钥不会回显，也不会写入项目或 APK。没有 Azure 服务时可先留空。')
    print('再次运行会用本次输入替换旧配置；请重新输入需要保留的值。')
    try:
        region = input('Azure 区域（例如 eastasia；暂无可留空）: ').strip()
        key = getpass.getpass('Azure Speech Key（暂无可留空）: ').strip()
        token = getpass.getpass('自设语音服务访问口令（至少16位无空格ASCII，稍后在应用填写）: ').strip()
        if not token:
            raise ValueError('访问口令不能为空。')
        settings = Settings(region=region, azure_key=key, proxy_token=token)
        write_config(CONFIG_PATH, settings)
    except (ValueError, OSError):
        print('配置未保存。请检查区域、访问口令格式和目录权限后重试。')
        return 1
    except (EOFError, KeyboardInterrupt):
        print('\n已取消，原配置保留。')
        return 1
    print(f'配置已保存到受限文件：{CONFIG_PATH}')
    print('运行 ./run.sh 启动本机服务。' if settings.configured else 'Azure 密钥或区域尚未配置，候选音色仍不可试听。')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
