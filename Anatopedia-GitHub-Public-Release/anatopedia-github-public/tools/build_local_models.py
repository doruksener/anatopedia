#!/usr/bin/env python3
"""Download selected BodyParts3D STL files for local hosting.

Usage:
    python tools/build_local_models.py FMA24474 FMA24475 FMA24476

The script does not change the model license. Preserve attribution and
share-alike requirements described in ../LICENSES.md.
"""
from __future__ import annotations

import argparse
import pathlib
import sys
import urllib.error
import urllib.request

BASE = "https://raw.githubusercontent.com/Kevin-Mattheus-Moerman/BodyParts3D/f0eeb6e843380cfe6b83797cf8c3e1af74de5e61/assets/BodyParts3D_data/stl"


def download(fma_id: str, output_dir: pathlib.Path) -> bool:
    clean_id = fma_id.strip().upper()
    if not clean_id.startswith("FMA") or not clean_id[3:].isdigit():
        print(f"skip invalid id: {fma_id}", file=sys.stderr)
        return False
    url = f"{BASE}/{clean_id}.stl"
    destination = output_dir / f"{clean_id}.stl"
    try:
        print(f"download {clean_id} -> {destination}")
        urllib.request.urlretrieve(url, destination)
        return True
    except urllib.error.HTTPError as exc:
        print(f"failed {clean_id}: HTTP {exc.code}", file=sys.stderr)
    except urllib.error.URLError as exc:
        print(f"failed {clean_id}: {exc.reason}", file=sys.stderr)
    return False


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("ids", nargs="+", help="FMA ids, e.g. FMA24474")
    parser.add_argument("--output", default="public/models/stl")
    args = parser.parse_args()
    output_dir = pathlib.Path(args.output)
    output_dir.mkdir(parents=True, exist_ok=True)
    successes = sum(download(value, output_dir) for value in args.ids)
    print(f"downloaded {successes}/{len(args.ids)}")
    return 0 if successes else 1


if __name__ == "__main__":
    raise SystemExit(main())
