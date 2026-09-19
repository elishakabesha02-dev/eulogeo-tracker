"""
EBB International - emblem asset preparation.

The source logo is NEVER redrawn, recoloured or restyled.  It is only
*separated* from its backdrop into two layers:

    face   RGBA - the solid medallion (everything inside the chrome ring)
    halo   RGB  - the blue neon bloom that spills outside the ring, keyed off
                  the dark backdrop so it can be composited additively

plus a synthetic, radially-symmetric *back plate* used while the medallion is
turned away from camera (a machined chrome reverse - deliberately text-free so
the EBB wordmark is never seen mirrored).  The outer chrome ring band of the
back plate is the source ring itself, so the rim reads as one continuous piece
of metal all the way through the spin.
"""
from __future__ import annotations

import numpy as np
from PIL import Image

from ebb_core import F32, smoothstep, ValueNoise3D

# geometry measured from the supplied artwork (assets/ebb_logo_source.png)
SRC_CX, SRC_CY = 624.0, 609.0      # centre of the circular emblem
SRC_R = 556.0                      # outer edge of the chrome ring
CROP_HALF = 648.0                  # crop reaches past the ring to keep the glow

TEX = 1024                         # working texture resolution (square)
TEX_HALF = TEX * 0.5
R_TEX = SRC_R * (TEX / (2.0 * CROP_HALF))       # ring radius in texture pixels
R_NORM = R_TEX / TEX_HALF                       # ring radius as fraction of half-tex


def _load_crop(path):
    im = Image.open(path).convert('RGB')
    a = np.asarray(im).astype(F32) / 255.0
    h, w, _ = a.shape
    x0 = int(round(SRC_CX - CROP_HALF)); x1 = int(round(SRC_CX + CROP_HALF))
    y0 = int(round(SRC_CY - CROP_HALF)); y1 = int(round(SRC_CY + CROP_HALF))
    px0, py0 = max(0, -x0), max(0, -y0)
    px1, py1 = max(0, x1 - w), max(0, y1 - h)
    sub = a[max(0, y0):min(h, y1), max(0, x0):min(w, x1)]
    if px0 or px1 or py0 or py1:
        sub = np.pad(sub, ((py0, py1), (px0, px1), (0, 0)), mode='edge')
    img = Image.fromarray((np.clip(sub, 0, 1) * 255.0 + 0.5).astype(np.uint8))
    img = img.resize((TEX, TEX), Image.LANCZOS)
    return np.asarray(img).astype(F32) / 255.0


def _radius_grid(n=TEX):
    y, x = np.mgrid[0:n, 0:n].astype(F32)
    c = (n - 1) * 0.5
    r = np.sqrt((x - c) ** 2 + (y - c) ** 2)
    phi = np.arctan2(y - c, x - c)
    return r, phi


def build_face(path):
    """Returns (face_rgba, halo_rgb, r_px, phi) all at TEX x TEX."""
    rgb = _load_crop(path)
    r, phi = _radius_grid()

    # --- solid medallion ------------------------------------------------
    alpha = 1.0 - smoothstep(R_TEX + 1.0, R_TEX + 6.0, r)

    # --- keyed neon spill outside the ring ------------------------------
    outside = smoothstep(R_TEX + 1.0, R_TEX + 9.0, r)
    falloff = 1.0 - smoothstep(R_TEX + 8.0, TEX_HALF - 6.0, r)
    lum = rgb.max(axis=2)
    key = smoothstep(0.045, 0.30, lum)          # drop the flat dark backdrop
    halo = rgb * (outside * falloff * key)[..., None]

    face = np.dstack([rgb, alpha]).astype(F32)
    return face, halo.astype(F32), r, phi


def build_back(face, halo, r, phi, seed=21):
    """Machined chrome reverse. Radially symmetric -> no mirrored lettering."""
    n = ValueNoise3D(96, 96, 4, seed)
    rn = r / R_TEX                                   # 1.0 == outer ring edge

    # brushed radial grain + fine concentric machining
    ang = (phi + np.pi) / (2 * np.pi) * 96.0
    grain = n(ang, rn * 26.0, np.zeros_like(rn))
    rings = 0.5 + 0.5 * np.cos(rn * 150.0)
    sheen = np.exp(-((phi + 2.35) / 0.55) ** 2) + 0.6 * np.exp(-((phi - 0.75) / 0.42) ** 2)
    micro = 0.5 + 0.5 * np.cos(rn * 610.0)

    # dark chrome body with a vertical studio-light gradient
    y = (np.mgrid[0:TEX, 0:TEX][0].astype(F32) - TEX_HALF) / TEX_HALF
    lightfall = np.clip(0.52 - 0.40 * y, 0.06, 1.0)
    base = (0.050 + 0.26 * lightfall + 0.115 * grain + 0.030 * rings
            + 0.022 * micro + 0.22 * sheen * lightfall)

    plate = np.dstack([base * 0.66, base * 0.79, base * 1.0]).astype(F32)

    # raised concentric steps echoing the front bezel
    for rr, wdt, amp in ((0.965, 0.022, 0.45), (0.905, 0.016, 0.30), (0.842, 0.012, 0.22)):
        band = np.exp(-((rn - rr) / wdt) ** 2)
        plate += band[..., None] * np.array([0.30, 0.36, 0.44], F32) * amp

    # etched blue circuitry on the reverse
    spokes = np.abs(np.cos(phi * 12.0)) ** 90
    etch = spokes * smoothstep(0.30, 0.42, rn) * (1.0 - smoothstep(0.74, 0.82, rn))
    for rr, wdt in ((0.70, 0.006), (0.44, 0.005), (0.30, 0.004)):
        etch = np.maximum(etch, np.exp(-((rn - rr) / wdt) ** 2) * 0.9)
    plate += etch[..., None] * np.array([0.05, 0.42, 1.00], F32) * 0.30

    # glowing core
    core = np.exp(-(rn / 0.135) ** 2)
    plate += core[..., None] * np.array([0.30, 0.72, 1.00], F32) * 0.85
    plate += np.exp(-(rn / 0.045) ** 2)[..., None] * np.array([0.85, 0.97, 1.00], F32) * 0.9

    # keep the genuine chrome ring band from the artwork (mirrored) so the
    # outer bezel is continuous front-to-back through the spin
    keep = smoothstep(0.855, 0.885, rn)
    src_ring = face[:, ::-1, :3]
    plate = plate * (1.0 - keep[..., None]) + src_ring * keep[..., None]

    back = np.dstack([plate, face[..., 3]]).astype(F32)
    return back, (halo[:, ::-1] * 0.92).astype(F32)


def pack(face, halo):
    """7-channel stack: [R,G,B,A, haloR,haloG,haloB] for a single warp pass."""
    return np.ascontiguousarray(np.dstack([face, halo]).astype(F32))
