"""Download pinned, self-hosted site dependencies from their publishers.

The website itself needs no package manager or network connection.
Run this script only when deliberately refreshing the checked-in dependencies.
"""
from __future__ import annotations

import hashlib
import json
import re
from pathlib import Path

import requests


ROOT = Path(__file__).resolve().parents[1]
SESSION = requests.Session()
SESSION.headers["User-Agent"] = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36"
)


def download(url: str, destination: Path) -> dict[str, str]:
    response = SESSION.get(url, timeout=60)
    response.raise_for_status()
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_bytes(response.content)
    return {
        "file": destination.relative_to(ROOT).as_posix(),
        "source": url,
        "sha256": hashlib.sha256(response.content).hexdigest(),
    }


def main() -> None:
    records = []
    vendor = ROOT / "assets" / "vendor"
    bootstrap_root = "https://raw.githubusercontent.com/twbs/bootstrap/v5.3.8/"
    for source, name in (
        ("dist/css/bootstrap.min.css", "bootstrap.min.css"),
        ("dist/js/bootstrap.bundle.min.js", "bootstrap.bundle.min.js"),
        ("LICENSE", "LICENSE-bootstrap.txt"),
    ):
        records.append(download(bootstrap_root + source, vendor / name))

    fonts = ROOT / "assets" / "fonts"
    css_parts = [
        "/* Self-hosted Google Fonts: Space Grotesk and DM Sans, SIL OFL 1.1. */",
        "/* Variable fonts cover weights 400 through 700. Latin subset. */",
    ]
    for family, slug, google_folder in (
        ("Space Grotesk", "space-grotesk", "spacegrotesk"),
        ("DM Sans", "dm-sans", "dmsans"),
    ):
        css_url = (
            "https://fonts.googleapis.com/css2?family="
            + family.replace(" ", "+")
            + ":wght@400..700&display=swap"
        )
        response = SESSION.get(css_url, timeout=60)
        response.raise_for_status()
        candidates = re.findall(r"/\* latin \*/\s*(@font-face\s*\{.*?\})", response.text, re.S)
        if len(candidates) != 1:
            raise RuntimeError(f"Expected one variable latin font for {family}, got {len(candidates)}")
        block = candidates[0]
        match = re.search(r"url\((https://fonts\.gstatic\.com/[^)]+\.woff2)\)", block)
        if not match:
            raise RuntimeError(f"Google Fonts did not return WOFF2 for {family}")
        filename = slug + "-latin-variable.woff2"
        records.append(download(match.group(1), fonts / filename))
        css_parts.append(block.replace(match.group(1), "./" + filename))
        records.append(download(
            f"https://raw.githubusercontent.com/google/fonts/main/ofl/{google_folder}/OFL.txt",
            fonts / ("LICENSE-" + slug + ".txt"),
        ))
    (fonts / "fonts.css").write_text("\n\n".join(css_parts) + "\n", encoding="utf-8")
    manifest = ROOT / "assets" / "dependency-manifest.json"
    manifest.write_text(json.dumps(records, indent=2) + "\n", encoding="utf-8")
    print(f"Downloaded {len(records)} licensed dependencies; manifest: {manifest.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
