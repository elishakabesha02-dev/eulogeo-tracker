#!/usr/bin/env python3
"""
================================================================================
 EBB INTERNATIONAL - CINEMATIC LOGO INTRO / OUTRO
================================================================================

One continuous shot, animated from ONE source artwork.  Nothing about the logo
is redrawn or restyled: the medallion is lifted off its backdrop once, then
driven for the whole 7.4 s by continuous, C2-smooth transforms - a true
perspective Y-axis spin, procedural blue-plasma combustion welded to the bezel,
a particle system with real velocity/drag, and a fragment dissolve.

    0.00-0.50  emergence from darkness
    0.50-3.00  360 deg perspective spin + blue plasma fire
    3.00-3.40  hero stop with damped inertia settle
    3.40-5.50  breathing zoom, calm energy wisps
    5.50-7.00  particle dissolve
    7.00-7.40  black

Usage:
    python3 ebb_logo_animation.py --all          # every deliverable
    python3 ebb_logo_animation.py --preview 3.05 # single frame QC
"""
from __future__ import annotations

import argparse
import math
import os
import subprocess
import sys
import time

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from ebb_core import (F32, ValueNoise3D, aces, bilinear_scale_translate, bloom,
                      box_blur, clamp01, downsample, ease01, keyframes, lerp,
                      smoothstep, smootherstep, splat, upsample_to)
import ebb_emblem as EM

HERE = os.path.dirname(os.path.abspath(__file__))
SOURCE_LOGO = os.path.join(HERE, 'assets', 'ebb_logo_source.png')
OUTDIR = os.path.join(HERE, 'output')

# ---------------------------------------------------------------- timeline --
FPS = 60
T_EMERGE = 0.50
T_SPIN = 3.00
T_HERO = 3.40
T_BREATH = 5.50
T_OUTRO = 7.00
T_TOTAL = 7.40
N_FRAMES = int(round(T_TOTAL * FPS))          # 444

SHUTTER = 0.62                                 # 180-ish degree shutter
MAX_SUBSAMPLES = 6
DEG_PER_SUBSAMPLE = 0.62                       # motion-blur granularity

# ------------------------------------------------------------------ optics --
CAM_DIST = 2300.0                              # perspective strength
DISC_THICK = 48.0                              # medallion thickness (world u.)
FIRE_TEX = 512
FIRE_SPAN = 1.32                               # fire texture reaches 1.32 * ring R


# =============================================================== MOTION ======
def spin_angle(t):
    """Degrees. Slow start -> accelerate -> fast -> decelerate -> settle."""
    if t <= T_EMERGE:
        return 0.0
    if t < T_SPIN:
        return 360.0 * ease01((t - T_EMERGE) / (T_SPIN - T_EMERGE))
    # damped inertia settle: starts at exactly 360 deg with zero velocity
    u = (t - T_SPIN) / 0.42
    if u >= 1.0:
        return 360.0
    return 360.0 + 1.55 * math.exp(-4.2 * u) * (1.0 - math.cos(2.0 * math.pi * 1.9 * u)) * 0.5


def emblem_scale(t):
    if t <= T_EMERGE:                                     # rise out of the dark
        return lerp(0.865, 1.0, ease01(t / T_EMERGE))
    if t < T_SPIN:
        return 1.0
    if t < T_HERO:                                        # micro-bounce landing
        u = (t - T_SPIN) / 0.42
        if u >= 1.0:
            return 1.0
        return 1.0 + 0.020 * math.exp(-4.6 * u) * (1.0 - math.cos(2.0 * math.pi * 1.75 * u)) * 0.5
    if t < T_BREATH:                                      # breathing
        return keyframes(t, [(T_HERO, 1.000), (4.35, 1.070),
                             (5.05, 0.986), (T_BREATH, 1.000)])
    return keyframes(t, [(T_BREATH, 1.000), (T_OUTRO, 1.048), (T_TOTAL, 1.060)])


def camera_zoom(t):
    """Very slight continuous push-in across the whole shot."""
    return keyframes(t, [(0.0, 0.985), (T_SPIN, 1.004), (T_BREATH, 1.020), (T_TOTAL, 1.032)])


def energy(t):
    """Master plasma-fire intensity."""
    return keyframes(t, [(0.00, 0.00), (0.34, 0.05), (0.58, 0.45), (0.95, 0.92),
                         (2.66, 0.92), (2.98, 1.02), (3.10, 1.10), (3.30, 0.58),
                         (T_HERO, 0.42), (4.20, 0.26), (5.20, 0.22),
                         (T_BREATH, 0.21), (6.10, 0.13), (6.75, 0.03), (T_OUTRO, 0.0)])


def logo_alpha(t):
    if t < 0.06:
        return 0.0
    return float(smootherstep(0.06, T_EMERGE, t))


def dissolve_progress(t):
    if t <= T_BREATH:
        return 0.0
    p = min((t - T_BREATH) / (T_OUTRO - T_BREATH), 1.0)
    return 0.45 * ease01(p) + 0.55 * p       # soft onset, steady sweep


def global_fade(t):
    """Final settle to pure black."""
    return float(1.0 - smootherstep(T_OUTRO - 0.10, T_OUTRO + 0.10, t))


# ========================================================== PROJECTION ======
def project_quad(theta_deg, z_off, q, cx, cy, zoom):
    """Project the four corners of a square plate of half-size q, offset z_off
    along its own normal, rotated theta about the vertical Y axis."""
    th = math.radians(theta_deg)
    ct, st = math.cos(th), math.sin(th)
    f = CAM_DIST
    pts = []
    for (px, py) in ((-q, -q), (q, -q), (q, q), (-q, q)):
        x = px * ct + z_off * st
        z = -px * st + z_off * ct
        den = CAM_DIST + z
        pts.append((f * x / den * zoom + cx, f * py / den * zoom + cy))
    return np.array(pts, dtype=np.float64), ct, st


def homography(src, dst):
    """DLT for four point correspondences. src/dst: (4,2)."""
    a = np.zeros((8, 8))
    b = np.zeros(8)
    for i in range(4):
        x, y = src[i]
        u, v = dst[i]
        a[2 * i] = [x, y, 1, 0, 0, 0, -u * x, -u * y]
        a[2 * i + 1] = [0, 0, 0, x, y, 1, -v * x, -v * y]
        b[2 * i] = u
        b[2 * i + 1] = v
    h = np.linalg.solve(a, b)
    return np.array([[h[0], h[1], h[2]], [h[3], h[4], h[5]], [h[6], h[7], 1.0]])


