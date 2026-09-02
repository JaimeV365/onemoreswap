"""Extract PNG from GIMP SVG and trace to a simplified SVG path."""
import base64
import re
from pathlib import Path

import cv2
import numpy as np

ROOT = Path(__file__).resolve().parent
SVG_IN = ROOT / "S one piece.svg"
PNG_OUT = ROOT / "S-one-piece-extracted.png"
SVG_OUT = ROOT / "wordmark-s-traced.svg"


def extract_png() -> Path:
    text = SVG_IN.read_text(encoding="utf-8")
    match = re.search(r"href=\"data:image/png;base64,([^\"]+)\"", text)
    if not match:
        raise SystemExit("No embedded PNG found in SVG")
    PNG_OUT.write_bytes(base64.b64decode(match.group(1)))
    return PNG_OUT


def contour_to_path(contour: np.ndarray, epsilon_ratio: float = 0.002) -> str:
    peri = cv2.arcLength(contour, True)
    approx = cv2.approxPolyDP(contour, epsilon_ratio * peri, True)
    parts = []
    for i, pt in enumerate(approx):
        x, y = int(pt[0][0]), int(pt[0][1])
        parts.append(f"{'M' if i == 0 else 'L'} {x},{y}")
    parts.append("Z")
    return " ".join(parts)


def trace_png(png_path: Path) -> str:
    img = cv2.imread(str(png_path), cv2.IMREAD_UNCHANGED)
    if img is None:
        raise SystemExit(f"Could not read {png_path}")

    if img.shape[2] == 4:
        alpha = img[:, :, 3]
        _, mask = cv2.threshold(alpha, 10, 255, cv2.THRESH_BINARY)
    else:
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        _, mask = cv2.threshold(gray, 250, 255, cv2.THRESH_BINARY_INV)

    # Upscale + slight blur helps smooth jagged text/arrow edges before trace
    scale = 4
    mask = cv2.resize(mask, None, fx=scale, fy=scale, interpolation=cv2.INTER_LINEAR)
    mask = cv2.GaussianBlur(mask, (5, 5), 0)
    _, mask = cv2.threshold(mask, 127, 255, cv2.THRESH_BINARY)

    contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
    if not contours:
        raise SystemExit("No contours found")

    main = max(contours, key=cv2.contourArea)
    main = main / scale  # back to original coordinates

    best = None
    for ratio in (0.003, 0.004, 0.005, 0.006, 0.008, 0.01, 0.012):
        path = contour_to_path(main.astype(np.int32), ratio)
        pts = path.count("L") + 1
        if 16 <= pts <= 48:
            best = path
            break
        if best is None or abs(pts - 28) < abs(best.count("L") + 1 - 28):
            best = path

    h, w = img.shape[:2]
    return f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" fill="none">
  <path fill="currentColor" d="{best}"/>
</svg>
"""


def main() -> None:
    png = extract_png()
    print(f"Extracted {png} ({png.stat().st_size} bytes)")
    svg = trace_png(png)
    SVG_OUT.write_text(svg, encoding="utf-8")
    print(f"Wrote {SVG_OUT}")
    # Print path only for easy copy
    d_match = re.search(r'd="([^"]+)"', svg)
    if d_match:
        print("\nPath d attribute:\n", d_match.group(1))


if __name__ == "__main__":
    main()
