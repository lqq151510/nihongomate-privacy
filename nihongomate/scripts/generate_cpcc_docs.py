#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
随身日语伴侣软件 V1.0 - 中国版权保护中心 (CPCC) 软著申报材料自动生成工具
自动生成合规的：
1. 《源程序代码文档》 (DOCX, 每页 50 行, 规范页眉页脚与行号)
2. 《用户使用说明书》 (DOCX, 包含完整功能模块、操作指南与合规条款)
"""

import os
from docx import Document
from docx.shared import Pt, Inches, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml import OxmlElement, parse_xml
from docx.oxml.ns import nsdecls, qn

APP_NAME = "随身日语伴侣软件"
VERSION = "V1.0"
DEVELOPER = "刘勇泽"
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
DOCS_DIR = os.path.join(BASE_DIR, "docs", "cpcc")

os.makedirs(DOCS_DIR, exist_ok=True)

def setup_page_decorations(section, doc_title):
    """设置标准页眉与页脚"""
    section.top_margin = Inches(0.8)
    section.bottom_margin = Inches(0.8)
    section.left_margin = Inches(0.8)
    section.right_margin = Inches(0.8)

    # 页眉
    header = section.header
    header_p = header.paragraphs[0]
    header_p.alignment = WD_ALIGN_PARAGRAPH.LEFT
    run_hdr = header_p.add_run(f"{APP_NAME} {VERSION} - {doc_title}")
    run_hdr.font.name = "SimSun"
    run_hdr.font.size = Pt(8.5)
    run_hdr.font.color.rgb = RGBColor(120, 120, 120)

    # 页眉下边框
    pBdr = parse_xml(r'<w:pBdr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:bottom w:val="single" w:sz="6" w:space="1" w:color="CCCCCC"/></w:pBdr>')
    header_p._p.get_or_add_pPr().append(pBdr)

    # 页脚
    footer = section.footer
    footer_p = footer.paragraphs[0]
    footer_p.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    run_ftr = footer_p.add_run(f"{APP_NAME} {VERSION}")
    run_ftr.font.name = "SimSun"
    run_ftr.font.size = Pt(8.5)
    run_ftr.font.color.rgb = RGBColor(150, 150, 150)

def generate_source_code_doc():
    """生成符合 CPCC 规范的 50 行/页源程序代码文档"""
    print("正在收集源程序代码...")
    source_files = [
        "src/main.ts",
        "src/App.vue",
        "src/components/GojuonBoard.vue",
        "src/components/CurriculumView.vue",
        "src/components/VocabFlashcard.vue",
        "src/components/ListeningLab.vue",
        "src/components/GojuonQuiz.vue",
        "src/components/SettingsView.vue",
        "src/components/PrivacyModal.vue",
        "src/data/gojuon.ts",
        "src/data/curriculum.ts",
        "src/data/vocab.ts",
        "src/data/listeningScenarios.ts",
        "src/data/listeningTests.ts",
        "src/utils/audio.ts",
        "src/utils/storage.ts",
        "capacitor.config.ts"
    ]

    all_lines = []
    for rel_path in source_files:
        full_path = os.path.join(BASE_DIR, rel_path)
        if not os.path.exists(full_path):
            continue
        all_lines.append(f"// ==================== [FILE: {rel_path}] ====================")
        with open(full_path, "r", encoding="utf-8") as f:
            for line in f:
                stripped = line.rstrip()
                if stripped.strip():  # 过滤纯空行以保证密度
                    all_lines.append(stripped)

    print(f"有效源代码总行数: {len(all_lines)}")

    # 生成 60 页（或全量页），每页恰好 50 行
    doc = Document()
    section = doc.sections[0]
    setup_page_decorations(section, "源程序代码文档")

    lines_per_page = 50
    total_pages = (len(all_lines) + lines_per_page - 1) // lines_per_page

    print(f"总计可排版 {total_pages} 页 (每页 50 行)")

    for page_idx in range(total_pages):
        start_idx = page_idx * lines_per_page
        end_idx = min(start_idx + lines_per_page, len(all_lines))
        page_lines = all_lines[start_idx:end_idx]

        # 页面标注
        p_info = doc.add_paragraph()
        p_info.alignment = WD_ALIGN_PARAGRAPH.RIGHT
        r_info = p_info.add_run(f"第 {page_idx + 1} 页 / 共 {total_pages} 页")
        r_info.font.name = "Consolas"
        r_info.font.size = Pt(8)
        r_info.font.color.rgb = RGBColor(160, 160, 160)
        p_info.paragraph_format.space_after = Pt(2)
        p_info.paragraph_format.space_before = Pt(0)

        # 50 行代码
        for local_line_no, line_content in enumerate(page_lines, start=1):
            p = doc.add_paragraph()
            p.paragraph_format.space_before = Pt(0)
            p.paragraph_format.space_after = Pt(0)
            p.paragraph_format.line_spacing = Pt(11)

            # 行号
            r_num = p.add_run(f"{start_idx + local_line_no:4d}  ")
            r_num.font.name = "Consolas"
            r_num.font.size = Pt(8)
            r_num.font.color.rgb = RGBColor(150, 150, 150)

            # 代码正文
            r_code = p.add_run(line_content)
            r_code.font.name = "Courier New"
            r_code.font.size = Pt(8)
            r_code.font.color.rgb = RGBColor(30, 30, 30)

        # 分页符 (除最后一页)
        if page_idx < total_pages - 1:
            doc.add_page_break()

    output_path = os.path.join(DOCS_DIR, f"{APP_NAME}_{VERSION}_源程序代码文档.docx")
    doc.save(output_path)
    print(f"✅ 源程序代码文档已生成: {output_path}")

def generate_user_manual():
    """生成符合 CPCC 规范的用户操作使用说明书"""
    print("正在生成用户使用说明书...")
    doc = Document()
    section = doc.sections[0]
    setup_page_decorations(section, "用户操作使用说明书")

    # 封面
    p_cover_title = doc.add_paragraph()
    p_cover_title.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_cover_title.paragraph_format.space_before = Pt(120)
    p_cover_title.paragraph_format.space_after = Pt(16)
    r_title = p_cover_title.add_run(APP_NAME)
    r_title.font.name = "SimHei"
    r_title.font.size = Pt(28)
    r_title.bold = True
    r_title.font.color.rgb = RGBColor(225, 29, 72)  # Rose-600

    p_cover_sub = doc.add_paragraph()
    p_cover_sub.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_cover_sub.paragraph_format.space_after = Pt(180)
    r_sub = p_cover_sub.add_run(f"版本：{VERSION}\n用户操作使用说明书")
    r_sub.font.name = "SimSun"
    r_sub.font.size = Pt(16)
    r_sub.font.color.rgb = RGBColor(80, 80, 80)

    p_cover_meta = doc.add_paragraph()
    p_cover_meta.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_cover_meta.paragraph_format.space_after = Pt(0)
    r_meta = p_cover_meta.add_run(f"著作权人 / 开发者：{DEVELOPER}\n生成日期：2026年10月")
    r_meta.font.name = "SimSun"
    r_meta.font.size = Pt(11)
    r_meta.font.color.rgb = RGBColor(100, 100, 100)

    doc.add_page_break()

    # 正文目录与章节
    chapters = [
        ("一、 软件概述与设计背景", [
            ("1.1 软件简介", "《随身日语伴侣软件》（简称：随身日语伴侣）是一款专为零基础至高阶日语学习者量身定制的高性能移动端离线学习工具软件。系统创新性地将“汉语拼音拼读规律”融入日语五十音图记忆矩阵，结合 JLPT N1~N5 全级别词库、艾宾浩斯智能记忆闪卡与纯端侧语音合成引擎，提供纯离线、零广告、零隐私追踪的沉浸式学习体验。"),
            ("1.2 设计理念与技术特色", "1. 纯本地端侧离线运行：所有词库、语法解析、题库及语音朗读均在手机端本地完成，不依赖外部付费云服务器，无断网烦恼，彻底杜绝个人数据泄露风险。\n2. 汉语拼音化五十音图：声母（辅音行）与韵母（元音列）交叉排布，标明汉语拟音与特殊发音避坑提示，大幅降低中国初学者记忆门槛。\n3. 原速精听与变速磨耳朵：支持 0.75x、1.0x、1.25x 三档调速，涵盖盲听辨义与生活实景长对话。\n4. 符合国内应用商店合规规范：内置工信部标准开屏双选隐私协议与离线数据重置机制。")
        ]),
        ("二、 软件运行环境要求", [
            ("2.1 硬件配置要求", "• 处理器：ARMv7 / ARM64 或同等及以上架构移动处理器；\n• 运行内存 (RAM)：建议 2GB 及以上（最低 1GB）；\n• 存储空间：空闲内部存储空间建议 50MB 及以上；\n• 屏幕分辨率：自适应各种主流手机屏幕（如 1080×2400 等），采用移动端高密度适配布局。"),
            ("2.2 软件与操作系统环境", "• 操作系统：Android 7.0 (API Level 24) 及以上系统版本；\n• 运行平台：完全兼容 vivo、OPPO、小米、华为、荣耀等主流安卓设备应用商店；\n• 权限要求：仅需手机原生音频播放与本地数据缓存权限，无需任何通讯录、定位或相机权限。")
        ]),
        ("三、 软件安装与启动", [
            ("3.1 软件安装", "用户可在应用商店搜索《随身日语伴侣》并点击“安装”按钮，系统将自动完成 APK 安装包的下载与签名校验。"),
            ("3.2 首次启动与隐私协议签署", "软件首次启动时，界面会自动弹出合规《用户服务协议与个人信息保护声明》。\n• 用户点击【同意并进入学习】，即可正式解锁全部功能；\n• 用户若点击【退出应用】，系统将遵循最小权限原则退出程序，绝不强制收集任何设备信息。")
        ]),
        ("四、 主要功能模块详解与操作步骤", [
            ("4.1 汉语拼音对照 · 五十音图矩阵", "【功能入口】：底部导航栏第一项【拼音50音】。\n【操作说明】：\n1. 模式切换：支持“平假名”、“片假名”与“对照模式”一键快速切换；\n2. 拼读矩阵：顶部横轴为韵母 a/i/u/e/o 列，纵轴为声母 Ø/k/s/t/n/h/m/y/r/w 行；标金黄色假名（如 し、ち、つ、ふ）带有发音技巧防坑提示；\n3. 语音试听：点击任意单元格即可朗读该假名发音；点击声母标签可触发整行连贯拼读；\n4. 字源弹窗：长按或点按假名可调出汉字字源演变卡片（如“安”演变为“あ”），辅助趣味联想记忆。"),
            ("4.2 JLPT N1~N5 分级课程系统", "【功能入口】：底部导航栏第二项【N1-N5课程】。\n【操作说明】：\n1. 等级切换：用户可横向滑动选择目标等级（N5 入门、N4 进阶、N3 中级、N2 高级、N1 精通）；\n2. 目标设定：点击右上角【设为当前目标】按钮，软件会在主界面高亮记录该目标并在离线存储中置顶；\n3. 三大子模块切换：在各级别下自由切换【闪卡刷词】、【语法精讲】与【词汇全表】。"),
            ("4.3 艾宾浩斯智能闪卡刷词 (Vocab Flashcards)", "【操作说明】：\n1. 卡片正面展示词性、大号日文汉字与假名注音，内置发音按钮可即时跟读；\n2. 点击闪卡任意区域触发平滑 3D 翻转动效，翻转至卡片反面揭晓中文释义与真实语境例句；\n3. 底部设有【生疏】、【模糊】、【已掌握】三级评定按钮，算法将根据用户熟练度动态加权计算下次复习周期。"),
            ("4.4 核心语法原理深度精讲", "【操作说明】：\n收录 N5~N1 各章节高频考点语法，每条语法均结构化展示【接续方式】、【AI 深度原理精讲】与【地道例句】。帮助初学者洞察日语助词与变形背后的底层逻辑，告别死记硬背。"),
            ("4.5 日语听力强化工坊 (Listening Lab)", "【功能入口】：底部导航栏第三项【听力工坊】。\n【操作说明】：\n1. 变速精听调节：支持 0.75x (慢速辨音)、1.0x (标准原速)、1.25x (快速适应) 三档播放速度自由切换；\n2. 盲听速辨模式：屏幕仅显示声波动画与播放按钮，用户盲听读音后从 4 个备选项中选出正确词义，答对立即累计连胜积分；\n3. 实景情景长对话模式：模拟便利店、租房、问路、请假等真实日本生活场景，支持整段连播或逐句复读，并附带听力理解考点测验。"),
            ("4.6 听音辨字智能测验 (Quiz)", "【功能入口】：底部导航栏第四项【听音测验】。\n【操作说明】：\n系统随机播发假名读音并生成 4 项假名选择卡。支持实时连击 Combo 统计，答对播放清脆叮咚音效，完成全部 10 题后触发全屏彩带撒花特效 🎉 并展示成绩单。"),
            ("4.7 学习档案与离线设置 (Settings)", "【功能入口】：底部导航栏第五项【设置】。\n【操作说明】：\n1. 学习成就看板：实时统计【连续学习天数】、【今日复习词数】与【累计学习词数】；\n2. 语音引擎测试：提供一键测试本地 TTS 发音健康状态；\n3. 隐私与数据安全：支持查阅隐私保护政策全文，提供一键重置本地做题数据功能。")
        ]),
        ("五、 常见问题与技术支持", [
            ("5.1 手机没有发音声音怎么办？", "1. 请检查手机侧面物理静音开关是否开启，或尝试调高媒体音量；\n2. 确保系统内置的 Google TTS 或厂商语音合成引擎已开启日语音色支持。"),
            ("5.2 软件如何进行版本升级与数据备份？", "本应用为本地无状态存储架构，覆盖安装新版本时，Android 系统会自动保留原有的 LocalStorage 学习记录，无需手动导出。")
        ])
    ]

    for ch_title, sections in chapters:
        p_ch = doc.add_paragraph()
        p_ch.paragraph_format.space_before = Pt(14)
        p_ch.paragraph_format.space_after = Pt(6)
        r_ch = p_ch.add_run(ch_title)
        r_ch.font.name = "SimHei"
        r_ch.font.size = Pt(14)
        r_ch.bold = True
        r_ch.font.color.rgb = RGBColor(190, 18, 60)

        for sec_title, sec_content in sections:
            p_sec = doc.add_paragraph()
            p_sec.paragraph_format.space_before = Pt(8)
            p_sec.paragraph_format.space_after = Pt(3)
            r_sec = p_sec.add_run(sec_title)
            r_sec.font.name = "SimHei"
            r_sec.font.size = Pt(11)
            r_sec.bold = True
            r_sec.font.color.rgb = RGBColor(30, 41, 59)

            p_cnt = doc.add_paragraph()
            p_cnt.paragraph_format.space_before = Pt(0)
            p_cnt.paragraph_format.space_after = Pt(6)
            p_cnt.paragraph_format.line_spacing = Pt(15)
            r_cnt = p_cnt.add_run(sec_content)
            r_cnt.font.name = "SimSun"
            r_cnt.font.size = Pt(10)
            r_cnt.font.color.rgb = RGBColor(51, 65, 85)

    output_path = os.path.join(DOCS_DIR, f"{APP_NAME}_{VERSION}_用户使用说明书.docx")
    doc.save(output_path)
    print(f"✅ 用户使用说明书已生成: {output_path}")

if __name__ == "__main__":
    generate_source_code_doc()
    generate_user_manual()
    print("🎉 全部软著申报文档已准备就绪！")
