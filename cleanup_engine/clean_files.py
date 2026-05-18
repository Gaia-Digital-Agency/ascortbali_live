#!/usr/bin/env python3
"""
Run watermark removal on one or more local image files.

Unlike remove_watermark.py (which reads image_output.json + downloads URLs),
this wrapper takes file paths directly so ad-hoc cleanup is one command.

Usage:
    .venv/bin/python clean_files.py <out_dir> <img1> [img2 ...]

Outputs each cleaned image as <out_dir>/<basename>.<ext>.
Debug masks land in <out_dir>/debug/.
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from remove_watermark import remove_watermark_lama


def main():
    if len(sys.argv) < 3:
        print("Usage: clean_files.py <out_dir> <img1> [img2 ...]", file=sys.stderr)
        return 2

    out_dir = sys.argv[1]
    inputs = sys.argv[2:]

    debug_dir = os.path.join(out_dir, "debug")
    os.makedirs(out_dir, exist_ok=True)
    os.makedirs(debug_dir, exist_ok=True)

    failures = 0
    for inp in inputs:
        name = os.path.basename(inp)
        out_path = os.path.join(out_dir, name)
        print(f"=== {name} ===")
        try:
            ok = remove_watermark_lama(inp, out_path, debug_dir)
            if not ok:
                failures += 1
        except Exception as e:
            print(f"  FAIL: {e}")
            failures += 1
        print()

    return 1 if failures else 0


if __name__ == "__main__":
    raise SystemExit(main())
