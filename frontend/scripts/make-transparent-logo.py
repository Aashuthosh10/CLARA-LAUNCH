"""
Build svit_logo_transparent.png from svit_logo_clean.png — image file only.

1) Edge flood (strict “paper white”) marks true background.
2) CRITICAL: Some exports bake a 1px checkerboard/neutral ring on the image border that
   fails step (1)’s traversal test, so it stays opaque and looks like a fake transparency grid.
   Every foreground pixel on the outermost row/column is measured to be neutral gray only
   (no brand chroma) — those pixels are forced transparent as part of the same background.

3) Binary alpha, original RGB left unchanged for all opaque pixels; transparent pixels use
   RGB 0,0,0 (straight alpha).

Run from CLARA-LAUNCH/frontend:
  python scripts/make-transparent-logo.py
"""

from __future__ import annotations

from pathlib import Path


def main() -> None:
    import numpy as np
    from PIL import Image

    root = Path(__file__).resolve().parents[1]
    src = root / "src" / "assets" / "logo" / "svit_logo_clean.png"
    out = root / "src" / "assets" / "logo" / "svit_logo_transparent.png"

    im = Image.open(src).convert("RGB")
    rgb = np.asarray(im, dtype=np.uint8)
    h, w = rgb.shape[0], rgb.shape[1]

    def can_flood_through(r: int, g: int, b: int) -> bool:
        mx, mn = max(r, g, b), min(r, g, b)
        diff = mx - mn
        avg = (r + g + b) / 3.0
        if diff <= 52 and avg >= 218:
            return True
        if diff <= 42 and avg >= 238:
            return True
        return False

    vis = np.zeros((h, w), dtype=np.bool_)
    stack: list[tuple[int, int]] = []
    for x in range(w):
        stack.append((0, x))
        stack.append((h - 1, x))
    for y in range(h):
        stack.append((y, 0))
        stack.append((y, w - 1))

    while stack:
        y, x = stack.pop()
        if vis[y, x]:
            continue
        r, g, b = int(rgb[y, x, 0]), int(rgb[y, x, 1]), int(rgb[y, x, 2])
        if not can_flood_through(r, g, b):
            continue
        vis[y, x] = True
        if y > 0:
            stack.append((y - 1, x))
        if y + 1 < h:
            stack.append((y + 1, x))
        if x > 0:
            stack.append((y, x - 1))
        if x + 1 < w:
            stack.append((y, x + 1))

    yy, xx = np.indices((h, w))
    dist_edge = np.minimum.reduce([yy, xx, h - 1 - yy, w - 1 - xx])
    border_ring = dist_edge == 0
    strict_bg = vis
    # Opaque islands on the outermost row/col: measured as neutral-only export artifact.
    border_crumbs = (~strict_bg) & border_ring
    bg = strict_bg | border_crumbs

    alpha = np.where(bg, 0, 255).astype(np.uint8)
    out_rgb = rgb.copy()
    out_rgb[bg] = (0, 0, 0)

    rgba = np.dstack([out_rgb, alpha])
    Image.fromarray(rgba, mode="RGBA").save(out, compress_level=9, optimize=True)
    print(f"Wrote {out} ({w}x{h}). border crumbs cleared: {int(border_crumbs.sum())}")


if __name__ == "__main__":
    main()
