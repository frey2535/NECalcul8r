#!/usr/bin/env python3
"""Write PWA PNG icons from the NECalcul8r bolt mark. Stdlib only."""
import math
import struct
import zlib
from pathlib import Path

OUT = Path(__file__).resolve().parents[1] / "public"

# Lightning path on a 32x32 canvas, scaled into the icon.
BOLT = [(18, 6), (10, 18), (16, 18), (14, 26), (22, 14), (16, 14)]


def lerp(a, b, t):
    return a + (b - a) * t


def png_chunk(tag, data):
    return struct.pack(">I", len(data)) + tag + data + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)


def write_png(path, size, pixels):
    raw = bytearray()
    for y in range(size):
        raw.append(0)
        raw.extend(pixels[y * size * 4 : (y + 1) * size * 4])
    ihdr = struct.pack(">IIBBBBB", size, size, 8, 6, 0, 0, 0)
    png = b"\x89PNG\r\n\x1a\n" + png_chunk(b"IHDR", ihdr) + png_chunk(b"IDAT", zlib.compress(bytes(raw), 9)) + png_chunk(b"IEND", b"")
    path.write_bytes(png)


def point_in_poly(x, y, poly):
    inside = False
    j = len(poly) - 1
    for i, (xi, yi) in enumerate(poly):
        xj, yj = poly[j]
        if ((yi > y) != (yj > y)) and (x < (xj - xi) * (y - yi) / ((yj - yi) or 1e-9) + xi):
            inside = not inside
        j = i
    return inside


def dist_to_segment(px, py, ax, ay, bx, by):
    dx, dy = bx - ax, by - ay
    if dx == 0 and dy == 0:
        return math.hypot(px - ax, py - ay)
    t = max(0, min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)))
    return math.hypot(px - (ax + t * dx), py - (ay + t * dy))


def render(size):
    pixels = bytearray(size * size * 4)
    pad = size * 0.12
    inner = size - pad * 2
    radius = size * 0.22
    scaled = [(pad + x / 32 * inner, pad + y / 32 * inner) for x, y in BOLT]
    stroke = max(1.2, size * 0.012)

    for y in range(size):
        for x in range(size):
            # rounded-rect mask
            cx = min(max(x + 0.5, radius), size - radius) 
            # distance to rounded rect
            dx = abs(x + 0.5 - size / 2)
            dy = abs(y + 0.5 - size / 2)
            half = size / 2
            # Better rounded rect: if inside axis-aligned inset, or within corner circles
            ix = min(max(x + 0.5, radius), size - radius)
            iy = min(max(y + 0.5, radius), size - radius)
            in_rect = (radius <= x + 0.5 <= size - radius) or (radius <= y + 0.5 <= size - radius)
            in_corner = math.hypot(x + 0.5 - ix, y + 0.5 - iy) <= radius
            inside = in_rect or in_corner
            if not inside and math.hypot(x + 0.5 - ix, y + 0.5 - iy) > radius + 0.6:
                continue
            t = ((x + y) / (2 * (size - 1))) if size > 1 else 0
            r = int(lerp(59, 124, t))
            g = int(lerp(130, 58, t))
            b = int(lerp(246, 237, t))
            px, py = x + 0.5, y + 0.5
            fill = point_in_poly(px, py, scaled)
            edge = min(dist_to_segment(px, py, scaled[i][0], scaled[i][1], scaled[(i + 1) % len(scaled)][0], scaled[(i + 1) % len(scaled)][1]) for i in range(len(scaled)))
            if fill or edge < stroke:
                r, g, b = 255, 255, 255
            i = (y * size + x) * 4
            pixels[i : i + 4] = bytes((r, g, b, 255))
    return pixels


def main():
    OUT.mkdir(exist_ok=True)
    for size in (180, 192, 512):
        name = "apple-touch-icon.png" if size == 180 else f"icon-{size}.png"
        write_png(OUT / name, size, render(size))
        print("wrote", name)


if __name__ == "__main__":
    main()