def quad_bbox(pts, pad, w, h):
    x0 = int(math.floor(pts[:, 0].min() - pad)); x1 = int(math.ceil(pts[:, 0].max() + pad))
    y0 = int(math.floor(pts[:, 1].min() - pad)); y1 = int(math.ceil(pts[:, 1].max() + pad))
    x0 = max(0, x0); y0 = max(0, y0); x1 = min(w, x1); y1 = min(h, y1)
    if x1 <= x0 or y1 <= y0:
        return None
    return x0, y0, x1, y1


def build_xmips(tex, levels=5):
    """Horizontal-only mip chain.  The Y-axis spin compresses the texture along
    its X axis only, so an anisotropic X mip is the exact prefilter - it kills
    shimmer at grazing angles while keeping vertical detail razor sharp."""
    mips = [np.ascontiguousarray(tex)]
    cur = tex
    for _ in range(levels - 1):
        w = cur.shape[1]
        if w < 8:
            break
        cur = 0.5 * (cur[:, 0:w - w % 2:2] + cur[:, 1:w - w % 2:2])
        mips.append(np.ascontiguousarray(cur))
    return mips


def warp(mips, h_mat, bbox, tex_n, lod):
    """Inverse perspective warp with trilinear (bilinear + X-mip) filtering.

    Returns (values (M,C), flat-index into the bbox raster, sx_norm (M,), shape)
    computed only on the pixels that actually land inside the plate.
    """
    x0, y0, x1, y1 = bbox
    bw, bh = x1 - x0, y1 - y0
    hi = np.linalg.inv(h_mat)
    uu = (np.arange(x0, x1, dtype=np.float64) + 0.5)
    vv = (np.arange(y0, y1, dtype=np.float64) + 0.5)
    U, V = np.meshgrid(uu, vv)
    den = hi[2, 0] * U + hi[2, 1] * V + hi[2, 2]
    den = np.where(np.abs(den) < 1e-9, 1e-9, den)
    sx = (hi[0, 0] * U + hi[0, 1] * V + hi[0, 2]) / den
    sy = (hi[1, 0] * U + hi[1, 1] * V + hi[1, 2]) / den
    ok = (sx >= 0) & (sx <= tex_n - 1.001) & (sy >= 0) & (sy <= tex_n - 1.001)
    idx = np.flatnonzero(ok.ravel())
    if idx.size == 0:
        return None
    sxf = sx.ravel()[idx].astype(F32)
    syf = sy.ravel()[idx].astype(F32)

    l0 = int(min(max(math.floor(lod), 0), len(mips) - 1))
    frac = lod - l0
    val = _sample(mips[l0], sxf, syf, l0)
    if frac > 0.02 and l0 + 1 < len(mips):
        val = val * F32(1.0 - frac) + _sample(mips[l0 + 1], sxf, syf, l0 + 1) * F32(frac)
    inv = F32(1.0 / (tex_n * 0.5))
    return val, idx, sxf * inv - F32(1.0), syf * inv - F32(1.0), (bh, bw)


def _sample(mip, sx, sy, level):
    h, w, c = mip.shape
    xs = sx / F32(1 << level) - F32(0.5 * ((1 << level) - 1) / (1 << level))
    xs = np.clip(xs, 0, w - 1.001)
    ys = np.clip(sy, 0, h - 1.001)
    xi = xs.astype(np.int32); yi = ys.astype(np.int32)
    fx = (xs - xi)[:, None]; fy = (ys - yi)[:, None]
    flat = mip.reshape(-1, c)
    base = yi.astype(np.int64) * w + xi
    a = flat[base]; b = flat[base + 1]
    d = flat[base + w]; e = flat[base + w + 1]
    top = a + (b - a) * fx
    bot = d + (e - d) * fx
    return top + (bot - top) * fy


