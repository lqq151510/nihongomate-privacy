#!/usr/bin/env python3
"""Deterministically derive the app's licensed vocabulary from a pinned Tomoshi DB.

No upstream code is executed. The SQLite database is opened read-only. Download
and decompress the documented release into --source-dir before invoking this file.
"""
from __future__ import annotations

import argparse
from collections import Counter
import hashlib
import json
from pathlib import Path
import re
import shutil
import sqlite3
import unicodedata

RELEASE = "v2026-10-13"
COMMIT = "4f1fec127ec6a50fa0892235942e1caa414a882b"
COMPRESSED_SHA256 = "51581856d3e563b32b05738efd67c38ed9946c013555fd3c0870e24d194c2048"
DATABASE_SHA256 = "aefd9f997386ba277bdb1a4b34fef9fbf1aabfcb8fa4399cb53b50020751f5d1"
REPOSITORY = "https://github.com/tomoshi-app/tomoshi-dict-data"
LICENSE_URL = "https://creativecommons.org/licenses/by-sa/4.0/"
TABLES = ("entries", "zh_defs", "vocab_jlpt", "freq_rank")
BAD_SENSE_TAGS = {
    "archaic", "obsolete term", "dated term", "rare term", "derogatory",
    "vulgar expression or word", "sensitive",
}
BAD_FORM_MARKERS = ("search-only", "rarely used", "out-dated", "obsolete", "irregular")
ADULT_EN = re.compile(
    r"\b(?:pornograph\w*|sexual intercourse|genital\w*|masturbat\w*|prostitut\w*|"
    r"penis|vagina|vulva|fuck\w*|cunt|testicle\w*|semen|sperm|erection|orgasm|"
    r"ejaculat\w*|anal sex|sex toy|fellation|fellatio|rape|raping)\b", re.I,
)
ADULT_ZH = re.compile("性交|色情|自慰|生殖器|阴茎|阴道|阴户|睾丸|精液|精子|射精|勃起|卖淫|妓女|强奸|嫖|龟头|阴蒂|鸡巴|婊|约炮|手淫|口交|肛交|阴部")
KANA = re.compile(r"^[\u3041-\u3096\u309d-\u309f\u30a1-\u30fa\u30fd-\u30ffー・]+$")
CHINESE = re.compile(r"[\u3400-\u9fff]")
# Keep the common teaching meaning when a source gloss contains an easily
# misunderstood peripheral meaning. These are local editorial selections,
# not a claim that every upstream gloss has been reviewed by a teacher.
MEANING_OVERRIDES = {
    "1158450": "维持；保持",  # 維持: omit the source's peripheral "improvement".
    "1198500": "会见；会面；接见",  # 会見: omit the ambiguous "(viewing) party".
}


def sha256(path: Path) -> str:
    with path.open("rb") as stream:
        return hashlib.file_digest(stream, "sha256").hexdigest()


def normal_form(form: dict) -> bool:
    return not any(marker in tag for tag in form.get("info", []) for marker in BAD_FORM_MARKERS)


def pos_label(tags: list[str]) -> str:
    labels: list[str] = []
    for tag in tags:
        if tag.startswith("Godan"): label = "动词一类"
        elif tag.startswith("Ichidan"): label = "动词二类"
        elif tag.startswith("Kuru"): label = "动词三类（カ变）"
        elif "suru" in tag: label = "名词/动词三类（サ变）" if tag.startswith("noun") else "动词三类（サ变）"
        elif tag.startswith("adjectival noun"): label = "形容动词（な形）"
        elif tag.startswith("adjective (keiyoushi)"): label = "形容词（い形）"
        elif tag.startswith("adverb"): label = "副词"
        elif tag == "pronoun": label = "代词"
        elif tag == "conjunction": label = "接续词"
        elif tag.startswith("noun"): label = "名词"
        elif tag == "interjection (kandoushi)": label = "感叹词"
        elif tag == "particle": label = "助词"
        elif tag == "counter": label = "量词"
        elif tag == "numeric": label = "数词"
        elif tag == "prefix": label = "接头词"
        elif tag == "suffix": label = "接尾词"
        elif tag.startswith("expressions"): label = "表达"
        elif tag == "pre-noun adjectival (rentaishi)": label = "连体词"
        elif tag == "auxiliary verb": label = "助动词"
        elif "adjective" in tag: label = "形容词"
        elif tag == "auxiliary": label = "助词"
        else: continue
        for item in label.split("/"):
            if item not in labels: labels.append(item)
    return "/".join(labels) or "其他"


