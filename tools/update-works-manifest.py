from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
WORKS_DIR = ROOT / "works"
MANIFEST = ROOT / "works-manifest.js"
EXTENSIONS = {".png", ".jpg", ".jpeg", ".webp", ".gif", ".avif"}


def natural_key(path: Path) -> list[object]:
    relative = path.relative_to(ROOT).as_posix().casefold()
    return [int(part) if part.isdigit() else part for part in re.split(r"(\d+)", relative)]


def main() -> None:
    WORKS_DIR.mkdir(exist_ok=True)
    files = sorted(
        (path for path in WORKS_DIR.rglob("*") if path.is_file() and path.suffix.casefold() in EXTENSIONS),
        key=natural_key,
        reverse=True,
    )
    paths = [path.relative_to(ROOT).as_posix() for path in files]
    content = "window.KA256_WORKS = " + json.dumps(paths, ensure_ascii=False, indent=2) + ";\n"
    MANIFEST.write_text(content, encoding="utf-8")
    print(f"Updated {MANIFEST.name}: {len(paths)} work(s)")


if __name__ == "__main__":
    main()