# ============================================================ BLUE PLASMA ====
class PlasmaRing:
    """Electric-blue combustion welded to the outer chrome bezel.

    Built in the medallion's own polar space so the fire is *attached* to the
    ring and gets foreshortened by the same perspective warp as the metal.
    The turbulence comes from a periodic 3-D value-noise field whose third axis
    is time, so it evolves continuously instead of flickering: every texel is a
    smooth function of t, and the angular axis wraps exactly -> no seam.
    """

    def __init__(self, n=FIRE_TEX, seed=13):
        self.n = n
        # angular lattice periods: every angular multiplier used below must be
        # an exact multiple of the lattice's nx or the ring shows a seam at pi
        self.noise = ValueNoise3D(56, 40, 28, seed)
        self.broad = ValueNoise3D(28, 24, 20, seed + 9)
        c = (n - 1) * 0.5
        y, x = np.mgrid[0:n, 0:n].astype(F32)
        r = np.sqrt((x - c) ** 2 + (y - c) ** 2) / (n * 0.5) * FIRE_SPAN
        phi = np.arctan2(y - c, x - c)
        band = (r > 0.80) & (r < 1.30)
        self.idx = np.flatnonzero(band.ravel())
        self.r = r.ravel()[self.idx].astype(F32)
        self.phi = phi.ravel()[self.idx].astype(F32)
        self.u = ((self.phi + np.pi) / (2.0 * np.pi)).astype(F32)   # 0..1 around ring
        self.buf = np.zeros((n * n, 3), dtype=F32)

    def render(self, t, level, spin_deg, calm):
        """calm 0..1 : 0 = violent combustion, 1 = drifting energy wisps."""
        self.buf[:] = 0.0
        if level <= 0.002:
            return self.buf.reshape(self.n, self.n, 3)

        u, r = self.u, self.r
        turb = lerp(1.0, 0.45, calm)
        flow = t * lerp(0.62, 0.20, calm)
        rise = t * lerp(1.45, 0.55, calm)

        # low radial frequency + high angular frequency = long tongues that
        # lick outward from the bezel instead of speckle
        nx = u * 56.0 + flow * 56.0
        ny = (r - 1.0) * 11.0 - rise * 7.0
        nz = t * lerp(2.1, 0.8, calm)
        n1 = self.noise.fbm(nx, ny, nz, octaves=3, gain=0.48)
        n2 = self.broad(u * 28.0 + flow * 28.0, (r - 1.0) * 5.0 - rise * 3.4, nz * 0.55 + 11.0)
        n3 = self.noise(u * 112.0 + flow * 112.0, (r - 1.0) * 24.0 - rise * 14.0, nz * 1.5 + 5.0)
        fld = n1 * 0.34 + n2 * 0.50 + n3 * 0.16

        # flame tongues: noise minus normalised distance from the bezel
        out = np.clip((r - 1.005) / lerp(0.275, 0.165, calm), 0.0, 4.0)
        inn = np.clip((0.995 - r) / lerp(0.125, 0.075, calm), 0.0, 4.0)
        dist = np.where(r >= 1.0, out, inn * 1.15)
        dens = np.clip(fld * (1.62 + 0.42 * turb) - 0.34 - dist * lerp(1.02, 1.45, calm), 0.0, 1.8)
        dens *= level

        # electric arcs - sharp noise ridges, gated so they crackle in bursts
        ridge = 1.0 - np.abs(2.0 * n3 - 1.0)
        gate = 0.5 + 0.5 * math.sin(t * 7.3) * math.cos(t * 3.1)
        arcs = (ridge ** 26) * np.exp(-(np.abs(r - 1.0) / 0.075) ** 2) \
            * (0.30 + 0.70 * gate) * level * (1.0 - 0.55 * calm)
        arcs *= smoothstep(0.06, 0.45, dens)     # arcs only live inside plasma

        # energy trail chasing the orbital ring around the bezel
        head = (spin_deg / 360.0 * 1.55 + t * 0.46) % 1.0
        d = np.abs(((u - head + 0.5) % 1.0) - 0.5)
        trail = np.exp(-(d / 0.085) ** 2) * np.exp(-(np.abs(r - 1.0) / 0.052) ** 2)
        trail *= level * (1.0 - 0.6 * calm)

        glow = smoothstep(0.00, 0.40, dens)
        mid = smoothstep(0.18, 0.70, dens)
        core = smoothstep(0.58, 1.10, dens)

        b = self.buf
        acc = np.empty((u.size, 3), dtype=F32)
        acc[:, 0] = glow * 0.055 + mid * 0.230 + core * 0.880 + arcs * 0.72 + trail * 0.30
        acc[:, 1] = glow * 0.330 + mid * 0.720 + core * 0.965 + arcs * 0.96 + trail * 0.78
        acc[:, 2] = glow * 1.000 + mid * 1.000 + core * 1.000 + arcs * 1.00 + trail * 1.00
        acc *= np.array([0.62, 0.60, 0.68], F32)
        b[self.idx] = acc
        return b.reshape(self.n, self.n, 3)


# ============================================================= BACKGROUND ====
def build_background(w, h, cx, cy, seed=3):
    """Dark futuristic tech environment: navy gradient, atmospheric haze,
    star dust, faint circuit traces and a soft floor reflection plate."""
    rng = np.random.default_rng(seed)
    y, x = np.mgrid[0:h, 0:w].astype(F32)
    ny = y / h

    base = (np.array([0.012, 0.024, 0.052], F32)[None, None, :] * (1.0 - ny)[..., None]
            + np.array([0.004, 0.010, 0.026], F32)[None, None, :] * ny[..., None])
    rr = np.sqrt(((x - cx) / (w * 0.60)) ** 2 + ((y - cy) / (h * 0.85)) ** 2)
    base += np.exp(-(rr / 0.72) ** 2)[..., None] * np.array([0.010, 0.038, 0.098], F32)

    # ---- circuit traces radiating outward (Manhattan routed) --------------
    circuit = np.zeros((h, w), F32)
    phase = np.zeros((h, w), F32)
    rad0 = min(w, h) * 0.34
    for i in range(26):
        a = rng.uniform(0, 2 * math.pi)
        px = cx + math.cos(a) * rad0
        py = cy + math.sin(a) * rad0
        dirx = 1.0 if math.cos(a) >= 0 else -1.0
        diry = 1.0 if math.sin(a) >= 0 else -1.0
        travelled = 0.0
        horiz = rng.random() < 0.5
        for _ in range(rng.integers(3, 7)):
            ln = rng.uniform(60, 240)
            if horiz:
                qx, qy = px + dirx * ln, py
            else:
                qx, qy = px, py + diry * ln
            _trace(circuit, phase, px, py, qx, qy, travelled)
            travelled += ln
            px, py = qx, qy
            horiz = not horiz
            if not (-200 < px < w + 200 and -200 < py < h + 200):
                break
        _node(circuit, px, py, 3.0)

    circuit = box_blur(circuit[..., None], 1, 1)[..., 0]
    phase = box_blur(phase[..., None], 1, 1)[..., 0]

    # ---- star / dust points ----------------------------------------------
    stars = np.zeros((h, w, 3), F32)
    ns = 900
    sx = rng.uniform(0, w, ns).astype(F32)
    sy = rng.uniform(0, h, ns).astype(F32)
    dist = np.sqrt(((sx - cx) / w) ** 2 + ((sy - cy) / h) ** 2)
    bright = (rng.random(ns).astype(F32) ** 2.6) * (0.28 + 0.72 * np.clip(dist * 2.1, 0, 1))
    col = np.stack([bright * 0.34, bright * 0.70, bright * 1.0], 1) * 0.55
    splat(stars, sx, sy, col)
    stars = box_blur(stars, 1, 1) * 2.2
    star_seed = rng.random(ns).astype(F32) * 6.28

    base += stars
    vig = 1.0 - 0.66 * smoothstep(0.30, 1.22, np.sqrt(((x - w * 0.5) / (w * 0.52)) ** 2
                                                      + ((y - h * 0.5) / (h * 0.62)) ** 2))
    return dict(base=np.ascontiguousarray(base.astype(F32)),
                circuit=np.ascontiguousarray(circuit.astype(F32)),
                phase=np.ascontiguousarray(phase.astype(F32)),
                vignette=np.ascontiguousarray(vig.astype(F32)[..., None]),
                stars_xy=(sx, sy), stars_seed=star_seed, stars_col=col)


