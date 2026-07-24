#!/usr/bin/env python3
"""Prepare a local BodyParts3D mesh package for Anatopedia.

Default: downloads a practical core atlas for faster browsing.
Use --all only if you have substantial disk space and bandwidth.
The source data remains CC BY-SA; preserve THIRD_PARTY_NOTICES.md.
"""
from __future__ import annotations

import argparse
import concurrent.futures
import json
import pathlib
import re
import sys
import urllib.error
import urllib.request

DATA_ROOT = "https://raw.githubusercontent.com/Kevin-Mattheus-Moerman/BodyParts3D/f0eeb6e843380cfe6b83797cf8c3e1af74de5e61/assets/BodyParts3D_data"
CATALOG_URL = f"{DATA_ROOT}/parts_list_e.txt"
MODEL_BASE = f"{DATA_ROOT}/stl"

LIMITS = {
    "skin": 1,
    "soft": 18,
    "skeleton": 110,
    "cartilage": 42,
    "muscle": 82,
    "organ": 30,
    "artery": 48,
    "vein": 48,
    "nerve": 58,
    "lymph": 24,
}


def classify(name: str) -> str | None:
    n = name.lower().strip()
    if n == "skin" or "skin of " in n:
        return "skin"
    if re.search(r"(adipose|fat pad|fat$|fascia|subcutaneous tissue)", n) and not re.search(r"(organ|system|set of)", n):
        return "soft"
    if re.search(r"(artery)$", n) and not re.search(r"(branch|wall|segment|set of|organ)", n):
        return "artery"
    if re.search(r"(vein)$", n) and not re.search(r"(tributary|wall|segment|set of|organ)", n):
        return "vein"
    if re.search(r"(nerve$|nerve root$|plexus$)", n) and not re.search(r"(organ|segment|set of|fiber|nucleus)", n):
        return "nerve"
    if re.search(r"(lymph node$|lymphatic vessel$|thoracic duct$|cisterna chyli$)", n):
        return "lymph"
    if re.search(r"(cartilage|meniscus|intervertebral disc|ligament$|labrum$)", n) and not re.search(r"(organ|part of|set of)", n):
        return "cartilage"
    if re.search(r"(muscle|tendon|aponeurosis)", n) and not re.search(r"(layer|system|organ|tissue|group|set of)", n):
        return "muscle"
    if re.search(r"(^| )(bone|vertebra|rib|sternum|scapula|clavicle|humerus|radius|ulna|carpal|metacarpal|phalanx|femur|tibia|fibula|patella|talus|calcaneus|navicular|cuboid|cuneiform|metatarsal|sacrum|coccyx|mandible|maxilla|skull|hip bone|pelvic bone)( |$)", n) and not re.search(r"(marrow|surface|organ|cartilage|joint|ligament|muscle|artery|vein|nerve)", n):
        return "skeleton"
    if re.search(r"(brain$|heart$|lung$|liver$|stomach$|spleen$|pancreas$|kidney$|urinary bladder$|gallbladder$|small intestine$|large intestine$|esophagus$|trachea$|thyroid gland$|prostate$|uterus$|ovary$|testis$|adrenal gland$)", n) and not re.search(r"(wall|surface|segment|lobe|artery|vein|nerve|duct|part of)", n):
        return "organ"
    return None


def score(name: str, system: str) -> tuple[int, int]:
    n = name.lower()
    value = len(n)
    if n.startswith(("right ", "left ")):
        value -= 14
    if re.search(r"(part of|segment|wall|surface|organ|set of|group|layer)", n):
        value += 80
    priority = {
        "skeleton": r"(femur|tibia|fibula|humerus|radius|ulna|rib|vertebra|scapula|clavicle|hip bone|sacrum|sternum|mandible)",
        "muscle": r"(deltoid|biceps|triceps|gluteus|quadriceps|gastrocnemius|soleus|pectoralis|latissimus|trapezius|rectus abdominis|oblique)",
        "nerve": r"(sciatic|femoral|median|ulnar|radial|tibial|fibular|vagus|trigeminal|facial|optic)",
        "artery": r"(aorta|carotid|subclavian|axillary|brachial|radial|ulnar|iliac|femoral|popliteal|tibial)",
        "vein": r"(vena cava|jugular|subclavian|axillary|brachial|cephalic|basilic|iliac|femoral|saphenous|popliteal)",
    }.get(system)
    if priority and re.search(priority, n):
        value -= 45
    return value, len(n)


