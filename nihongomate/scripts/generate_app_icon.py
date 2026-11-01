#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
生成《随身日语伴侣》高精度官方 App 图标 (512x512 PNG)
支持 VIVO 开放平台、工信部 APP 备案材料及 Android 原生 mipmap 资源
"""

import argparse
import math
import os
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageFilter

SIZE = 512
RADIUS = 115  # 现代化圆角半径 (Squircle 适配)

def create_gradient_background(width, height):
    """创建精致的樱花粉红至皇家赤红高质感渐变底色"""
    base = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    draw = ImageDraw.Draw(base)

    # 45 度对角线双色渐变
    # 起点: #FF5E7E (明亮珊瑚樱粉), 终点: #BE123C (深邃宝石玫红)
    r1, g1, b1 = 255, 94, 126
    r2, g2, b2 = 190, 18, 60

    for y in range(height):
        for x in range(width):
            ratio = (x + y) / (width + height)
            r = int(r1 + (r2 - r1) * ratio)
            g = int(g1 + (g2 - g1) * ratio)
            b = int(b1 + (b2 - b1) * ratio)
            draw.point((x, y), fill=(r, g, b, 255))

    # 叠加顶部柔和高光径向渐变，制造高级磨砂质感
    gloss = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    gloss_draw = ImageDraw.Draw(gloss)
    cx, cy = int(width * 0.35), int(height * 0.25)
    max_radius = int(width * 0.65)

    for r in range(max_radius, 0, -2):
        alpha = int(45 * (1 - r / max_radius))
        gloss_draw.ellipse(
            [cx - r, cy - r, cx + r, cy + r],
            fill=(255, 255, 255, alpha)
        )

    base = Image.alpha_composite(base, gloss)
    return base

def draw_sakura_petal(draw, cx, cy, size, angle_deg, color):
    """绘制唯美的樱花花瓣点缀"""
    rad = math.radians(angle_deg)
    cos_a = math.cos(rad)
    sin_a = math.sin(rad)

    points = []
    num_pts = 30
    for i in range(num_pts):
        t = i / (num_pts - 1) * math.pi
        px = size * 0.5 * math.sin(t)
        py = -size * math.cos(t) * (0.8 + 0.2 * math.sin(t))
        # 旋转并平移
        rx = cx + (px * cos_a - py * sin_a)
        ry = cy + (px * sin_a + py * cos_a)
        points.append((rx, ry))

    draw.polygon(points, fill=color)

def render_foreground(background=None):
    """纯渲染品牌前景；可选底图保留原桌面导出的逐像素绘制行为。"""
    img = background.copy() if background is not None else Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    # Android 小图标用纯白胶囊和花瓣保持清晰；桌面旧渲染保留原 alpha。
    opaque_accents = background is None

    # 2. 寻找系统日语字体 (选用最顶级 Hiragino Kaku Gothic W7)
    font_candidates = [
        "/System/Library/Fonts/ヒラギノ角ゴシック W7.ttc",
        "/System/Library/Fonts/ヒラギノ角ゴシック W6.ttc",
        "/System/Library/Fonts/Hiragino Sans GB.ttc",
        "/System/Library/Fonts/Supplemental/Arial Unicode.ttf"
    ]
    font_path = None
    for p in font_candidates:
        if os.path.exists(p):
            font_path = p
            break

    font_main = ImageFont.truetype(font_path, 250) if font_path else ImageFont.load_default()
    font_sub = ImageFont.truetype(font_path, 34) if font_path else ImageFont.load_default()

    # 3. 绘制文字阴影 (提升立体浮雕感)
    shadow_layer = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    s_draw = ImageDraw.Draw(shadow_layer)

    # "あ" 假名投影
    char = "あ"
    bbox = s_draw.textbbox((0, 0), char, font=font_main)
    w = bbox[2] - bbox[0]
    h = bbox[3] - bbox[1]
    text_x = (SIZE - w) / 2 - bbox[0]
    text_y = (SIZE - h) / 2 - bbox[1] - 18

    s_draw.text((text_x + 3, text_y + 8), char, font=font_main, fill=(120, 10, 35, 120))
    shadow_layer = shadow_layer.filter(ImageFilter.GaussianBlur(8))
    img = Image.alpha_composite(img, shadow_layer)

    # 4. 绘制主体白字
    draw = ImageDraw.Draw(img)
    draw.text((text_x, text_y), char, font=font_main, fill=(255, 255, 255, 255))

    # 5. 绘制底部副标题徽章 "随身日语"
    sub_title = "随身日语"
    sub_bbox = draw.textbbox((0, 0), sub_title, font=font_sub)
    sw = sub_bbox[2] - sub_bbox[0]
    sh = sub_bbox[3] - sub_bbox[1]
    sub_x = (SIZE - sw) / 2 - sub_bbox[0]
    sub_y = SIZE - 82

    # 胶囊小底托
    pad_x, pad_y = 16, 6
    draw.rounded_rectangle(
        [sub_x - pad_x, sub_y - pad_y, sub_x + sw + pad_x, sub_y + sh + pad_y + 2],
        radius=14,
        fill=(255, 255, 255, 255 if opaque_accents else 45),
        outline=(255, 255, 255, 255 if opaque_accents else 80),
        width=1
    )
    # Android 图标不绘制中文小字，避免小尺寸难读及日文字体缺字。
    if not opaque_accents:
        draw.text((sub_x, sub_y), sub_title, font=font_sub, fill=(255, 255, 255, 245))

    # 6. 右上方点缀两朵优雅随风飘舞的樱花花瓣
    draw_sakura_petal(draw, cx=390, cy=115, size=46, angle_deg=35, color=(255, 255, 255, 255 if opaque_accents else 160))
    draw_sakura_petal(draw, cx=425, cy=155, size=28, angle_deg=65, color=(255, 255, 255, 255 if opaque_accents else 120))

    return img


def generate_icon():
    print("正在渲染 512x512 高清 App 图标...")
    img = render_foreground(create_gradient_background(SIZE, SIZE))

    # 7. 应用圆角遮罩 (工信部与应用商店标准圆角正方形)
    mask = Image.new("L", (SIZE, SIZE), 0)
    mask_draw = ImageDraw.Draw(mask)
    mask_draw.rounded_rectangle([0, 0, SIZE, SIZE], radius=RADIUS, fill=255)

    final_icon = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    final_icon.paste(img, (0, 0), mask=mask)

    # 导出到桌面
    desktop_path = "/Users/liuyongze/Desktop/随身日语伴侣-App图标.png"
    final_icon.save(desktop_path, "PNG")
    print(f"✅ 桌面 App 图标已生成: {desktop_path}")

    # 同时导出无透明通道的标准直角版 (部分商店喜欢直角由系统自动裁切)
    square_path = "/Users/liuyongze/Desktop/随身日语伴侣-App图标-方版.png"
    img.save(square_path, "PNG")
    print(f"✅ 桌面 App 方版图标已生成: {square_path}")

def alpha_radius(image):
    """计算所有非透明像素相对于画布中心的最大半径。"""
    alpha = image.getchannel("A")
    cx, cy = image.width / 2, image.height / 2
    return max(
        (math.hypot(x + 0.5 - cx, y + 0.5 - cy)
         for y in range(image.height)
         for x in range(image.width) if alpha.getpixel((x, y))),
        default=0.0,
    )


def render_android_foreground(size):
    """108dp 图层中，全部前景像素均落在中心直径 66dp 的安全圆内。"""
    foreground = render_foreground()
    source_radius = alpha_radius(foreground)
    safe_radius = size * 33 / 108
    # 先预留约 1dp，再按真实 alpha 检查 Lanczos 重采样边缘。
    side = max(1, int(SIZE * (size * 32 / 108) / source_radius))
    while side > 0:
        layer = Image.new("RGBA", (size, size), (0, 0, 0, 0))
        scaled = foreground.resize((side, side), Image.Resampling.LANCZOS)
        offset = (size - side) // 2
        layer.alpha_composite(scaled, (offset, offset))
        if alpha_radius(layer) <= safe_radius:
            return layer
        side -= 1
    raise ValueError("无法将品牌前景放入自适应图标安全圆")


def generate_android_resources(res_dir):
    """显式 Android 模式只写启动图标资源，不触及桌面导出文件。"""
    res_dir = Path(res_dir)
    for density, size in [("mdpi", 108), ("hdpi", 162), ("xhdpi", 216),
                          ("xxhdpi", 324), ("xxxhdpi", 432)]:
        target = res_dir / f"mipmap-{density}" / "ic_launcher_foreground.png"
        target.parent.mkdir(parents=True, exist_ok=True)
        render_android_foreground(size).save(target, "PNG")
        print(f"Android 前景已生成: {target}")

    resources = {
        "drawable/ic_launcher_background.xml": """<?xml version="1.0" encoding="utf-8"?>
