#!/usr/bin/env python3
"""Turn a phone photo into a small, privacy-safe web image for a child's card.

- applies the EXIF rotation, then drops ALL metadata (EXIF, GPS, XMP, camera info)
- converts wide-gamut (Display P3) photos to sRGB so colors stay true in browsers
- crops to a 4:5 portrait box and resizes to 1200 px tall
- writes both <name>.webp and <name>.jpg into assets/photos/

Usage:
    pip install pillow
    python3 tools/optimize_photo.py path/to/alisa.jpg alisa
    python3 tools/optimize_photo.py path/to/alisa.jpg alisa --box 0.10 0.08 0.90 0.80

--box takes left, top, right, bottom as fractions (0..1) of the upright photo.
The box is widened or narrowed around its center to keep a 4:5 ratio.
Without --box the largest centered 4:5 crop is used.
"""

import argparse
import io
from pathlib import Path

from PIL import Image, ImageCms, ImageOps

ROOT = Path(__file__).resolve().parent.parent
OUT_DIR = ROOT / "assets" / "photos"
ASPECT = 4 / 5
TARGET_HEIGHT = 1200


def to_srgb(img: Image.Image) -> Image.Image:
    icc = img.info.get("icc_profile")
    img = img.convert("RGB")
    if not icc:
        return img
    src = ImageCms.ImageCmsProfile(io.BytesIO(icc))
    dst = ImageCms.createProfile("sRGB")
    return ImageCms.profileToProfile(img, src, dst, outputMode="RGB")


def crop_box(w: int, h: int, box):
    if box is None:
        box = (0.0, 0.0, 1.0, 1.0)
    l, t, r, b = box[0] * w, box[1] * h, box[2] * w, box[3] * h
    cx, cy = (l + r) / 2, (t + b) / 2
    bh = b - t
    bw = bh * ASPECT
    if bw > w:
        bw, bh = w, w / ASPECT
    if bh > h:
        bh, bw = h, h * ASPECT
    left = min(max(cx - bw / 2, 0), w - bw)
    top = min(max(cy - bh / 2, 0), h - bh)
    return round(left), round(top), round(left + bw), round(top + bh)


def main():
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("src")
    p.add_argument("name", help="output base name, e.g. vera or alisa")
    p.add_argument("--box", nargs=4, type=float, metavar=("L", "T", "R", "B"))
    args = p.parse_args()

    img = Image.open(args.src)
    img = ImageOps.exif_transpose(img)
    img = to_srgb(img)
    img = img.crop(crop_box(img.width, img.height, args.box))
    if img.height > TARGET_HEIGHT:
        img = img.resize((round(TARGET_HEIGHT * ASPECT), TARGET_HEIGHT), Image.LANCZOS)

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    # Rebuild from raw pixels so no EXIF/GPS/XMP/ICC block can ride along.
    clean = Image.frombytes("RGB", img.size, img.tobytes())

    webp = OUT_DIR / f"{args.name}.webp"
    jpg = OUT_DIR / f"{args.name}.jpg"
    clean.save(webp, "WEBP", quality=80, method=6)
    clean.save(jpg, "JPEG", quality=80, optimize=True, progressive=True)
    for f in (webp, jpg):
        print(f"{f.relative_to(ROOT)}  {clean.width}x{clean.height}  {f.stat().st_size // 1024} KB")


if __name__ == "__main__":
    main()