def build(db: sqlite3.Connection) -> tuple[list[dict], dict]:
    rows = db.execute("""
        SELECT e.id, v.level, e.data, z.data, COALESCE(f.rank, 999999999)
        FROM vocab_jlpt AS v JOIN entries AS e ON e.id = v.entry_id
        JOIN zh_defs AS z ON z.entry_id = e.id AND z.locale = 'zh-CN'
        LEFT JOIN freq_rank AS f ON f.entry_id = e.id
        WHERE v.level IN ('N5', 'N4', 'N3', 'N2', 'N1')
        ORDER BY v.level DESC, COALESCE(f.rank, 999999999), CAST(e.id AS INTEGER)
    """).fetchall()
    excluded: Counter = Counter()
    excluded_senses: Counter = Counter()
    seen: set[tuple[str, str]] = set()
    output: list[dict] = []
    for entry_id, level, raw_entry, raw_zh, _rank in rows:
        entry, zh = json.loads(raw_entry), json.loads(raw_zh)
        senses: list[tuple[dict, str]] = []
        for index, sense in enumerate(entry["senses"]):
            if set(sense.get("misc", [])) & BAD_SENSE_TAGS:
                excluded_senses["dated_rare_derogatory_or_sensitive_tag"] += 1
                continue
            translations = zh.get("senses", {}).get(str(index), {}).get("glosses", [])
            glosses = list(dict.fromkeys(g["text"].strip() for g in translations if isinstance(g.get("text"), str) and g["text"].strip()))
            chinese = "；".join(glosses)
            english = " ".join(g.get("text", "") for g in sense.get("glosses", []) if g.get("lang") == "eng")
            if not chinese or not CHINESE.search(chinese):
                excluded_senses["missing_chinese_gloss"] += 1
                continue
            if ADULT_EN.search(english) or ADULT_ZH.search(chinese):
                excluded_senses["adult_gloss"] += 1
                continue
            senses.append((sense, chinese))
        if not senses:
            excluded["no_eligible_chinese_sense"] += 1
            continue
        # Choose one common/main reading and a spelling compatible with its
        # form restriction. This snapshot lacks per-sense reading restrictions,
        # so this does not prove that every polysemous reading was disambiguated.
        kana = [form for form in entry["kana"] if normal_form(form) and KANA.fullmatch(form["text"])]
        kana.sort(key=lambda form: not bool(form.get("priority")))
        if not kana:
            excluded["no_regular_kana_reading"] += 1
            continue
        reading_form = kana[0]
        reading = unicodedata.normalize("NFKC", reading_form["text"])
        allowed = reading_form.get("restricted_to", [])
        kanji = [form for form in entry["kanji"] if normal_form(form) and (not allowed or form["text"] in allowed)]
        kanji.sort(key=lambda form: not bool(form.get("priority")))
        primary_senses = senses[:2]
        kana_preferred = "word usually written using kana alone" in primary_senses[0][0].get("misc", [])
        surface = reading if kana_preferred or not kanji else kanji[0]["text"]
        key = (unicodedata.normalize("NFKC", surface), reading)
        if key in seen:
            excluded["duplicate_surface_and_reading"] += 1
            continue
        seen.add(key)
        meanings = list(dict.fromkeys(text for _, text in primary_senses))
        meaning = MEANING_OVERRIDES.get(entry_id, " / ".join(meanings))
        tags = list(dict.fromkeys(tag for sense, _ in primary_senses for tag in sense.get("pos", [])))
        stable_suffix = hashlib.sha256((surface + "\0" + reading).encode()).hexdigest()[:8]
        output.append({
            "id": f"tomoshi_{entry_id}_{stable_suffix}", "kanji": surface, "reading": reading,
            "meaning": meaning, "partOfSpeech": pos_label(tags), "level": level,
            "sourceId": entry_id,
        })
    return output, {
        "joinedEntries": len(rows), "importedEntries": len(output),
        "byLevel": dict(sorted(Counter(word["level"] for word in output).items(), reverse=True)),
        "excludedEntries": dict(sorted(excluded.items())),
        "excludedSenses": dict(sorted(excluded_senses.items())),
        "sensePolicy": "One canonical spelling/reading per source entry; first two eligible Chinese senses; variants are not counted as extra vocabulary.",
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source-dir", type=Path, required=True)
    parser.add_argument("--check", action="store_true", help="Verify checked-in output without modifying it")
    args = parser.parse_args()
    root = Path(__file__).resolve().parents[1]
    database = args.source_dir / "tomoshi-dict-open.db"
    if sha256(database) != DATABASE_SHA256:
        raise SystemExit("Source database hash mismatch; refusing an unreviewed snapshot")
    compressed = args.source_dir / "tomoshi-dict-open.db.zst"
    if compressed.exists() and sha256(compressed) != COMPRESSED_SHA256:
        raise SystemExit("Compressed source hash mismatch")
    with sqlite3.connect(f"file:{database.resolve()}?mode=ro", uri=True) as db:
        table_licenses = [dict(zip(("table", "license", "sourceDatabase", "attribution"), row))
                          for row in db.execute("SELECT * FROM table_licenses ORDER BY table_name") if row[0] in TABLES]
        assert len(table_licenses) == len(TABLES)
        assert all(row["license"] == "CC-BY-SA-4.0" for row in table_licenses)
        words, counts = build(db)
    assert len(words) >= 1000, "Unexpectedly small corpus"
    payload = ("[\n" + ",\n".join(json.dumps(word, ensure_ascii=False, separators=(",", ":")) for word in words) + "\n]\n").encode()
    metadata = {
        "name": "NihongoMate derived Japanese–Chinese learning vocabulary",
        "source": "Tomoshi (Y1Z), with JMdict (EDRDG) and Jonathan Waller / yomitan-jlpt-vocab",
        "repository": REPOSITORY, "release": RELEASE, "sourceCommit": COMMIT,
        "archiveUrl": f"{REPOSITORY}/releases/download/{RELEASE}/tomoshi-dict-open.db.zst",
        "archiveSha256": COMPRESSED_SHA256, "databaseSha256": DATABASE_SHA256,
        "derivedSha256": hashlib.sha256(payload).hexdigest(),
        "license": "CC-BY-SA-4.0", "licenseUrl": LICENSE_URL,
        "modifications": "Filtered to community JLPT-tagged entries with eligible Chinese senses, selected canonical spelling/reading, excluded dated/sensitive senses, limited to two senses, translated POS labels, deduplicated and converted to app JSON. Two sampled meanings were narrowed to their common teaching senses. Examples and audio were not imported.",
        "meaningOverrides": MEANING_OVERRIDES,
        "accuracyNotice": "Chinese glosses in the upstream dataset were produced with LLM assistance and reviewed by a separate model. Structural checks and sampling do not constitute complete human teacher review.",
        "levelNotice": "N1–N5 are community learning estimates, not official complete JLPT lists.",
        "tableLicenses": table_licenses, "counts": counts,
    }
    outputs = {
        root / "src/data/importedVocabulary.json": payload,
        root / "public/data/vocabulary-source.json": payload,
        root / "public/licenses/vocabulary-source-manifest.json": (json.dumps(metadata, ensure_ascii=False, indent=2) + "\n").encode(),
    }
    for target, data in outputs.items():
        if args.check:
            assert target.read_bytes() == data, f"Derived artifact mismatch: {target}"
        else:
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes(data)
    if not args.check:
        license_dir = root / "public/licenses"
        for name in ("LICENSE.md", "NOTICE.md", "README.md"):
            shutil.copyfile(args.source_dir / name, license_dir / ("tomoshi-" + name))
    print(json.dumps({**counts, "derivedSha256": metadata["derivedSha256"], "bytes": len(payload), "check": args.check}, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