<shape xmlns:android="http://schemas.android.com/apk/res/android" android:shape="rectangle">
    <gradient android:angle="315" android:startColor="#FF5E7E" android:endColor="#BE123C" android:type="linear" />
</shape>
""",
        "values/ic_launcher_background.xml": """<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="ic_launcher_background">#BE123C</color>
</resources>
""",
        "drawable-v24/ic_launcher_foreground.xml": """<?xml version="1.0" encoding="utf-8"?>
<bitmap xmlns:android="http://schemas.android.com/apk/res/android"
    android:src="@mipmap/ic_launcher_foreground" android:gravity="fill" />
""",
    }
    adaptive_icon = """<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@drawable/ic_launcher_background"/>
    <foreground android:drawable="@mipmap/ic_launcher_foreground"/>
</adaptive-icon>
"""
    resources["mipmap-anydpi-v26/ic_launcher.xml"] = adaptive_icon
    resources["mipmap-anydpi-v26/ic_launcher_round.xml"] = adaptive_icon
    for relative, contents in resources.items():
        target = res_dir / relative
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(contents, encoding="utf-8")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--android-res", type=Path, help="仅更新指定的 Android res 目录")
    args = parser.parse_args()
    if args.android_res is not None:
        generate_android_resources(args.android_res)
    else:
        generate_icon()
