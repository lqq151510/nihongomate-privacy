# 日中词库导入与核验记录（2026-11-01）

本次将固定版本的公开授权词典整理为 7,736 条 N1～N5 日中学习词条。每条都有日文、假名读音、中文释义、中文词性和可追溯的源词条 ID。词库内容不设置会员门槛。这个数量是导入数据自身的数量，与应用原有手写词条合并后还需按表记和读音去重。

## 固定来源

- 仓库：[tomoshi-app/tomoshi-dict-data](https://github.com/tomoshi-app/tomoshi-dict-data)。
- 版本：[`v2026-10-13`](https://github.com/tomoshi-app/tomoshi-dict-data/releases/tag/v2026-10-13)。固定提交：`4f1fec127ec6a50fa0892235942e1caa414a882b`。
- 下载文件：[tomoshi-dict-open.db.zst](https://github.com/tomoshi-app/tomoshi-dict-data/releases/download/v2026-10-13/tomoshi-dict-open.db.zst)，88,099,052 字节。
- 压缩文件 SHA-256：`51581856d3e563b32b05738efd67c38ed9946c013555fd3c0870e24d194c2048`。
- 解压 SQLite：664,014,848 字节；SHA-256：`aefd9f997386ba277bdb1a4b34fef9fbf1aabfcb8fa4399cb53b50020751f5d1`。
- 上游中文由大语言模型辅助生成，并用另一模型复核；此过程不等同于日语教师或母语者逐条审核。

实际打开数据库并核对了 `table_licenses`。只读取 `entries`（JMdict 日文词条、读音、词性）、`zh_defs`（Y1Z 的 JMdict 派生中文）、`vocab_jlpt`（Jonathan Waller 经 stephenmk 整理的等级）和 `freq_rank`（JMdict 优先级派生排序）。四张表的许可均为 **CC-BY-SA-4.0**。没有读取 KanjiVG 笔顺、专有语法数据或音频。

日文词条版权归 EDRDG；中文衍生内容 © Y1Z；等级来源保留 Jonathan Waller 和 stephenmk 归属。本项目整理后的 JSON 继续以 CC BY-SA 4.0 分发，并记录修改。完整上游声明见 `public/licenses/tomoshi-LICENSE.md` 与 `public/licenses/tomoshi-NOTICE.md`；用户可通过 `public/licenses/vocabulary.html` 查看归属及下载派生数据。

## 筛选结果

| 学习等级 | 源表含中文词条 | 整理后词条 |
| --- | ---: | ---: |
| N5 | 692 | 690 |
| N4 | 646 | 646 |
| N3 | 1,648 | 1,641 |
| N2 | 1,737 | 1,732 |
| N1 | 3,054 | 3,027 |
| 合计 | 7,777 | 7,736 |

排除 22 条重复表记与读音，19 条没有合适中文义项的记录。义项筛选共排除 289 个带过时、罕用、冒犯等标签的义项，29 个命中明显成人内容关键词的义项，1 个缺少中文释义的义项。义项数和词条数不是同一统计口径；删除一个义项并不一定删除整个词条。

每个源词条仅选择一个常用主读音，以及与 `kana.restricted_to` 兼容的词形；优先具有词典常用标记的形式，通常写作假名的词采用假名。最多保留前两个合适义项，不把多个写法分别计数。NFKC 规范化后的表记加读音作为去重键，真实异读保留，例如 `何／なに` 与 `何／なん`。

ID 格式为 `tomoshi_<源词条ID>_<表记与读音SHA-256前8位>`，不依赖数组位置。新数据不复用或覆盖原有学习记录 ID。JSON 刻意不填造假罗马音、例句、音频地址或音调。

## 内容抽查与已知边界

抽查了每级靠前和中间样本、最长释义，以及 今日、明日、何、行く、生、上手、下手等多义或异读项目。源数据中“維持”的释义包含容易误学的“改善”，“会見”包含“观影会”；本项目明确记录这两条教学含义收窄，分别为“维持；保持”和“会见；会面；接见”。修订保存在导入脚本 `MEANING_OVERRIDES` 及来源清单内，可复现，不直接手工改生成 JSON。

“上手／うわて”的上游前两义与[日本汉字能力检定协会《汉字ペディア》](https://www.kanjipedia.jp/kotoba/0003480600) 中的方向义并不冲突；日常“技高一筹”等义在源数据其他义项中，本轮不宣称已经穷尽。

仍需明确：结构自动检查并不能证明 7,736 条语义全部正确。固定源快照没有保留逐义项的读音限制，因此词形读音兼容不等于异读词的所有义项已完成消歧。带标签/关键词的过滤也不是全面内容分级审核。该词库是有来源的大规模学习底库，后续应逐条积累教学纠错；不能宣传“官方完整词表”“母语教师全量审校”或“全部真人发音”。N1～N5 标签来自社区估计。

上游开放包已经移除日文例句，`zh_defs` 里零散的中文例句缺少对应日文。本次全部不导入，避免为词条伪造例句。语法、句子与听力应由各自独立内容模块提供、核验和计数。

## 复现方法

需要 Python 3.11+（只使用标准库）与本机 `zstd` 命令。以下缓存路径在仓库之外；不会将 664 MB 上游数据库打包进 APK。不要运行上游仓库脚本。

```sh
source_dir="$HOME/.cache/nihongomate-sources/tomoshi-v2026-10-13"
mkdir -p "$source_dir"
curl -fL --retry 2 'https://github.com/tomoshi-app/tomoshi-dict-data/releases/download/v2026-10-13/tomoshi-dict-open.db.zst' -o "$source_dir/tomoshi-dict-open.db.zst"
zstd -d --keep "$source_dir/tomoshi-dict-open.db.zst" -o "$source_dir/tomoshi-dict-open.db"
for name in README.md LICENSE.md NOTICE.md; do
  curl -fL --retry 2 "https://raw.githubusercontent.com/tomoshi-app/tomoshi-dict-data/4f1fec127ec6a50fa0892235942e1caa414a882b/$name" -o "$source_dir/$name"
done
python3 tools/import-vocabulary.py --source-dir "$source_dir"
python3 tools/import-vocabulary.py --source-dir "$source_dir" --check
bun test tests/imported-vocabulary.test.ts
```

导入脚本先校验数据库 SHA-256（如果压缩包存在也校验），通过只读 SQLite 连接抽取，并检查实际逐表许可。不自动联网。未知快照拒绝导入。`--check` 重新派生并比较源 JSON、公开下载 JSON 与清单字节，不修改生成数据。

## 交付与回滚

- 导入逻辑：`tools/import-vocabulary.py`。
- 应用数据：`src/data/importedVocabulary.json`。
- 同字节下载副本：`public/data/vocabulary-source.json`。
- 版本、许可、统计及 SHA-256：`public/licenses/vocabulary-source-manifest.json`。
- 用户可读说明：`public/licenses/vocabulary.html`；上游归档：同目录的 `tomoshi-*.md`。
- 数据验证：`tests/imported-vocabulary.test.ts`，覆盖各级数量、唯一性、稳定 ID、读音格式、中文字段、下载副本一致性、来源许可、样本读音及词性筛选。

回滚本次导入时应先移除应用对新增 JSON 的导入、恢复原有词库组合，再移除本清单的新文件；不要还原整个仓库或删除原有用户学习记录。本子任务不执行 Git 提交、推送、上架或 APK 发布。