def _trace(buf, phase, x0, y0, x1, y1, t0):
    h, w = buf.shape
    n = int(max(abs(x1 - x0), abs(y1 - y0)) * 1.4) + 2
    xs = np.linspace(x0, x1, n); ys = np.linspace(y0, y1, n)
    ts = t0 + np.linspace(0, math.hypot(x1 - x0, y1 - y0), n)
    xi = np.round(xs).astype(np.int32); yi = np.round(ys).astype(np.int32)
    m = (xi >= 0) & (xi < w) & (yi >= 0) & (yi < h)
    buf[yi[m], xi[m]] = np.maximum(buf[yi[m], xi[m]], 1.0)
    phase[yi[m], xi[m]] = ts[m]


def _node(buf, x, y, r):
    h, w = buf.shape
    xi, yi = int(round(x)), int(round(y))
    ri = int(r)
    for dy in range(-ri, ri + 1):
        for dx in range(-ri, ri + 1):
            if dx * dx + dy * dy <= r * r and 0 <= yi + dy < h and 0 <= xi + dx < w:
                buf[yi + dy, xi + dx] = max(buf[yi + dy, xi + dx], 0.85)


# ============================================================== PARTICLES ====
class Particles:
    """Blue sparks, drifting dust, inrushing embers and dissolve shards.

    Simulated once for the whole shot at fixed dt so every particle carries a
    real velocity history - frames can then be rendered out of order (and in
    parallel) while the motion stays perfectly continuous.  Each particle is
    drawn as a short streak between its previous and current position, which
    is what gives them physical motion blur.
    """

    CAP = 5600
    DUST, SPARK, EMBER, SHARD = 0, 1, 2, 3

    def __init__(self, w, h, cx, cy, base_r, seed=101):
        self.w, self.h, self.cx, self.cy, self.R = w, h, cx, cy, base_r
        self.rng = np.random.default_rng(seed)
        z = np.zeros(self.CAP, F32)
        self.x, self.y = z.copy(), z.copy()
        self.px, self.py = z.copy(), z.copy()
        self.vx, self.vy = z.copy(), z.copy()
        self.life, self.ml = z.copy(), np.ones(self.CAP, F32)
        self.size = z.copy()
        self.col = np.zeros((self.CAP, 3), F32)
        self.kind = np.zeros(self.CAP, np.int8)
        self.drag = np.ones(self.CAP, F32)
        self.free = list(range(self.CAP))
        self.frames = []
        self._seed_dust(300)

    # -- spawning --------------------------------------------------------
    def _take(self, n):
        n = min(n, len(self.free))
        if n <= 0:
            return None
        got = self.free[:n]
        del self.free[:n]
        return np.array(got, dtype=np.int64)

    def _seed_dust(self, n):
        i = self._take(n)
        if i is None:
            return
        n = i.size
        r = self.rng
        self.x[i] = r.uniform(0, self.w, n)
        self.y[i] = r.uniform(0, self.h, n)
        self.px[i], self.py[i] = self.x[i], self.y[i]
        ang = r.uniform(0, 2 * np.pi, n)
        sp = r.uniform(3.0, 16.0, n) / FPS
        self.vx[i] = np.cos(ang) * sp
        self.vy[i] = np.sin(ang) * sp - r.uniform(1.0, 7.0, n) / FPS
        self.life[i] = 1.0
        self.ml[i] = 1e9
        self.size[i] = r.uniform(0.5, 1.6, n)
        b = (r.random(n).astype(F32) ** 2.2) * 0.30 + 0.03
        self.col[i] = np.stack([b * 0.26, b * 0.66, b * 1.0], 1)
        self.kind[i] = self.DUST
        self.drag[i] = 1.0

    def emit_spark(self, n, radius, spin_dir, vigour):
        i = self._take(n)
        if i is None:
            return
        n = i.size
        r = self.rng
        a = r.uniform(0, 2 * np.pi, n)
        rr = radius * r.uniform(0.985, 1.075, n)
        self.x[i] = self.cx + np.cos(a) * rr
        self.y[i] = self.cy + np.sin(a) * rr
        self.px[i], self.py[i] = self.x[i], self.y[i]
        tang = np.stack([-np.sin(a), np.cos(a)], 1) * spin_dir
        rad = np.stack([np.cos(a), np.sin(a)], 1)
        sp_t = r.uniform(80, 430, n)[:, None] * vigour / FPS
        sp_r = r.uniform(25, 210, n)[:, None] * vigour / FPS
        v = tang * sp_t + rad * sp_r
        self.vx[i], self.vy[i] = v[:, 0], v[:, 1]
        self.ml[i] = r.uniform(0.30, 0.95, n)
        self.life[i] = self.ml[i]
        self.size[i] = r.uniform(0.6, 2.1, n)
        hot = r.random(n).astype(F32)
        self.col[i] = np.stack([0.20 + 0.72 * hot ** 3, 0.62 + 0.36 * hot,
                                np.ones(n, F32)], 1) * (0.55 + 0.85 * hot)[:, None]
        self.kind[i] = self.SPARK
        self.drag[i] = r.uniform(0.955, 0.988, n)

    def emit_ember(self, n, radius):
        i = self._take(n)
        if i is None:
            return
        n = i.size
        r = self.rng
        a = r.uniform(0, 2 * np.pi, n)
        rr = radius * r.uniform(1.45, 2.90, n)
        self.x[i] = self.cx + np.cos(a) * rr
        self.y[i] = self.cy + np.sin(a) * rr
        self.px[i], self.py[i] = self.x[i], self.y[i]
        sp = r.uniform(240, 700, n)[:, None] / FPS
        v = -np.stack([np.cos(a), np.sin(a)], 1) * sp
        self.vx[i], self.vy[i] = v[:, 0], v[:, 1]
        self.ml[i] = r.uniform(0.22, 0.55, n)
        self.life[i] = self.ml[i]
        self.size[i] = r.uniform(0.6, 1.8, n)
        b = r.uniform(0.35, 1.0, n).astype(F32)
        self.col[i] = np.stack([b * 0.22, b * 0.70, b * 1.0], 1).astype(F32)
        self.kind[i] = self.EMBER
        self.drag[i] = 0.995

    def emit_shard(self, n, radius, edge_x, spread):
        i = self._take(n)
        if i is None:
            return
        n = i.size
        r = self.rng
        # scatter along the dissolve front, inside the medallion disc
        ex = edge_x + r.normal(0, spread, n)
        maxy = np.sqrt(np.maximum(radius ** 2 - np.minimum(ex ** 2, radius ** 2), 1.0))
        ey = r.uniform(-1, 1, n) * maxy * r.uniform(0.2, 1.0, n)
        self.x[i] = self.cx + ex
        self.y[i] = self.cy + ey
        self.px[i], self.py[i] = self.x[i], self.y[i]
        d = np.stack([ex, ey], 1)
        d /= (np.linalg.norm(d, axis=1, keepdims=True) + 1e-3)
        sp = r.uniform(18, 155, n)[:, None] / FPS
        v = d * sp + np.stack([r.uniform(-30, 95, n), r.uniform(-70, 22, n)], 1) / FPS
        self.vx[i], self.vy[i] = v[:, 0], v[:, 1]
        self.ml[i] = r.uniform(0.45, 1.20, n)
        self.life[i] = self.ml[i]
        self.size[i] = r.uniform(0.5, 2.4, n)
        hot = r.random(n).astype(F32)
        self.col[i] = np.stack([0.14 + 0.62 * hot ** 3, 0.55 + 0.40 * hot,
                                np.ones(n, F32)], 1) * (0.42 + 0.70 * hot)[:, None]
        self.kind[i] = self.SHARD
        self.drag[i] = r.uniform(0.975, 0.995, n)

    # -- integration -----------------------------------------------------
    def simulate(self, n_frames, radius_of, dissolve_edge_of):
        dt = 1.0 / FPS
        for f in range(n_frames):
            t = f / FPS
            e = energy(t)
            rad = radius_of(t)

            if 0.04 < t < T_EMERGE + 0.06:
                self.emit_ember(int(14 * (0.4 + 0.6 * (t / T_EMERGE))), rad)
            if T_EMERGE - 0.02 < t < T_HERO + 0.25:
                w = abs(spin_angle(min(t + dt, T_TOTAL)) - spin_angle(t)) / dt / 270.0
                self.emit_spark(int(4 + 26 * min(w, 1.0) * e), rad, 1.0, 0.55 + 0.9 * min(w, 1.0))
            if abs(t - T_SPIN) < dt * 0.5:
                self.emit_spark(150, rad, 1.0, 2.6)          # hero-stop burst
            if T_HERO <= t < T_BREATH and f % 3 == 0:
                self.emit_spark(2, rad, 1.0, 0.16)
            if T_BREATH < t < T_BREATH + 0.95:
                self.emit_spark(3, rad, 1.0, 0.13)   # bezel lets go first
            if T_BREATH < t < T_OUTRO:
                ex = dissolve_edge_of(t)
                if abs(ex) < rad * 1.06:
                    self.emit_shard(int(22 + 46 * math.sin(math.pi * min(
                        (t - T_BREATH) / (T_OUTRO - T_BREATH), 1.0))), rad, ex, rad * 0.11)

            self.px[:] = self.x
            self.py[:] = self.y
            alive = self.life > 0
            self.vx[alive] *= self.drag[alive]
            self.vy[alive] *= self.drag[alive]
            dust = alive & (self.kind == self.DUST)
            self.vy[dust] += math.sin(t * 0.7) * 0.0009
            self.x[alive] += self.vx[alive]
            self.y[alive] += self.vy[alive]
            # ambient dust wraps around the frame
            self.x[dust] = np.mod(self.x[dust], self.w)
            self.y[dust] = np.mod(self.y[dust], self.h)
            jump = dust & (np.abs(self.x - self.px) > 10)
            self.px[jump] = self.x[jump]
            jump = dust & (np.abs(self.y - self.py) > 10)
            self.py[jump] = self.y[jump]

            mortal = alive & (self.ml < 1e8)
            self.life[mortal] -= dt
            dead = np.flatnonzero(mortal & (self.life <= 0))
            if dead.size:
                self.life[dead] = 0.0
                self.free.extend(dead.tolist())

            live = np.flatnonzero(self.life > 0)
            frac = np.clip(self.life[live] / np.minimum(self.ml[live], 1e8), 0, 1)
            fade = np.where(self.kind[live] == self.DUST,
                            0.55 + 0.45 * np.sin(t * 1.7 + live * 0.37),
                            frac ** 0.65 * (0.35 + 0.65 * np.sin(np.pi * np.clip(frac, 0, 1) ** 0.35)))
            self.frames.append((self.x[live].copy(), self.y[live].copy(),
                                self.px[live].copy(), self.py[live].copy(),
                                (self.col[live] * fade[:, None].astype(F32)).copy(),
                                self.size[live].copy()))

    def draw(self, buf, f, gain=1.0):
        x, y, px, py, col, size = self.frames[f]
        if x.size == 0:
            return
        nsub = 5
        w = np.linspace(0.0, 1.0, nsub, dtype=F32)[:, None]
        xs = (px[None, :] * (1 - w) + x[None, :] * w).ravel()
        ys = (py[None, :] * (1 - w) + y[None, :] * w).ravel()
        cc = np.repeat(col[None, :, :], nsub, axis=0).reshape(-1, 3) * (gain / nsub)
        splat(buf, xs, ys, cc)