def fetch_catalog() -> list[dict[str, str]]:
    print("Anatomi kataloğu indiriliyor…")
    with urllib.request.urlopen(CATALOG_URL, timeout=60) as response:
        text = response.read().decode("utf-8")
    rows: list[dict[str, str]] = []
    for line in text.splitlines()[1:]:
        parts = line.strip().split("\t")
        if len(parts) >= 2 and re.fullmatch(r"FMA\d+", parts[0]):
            rows.append({"id": parts[0], "name": " ".join(parts[1:]).strip()})
    return rows


def choose_core(rows: list[dict[str, str]]) -> list[dict[str, str]]:
    groups: dict[str, list[dict[str, str]]] = {key: [] for key in LIMITS}
    for row in rows:
        system = classify(row["name"])
        if system:
            row = {**row, "system": system}
            groups[system].append(row)
    chosen: list[dict[str, str]] = []
    for system, limit in LIMITS.items():
        group = sorted(groups[system], key=lambda row: score(row["name"], system))[:limit]
        chosen.extend(group)
        print(f"{system:10s}: {len(group)}")
    return list({row["id"]: row for row in chosen}.values())


def download_one(row: dict[str, str], output: pathlib.Path, overwrite: bool) -> tuple[str, bool, str]:
    destination = output / f"{row['id']}.stl"
    if destination.exists() and destination.stat().st_size > 100 and not overwrite:
        return row["id"], True, "cached"
    try:
        with urllib.request.urlopen(f"{MODEL_BASE}/{row['id']}.stl", timeout=120) as response:
            data = response.read()
        if len(data) < 100:
            return row["id"], False, "empty"
        destination.write_bytes(data)
        return row["id"], True, f"{len(data) / 1024 / 1024:.1f} MB"
    except (urllib.error.URLError, urllib.error.HTTPError, TimeoutError) as exc:
        return row["id"], False, str(exc)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--all", action="store_true", help="Attempt every catalog mesh; can be very large")
    parser.add_argument("--output", default="models/stl")
    parser.add_argument("--workers", type=int, default=8)
    parser.add_argument("--overwrite", action="store_true")
    args = parser.parse_args()

    root = pathlib.Path(__file__).resolve().parents[1]
    output = (root / args.output).resolve()
    output.mkdir(parents=True, exist_ok=True)

    rows = fetch_catalog()
    selected = rows if args.all else choose_core(rows)
    print(f"Toplam {len(selected)} mesh hazırlanacak. Hedef: {output}")

    ok_ids: list[str] = []
    failures = 0
    with concurrent.futures.ThreadPoolExecutor(max_workers=max(1, min(args.workers, 16))) as pool:
        futures = {pool.submit(download_one, row, output, args.overwrite): row for row in selected}
        for index, future in enumerate(concurrent.futures.as_completed(futures), 1):
            fma_id, ok, detail = future.result()
            if ok:
                ok_ids.append(fma_id)
            else:
                failures += 1
            print(f"[{index:4d}/{len(selected)}] {fma_id}: {'OK' if ok else 'FAIL'} {detail}")

    manifest = {
        "version": 1,
        "mode": "all" if args.all else "core",
        "ids": sorted(ok_ids),
        "failed": failures,
        "source": "BodyParts3D / DBCLS",
        "license": "CC BY-SA 2.1 Japan",
    }
    (output / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Hazır: {len(ok_ids)} mesh, başarısız: {failures}")
    return 0 if ok_ids else 1


if __name__ == "__main__":
    raise SystemExit(main())