# =============================================================== DISSOLVE ====
_DIS_NOISE = ValueNoise3D(40, 40, 4, 77)


def dissolve_key(sxn, syn, r_ring):
    """0 = goes first, 1 = survives longest.  Sweeps left->right while the
    outer bezel lets go before the centre, so the EBB wordmark is the last
    thing standing."""
    sweep = (sxn + 1.0) * 0.5
    rq = np.clip(r_ring / 1.16, 0.0, 1.0)
    z = np.zeros_like(sxn)
    fine = _DIS_NOISE(sxn * 9.0 + 12.0, syn * 9.0 + 5.0, z)
    blocky = _DIS_NOISE(np.floor(sxn * 44.0) / 3.0 + 30.0, np.floor(syn * 44.0) / 3.0 + 7.0, z + 1.0)
    field = fine * 0.66 + blocky * 0.34
    return 0.44 * sweep + 0.30 * (1.0 - rq) + 0.26 * field


def dissolve_threshold(prog):
    # calibrated to the measured dissolve_key distribution (0.035 .. 0.727)
    return prog * 0.800 - 0.010


def dissolve_edge_x(t, radius):
    """Approximate screen-x of the dissolve front (used to seed shard particles)."""
    sweep = (dissolve_threshold(dissolve_progress(t)) - 0.25) / 0.44
    return float(np.clip(sweep, -0.10, 1.10) * 2.0 - 1.0) * radius / EM.R_NORM


# ================================================================ SCENE ======
class Scene:
    def __init__(self, w, h, disc_frac, cy_frac, seed=5):
        self.w, self.h = w, h
        self.cx = w * 0.5
        self.cy = h * cy_frac
        self.R = h * disc_frac                    # ring radius on screen @ scale 1
        self.Q = self.R / EM.R_NORM               # half-texture in world units

        face, halo, r, phi = EM.build_face(SOURCE_LOGO)
        back, bhalo = EM.build_back(face, halo, r, phi)
        metal = smoothstep(0.30, 0.74, face[..., :3].min(axis=2)).astype(F32)
        bmetal = smoothstep(0.30, 0.74, back[..., :3].min(axis=2)).astype(F32)
        self.mips_front = build_xmips(np.dstack([face, halo, metal[..., None]]).astype(F32))
        self.mips_back = build_xmips(np.dstack([back, bhalo, bmetal[..., None]]).astype(F32))

        self.plasma = PlasmaRing()
        self.bg = build_background(w, h, self.cx, self.cy, seed)

        yy, xx = np.mgrid[0:h, 0:w].astype(F32)
        self.X = xx - self.cx
        self.Y = yy - self.cy
        self.dist = np.sqrt(self.X ** 2 + self.Y ** 2)
        self.haze = np.exp(-(self.dist / (self.R * 1.55)) ** 2).astype(F32)[..., None]
        self.haze2 = np.exp(-(self.dist / (self.R * 3.4)) ** 2).astype(F32)[..., None]
        self.y_floor = h * 0.955
        self.uu = (np.arange(w, dtype=F32) + 0.5)
        self.vv = (np.arange(h, dtype=F32) + 0.5)

        cflat = self.bg['circuit'].ravel()
        self.cidx = np.flatnonzero(cflat > 0.012)
        self.cval = cflat[self.cidx].copy()
        self.cphase = self.bg['phase'].ravel()[self.cidx].copy()

        self.parts = Particles(w, h, self.cx, self.cy, self.R, seed * 37 + 1)
        self.parts.simulate(N_FRAMES,
                            lambda tt: self.R * emblem_scale(tt) * camera_zoom(tt),
                            lambda tt: dissolve_edge_x(tt, self.R * emblem_scale(tt)))

    # ---------------------------------------------------------- emblem ----
    def emblem(self, t, prem, alph, addb):
        theta = spin_angle(t)
        sc = emblem_scale(t)
        zm = camera_zoom(t)
        lvl = energy(t)
        la = logo_alpha(t)
        prog = dissolve_progress(t)
        th = math.radians(theta)
        ct, st = math.cos(th), math.sin(th)
        front = ct >= 0.0
        q = self.Q * sc
        z_near = -DISC_THICK * 0.5 if front else DISC_THICK * 0.5

        f = CAM_DIST
        def centre_u(z0):
            return f * (z0 * st) / (CAM_DIST + z0 * ct) * zm + self.cx
        un, uf = centre_u(z_near), centre_u(-z_near)
        dxr = uf - un

        pts, _, _ = project_quad(theta, z_near, q, self.cx, self.cy, zm)
        pad = int(math.ceil(abs(dxr))) + 8
        bb = quad_bbox(pts, pad, self.w, self.h)
        if bb is None:
            return
        x0, y0, x1, y1 = bb
        bw, bh = x1 - x0, y1 - y0
        Xl = self.uu[x0:x1] - self.cx
        Yl = (self.vv[y0:y1] - self.cy)[:, None]

        # ---- rim (the machined edge of the medallion) ---------------------
        kk = f / (CAM_DIST + z_near * ct) * zm
        rw = self.R * sc                       # ring radius in world units
        b_ax = rw * kk + 1.2
        a_ax = rw * abs(ct) * kk + 1.2
        lo, hi = min(un, uf), max(un, uf)
        Xc = (Xl + self.cx) - np.clip(Xl + self.cx, lo, hi)
        ell = (Xc[None, :] / a_ax) ** 2 + (Yl / b_ax) ** 2
        hull = (1.0 - smoothstep(0.90, 1.0, ell)).astype(F32)
        if prog > 0.0:
            hidx = np.flatnonzero(hull.ravel() > 1e-4)
            if hidx.size:
                rs = max(rw * kk, 1e-3)
                gx = (np.broadcast_to(Xl[None, :], (bh, bw)).ravel()[hidx] / rs) * EM.R_NORM
                gy = (np.broadcast_to(Yl, (bh, bw)).ravel()[hidx] / rs) * EM.R_NORM
                gk = dissolve_key(gx, gy, np.sqrt(gx * gx + gy * gy) / EM.R_NORM)
                gt = dissolve_threshold(prog)
                hull.ravel()[hidx] *= smoothstep(gt, gt + 0.085, gk).astype(F32)
        if hull.max() > 1e-4:
            if abs(dxr) > 1.0:
                s = np.clip(((Xl + self.cx)[None, :] - un) / dxr, 0.0, 1.0)
            else:                      # face-on: no visible thickness to shade
                s = np.zeros((1, bw), F32)
            vgrad = np.clip(0.62 - 0.42 * (Yl / (b_ax + 1e-3)), 0.10, 1.25)
            shade = (0.14 + 0.80 * (1.0 - s) ** 1.5) * vgrad
            rim = np.empty((bh, bw, 3), F32)
            rim[..., 0] = shade * 0.60 + 0.10 * lvl
            rim[..., 1] = shade * 0.74 + 0.38 * lvl
            rim[..., 2] = shade * 1.00 + 0.95 * lvl
            rim *= (hull * la)[..., None]
            ha = hull * la
            prem[y0:y1, x0:x1] += rim * (1.0 - alph[y0:y1, x0:x1])[..., None]
            alph[y0:y1, x0:x1] = ha + alph[y0:y1, x0:x1] * (1.0 - ha)
            addb[y0:y1, x0:x1] += (hull * (lvl * 0.55 * abs(st) * la))[..., None] \
                * np.array([0.05, 0.42, 1.0], F32)

        # ---- the medallion face -------------------------------------------
        face_w = abs(pts[1, 0] - pts[0, 0])
        if face_w > 1.2:
            ratio = EM.TEX / max(2.0 * q * zm * max(abs(ct), 1e-3), 1.0)
            lod = math.log2(max(ratio, 1.0))
            res = warp(self.mips_front if front else self.mips_back,
                       homography(np.array([[0, 0], [EM.TEX, 0], [EM.TEX, EM.TEX], [0, EM.TEX]], float), pts),
                       bb, EM.TEX, lod)
            if res is not None:
                val, idx, sxn, syn, _ = res
                rgb = val[:, 0:3].copy()
                a = val[:, 3].copy()
                halo = val[:, 4:7]
                metal = val[:, 7]

                # travelling specular - vanishes completely when front-facing,
                # so the hero frame is the untouched artwork
                amt = 0.55 * abs(st)
                if amt > 1e-3:
                    spec = metal * np.exp(-((sxn + 1.45 * st) / 0.42) ** 2) * amt
                    rgb += spec[:, None] * np.array([0.52, 0.70, 1.00], F32)
                rgb *= F32(0.64 + 0.36 * abs(ct))

                if prog > 0.0:
                    r_ring = np.sqrt(sxn * sxn + syn * syn) / EM.R_NORM
                    key = dissolve_key(sxn, syn, r_ring)
                    thr = dissolve_threshold(prog)
                    solid = smoothstep(thr, thr + 0.085, key).astype(F32)
                    edge = np.exp(-((key - thr - 0.040) / 0.052) ** 2).astype(F32)
                    a = a * solid
                    halo = halo * solid[:, None]
                    rgb = rgb + edge[:, None] * np.array([0.30, 0.85, 1.30], F32) * 1.90

                a *= F32(la)
                gid = (idx // bw + y0) * self.w + (idx % bw + x0)
                flat_p = prem.reshape(-1, 3)
                flat_a = alph.reshape(-1)
                inv = (1.0 - a)
                flat_p[gid] = flat_p[gid] * inv[:, None] + rgb * a[:, None]
                flat_a[gid] = a + flat_a[gid] * inv
                np.add.at(addb.reshape(-1, 3), gid, halo * F32(la * (0.68 + 0.26 * lvl)))

        # ---- plasma fire, welded to the bezel ------------------------------
        if lvl > 0.004:
            calm = float(smoothstep(T_SPIN - 0.10, 4.05, t))
            ftex = self.plasma.render(t, lvl, theta, calm)
            fmips = build_xmips(ftex, 4)
            qf = q * FIRE_SPAN * EM.R_NORM
            fpts, _, _ = project_quad(theta, 0.0, qf, self.cx, self.cy, zm)
            fbb = quad_bbox(fpts, 4, self.w, self.h)
            if fbb is not None and abs(fpts[1, 0] - fpts[0, 0]) > 1.2:
                fratio = FIRE_TEX / max(2.0 * qf * zm * max(abs(ct), 1e-3), 1.0)
                fres = warp(fmips, homography(
                    np.array([[0, 0], [FIRE_TEX, 0], [FIRE_TEX, FIRE_TEX], [0, FIRE_TEX]], float), fpts),
                    fbb, FIRE_TEX, math.log2(max(fratio, 1.0)))
                if fres is not None:
                    fval, fidx, _, _, _ = fres
                    fx0, fy0, fx1, fy1 = fbb
                    fbw = fx1 - fx0
                    fade = F32(la * (1.0 - 0.85 * dissolve_progress(t)))
                    fgid = (fidx // fbw + fy0) * self.w + (fidx % fbw + fx0)
                    np.add.at(addb.reshape(-1, 3), fgid, fval * fade)

    # ------------------------------------------------------- background ----
    def background(self, t, lvl):
        reveal = float(smootherstep(0.02, 0.45, t))
        zm = camera_zoom(t)
        pz = 1.0 + (zm - 1.0) * 0.42          # background parallaxes slower
        base = bilinear_scale_translate(self.bg['base'], self.w, self.h,
                                        pz, pz, self.cx, self.cy, self.cx, self.cy)
        base *= reveal

        # circuit traces with energy pulses running outward along the routes
        cp = self.cphase
        pulse = np.zeros_like(cp)
        for k in range(3):
            head = ((t * 210.0 + k * 260.0) % 780.0)
            pulse += np.exp(-((cp - head) / 46.0) ** 2)
        cir = self.cval * (0.055 + 0.50 * np.clip(pulse, 0, 1.6)) * reveal
        base.reshape(-1, 3)[self.cidx] += cir[:, None] * np.array([0.10, 0.45, 1.00], F32)

        # atmospheric haze driven by the medallion's own output
        glowf = (0.14 + 0.46 * lvl) * reveal
        base += self.haze * (np.array([0.022, 0.070, 0.165], F32) * glowf)
        base += self.haze2 * (np.array([0.008, 0.026, 0.066], F32) * glowf)
        return base

    def floor(self, prem, t):
        """Soft reflection of the medallion on the studio floor."""
        small = downsample(prem, 4)
        h4, w4 = small.shape[:2]
        refl = bilinear_scale_translate(small, w4, h4, 1.0, -0.46,
                                        w4 * 0.5, self.y_floor / 4.0,
                                        w4 * 0.5, self.y_floor / 4.0)
        refl = box_blur(refl, 5, 2)
        vv = np.arange(h4, dtype=F32)[:, None, None]
        fall = np.clip(1.0 - (vv - self.y_floor / 4.0) / (self.h / 4.0 * 0.32), 0.0, 1.0) ** 2
        fall *= (vv > self.y_floor / 4.0 - 1)
        return upsample_to(refl * fall, self.h, self.w) * 0.30

    # ------------------------------------------------------------ frame ----
    def frame(self, i):
        t = i / FPS
        if t >= T_OUTRO + 0.12:
            return np.zeros((self.h, self.w, 3), np.uint8)

        lvl = energy(t)
        dth = abs(spin_angle(min(t + SHUTTER / FPS, T_TOTAL)) - spin_angle(t))
        k = int(min(max(math.ceil(dth / DEG_PER_SUBSAMPLE), 1), MAX_SUBSAMPLES))

        prem = np.zeros((self.h, self.w, 3), F32)
        alph = np.zeros((self.h, self.w), F32)
        addb = np.zeros((self.h, self.w, 3), F32)
        if k == 1:
            self.emblem(t, prem, alph, addb)
        else:
            for j in range(k):
                tp = np.zeros_like(prem); ta = np.zeros_like(alph); tb = np.zeros_like(addb)
                self.emblem(t + (j + 0.5) / k * SHUTTER / FPS, tp, ta, tb)
                prem += tp; alph += ta; addb += tb
            prem /= k; alph /= k; addb /= k

        canvas = self.background(t, lvl)
        canvas += self.floor(prem, t)
        canvas *= (1.0 - alph)[..., None]
        canvas += prem
        canvas += addb

        # ---- hero-stop impact: shockwave + light burst --------------------
        u = (t - T_SPIN) / 0.62
        if 0.0 <= u < 1.0:
            rr = self.R * emblem_scale(t) * (1.0 + 1.15 * ease01(u))
            wd = 7.0 + 62.0 * u
            ring = np.exp(-((self.dist - rr) / wd) ** 2) * (1.0 - u) ** 2.2
            canvas += ring[..., None] * np.array([0.10, 0.45, 1.00], F32) * 0.34
            canvas += self.haze * (np.array([0.10, 0.34, 0.80], F32) * (math.exp(-u * 7.5) * 0.20))

        pbuf = np.zeros_like(canvas)
        self.parts.draw(pbuf, i, 1.0)
        canvas += pbuf
        canvas += upsample_to(box_blur(downsample(pbuf, 4), 3, 2), self.h, self.w) * 2.6

        canvas *= global_fade(t)
        canvas += bloom(canvas, 0.80, 0.22, 0.34, 0.30)
        canvas *= self.bg['vignette']

        rgb = aces(canvas * 0.99)
        rgb = rgb * rgb * (3.0 - 2.0 * rgb) * 0.16 + rgb * 0.84      # gentle S-curve
        # ordered dither keeps the deep navy gradients free of banding
        rgb = rgb * 255.0 + _DITHER[:self.h, :self.w]
        return np.clip(rgb, 0, 255).astype(np.uint8)


_DITHER = (np.indices((1920, 1920)).sum(0) % 2).astype(F32)[:, :, None] * 0.55 + \
          (np.random.default_rng(1).random((1920, 1920, 1)).astype(F32) - 0.5) * 0.85


# ============================================================== ENCODING =====
_SCENE = None


def _init(w, h, df, cf, seed):
    global _SCENE
    _SCENE = Scene(w, h, df, cf, seed)


def _work(i):
    return _SCENE.frame(i)


def render(path, w, h, disc_frac, cy_frac, crf=16, seed=5, jobs=4, audio=None):
    os.makedirs(OUTDIR, exist_ok=True)
    cmd = ['ffmpeg', '-y', '-hide_banner', '-loglevel', 'error',
           '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{w}x{h}', '-r', str(FPS), '-i', '-']
    if audio:
        cmd += ['-i', audio]
    cmd += ['-map', '0:v:0']
    if audio:
        cmd += ['-map', '1:a:0', '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-shortest']
    cmd += ['-c:v', 'libx264', '-preset', 'slow', '-crf', str(crf),
            '-profile:v', 'high', '-level', '4.2', '-pix_fmt', 'yuv420p',
            '-x264-params', 'ref=4:bframes=3:aq-mode=3:aq-strength=1.1',
            '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709',
            '-movflags', '+faststart', '-r', str(FPS), path]
    proc = subprocess.Popen(cmd, stdin=subprocess.PIPE)
    t0 = time.time()
    import multiprocessing as mp
    ctx = mp.get_context('fork')
    with ctx.Pool(jobs, initializer=_init, initargs=(w, h, disc_frac, cy_frac, seed)) as pool:
        for n, fr in enumerate(pool.imap(_work, range(N_FRAMES), chunksize=2)):
            proc.stdin.write(fr.tobytes())
            if n % 60 == 0:
                el = time.time() - t0
                print(f'  {os.path.basename(path)}  frame {n:3d}/{N_FRAMES}  '
                      f'{el:6.1f}s  eta {el / max(n, 1) * (N_FRAMES - n):5.1f}s', flush=True)
    proc.stdin.close()
    if proc.wait() != 0:
        raise SystemExit('ffmpeg failed')
    print(f'  wrote {path}  ({os.path.getsize(path) / 1e6:.1f} MB, {time.time() - t0:.0f}s)')


def main():
    ap = argparse.ArgumentParser(description='EBB International cinematic logo animation')
    ap.add_argument('--all', action='store_true')
    ap.add_argument('--wide', action='store_true')
    ap.add_argument('--square', action='store_true')
    ap.add_argument('--preview', type=float, nargs='*', help='render single frames at these times')
    ap.add_argument('--psize', default='1920x1080')
    ap.add_argument('--crf', type=int, default=16)
    ap.add_argument('--jobs', type=int, default=4)
    ap.add_argument('--audio', default=None)
    a = ap.parse_args()

    if a.preview is not None:
        from PIL import Image
        w, h = (int(v) for v in a.psize.split('x'))
        sq = (w == h)
        sc = Scene(w, h, 0.352 if sq else 0.385, 0.482 if sq else 0.465)
        prevdir = os.environ.get('EBB_PREVIEW_DIR', '/tmp/ebbprev')
        os.makedirs(prevdir, exist_ok=True)
        for tt in a.preview:
            i = int(round(tt * FPS))
            im = sc.frame(i)
            p = os.path.join(prevdir, f'f{i:04d}.png')
            Image.fromarray(im).save(p)
            print('preview', p)
        return

    if a.all or a.wide:
        render(os.path.join(OUTDIR, 'EBB_International_Cinematic_Intro.mp4'),
               1920, 1080, 0.385, 0.465, a.crf, 5, a.jobs, a.audio)
    if a.all or a.square:
        render(os.path.join(OUTDIR, 'EBB_International_Cinematic_Intro_Square.mp4'),
               1080, 1080, 0.352, 0.482, a.crf, 9, a.jobs, a.audio)


if __name__ == '__main__':
    main()
