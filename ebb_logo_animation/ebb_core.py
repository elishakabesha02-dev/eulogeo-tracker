"""
EBB International - cinematic logo animation : core toolkit.

Math helpers, tileable value noise, separable resampling, bloom, tonemapping.
Everything is numpy/float32 so the whole render stays continuous: every value
used by the renderer is a smooth function of time (no per-frame randomness).
"""
from __future__ import annotations

import math
import numpy as np

F32 = np.float32


# --------------------------------------------------------------------------
# easing / interpolation
# --------------------------------------------------------------------------
def clamp01(x):
    return np.clip(x, 0.0, 1.0)


def smoothstep(e0, e1, x):
    """C1-continuous 0..1 ramp."""
    t = clamp01((x - e0) / (e1 - e0 + 1e-12))
    return t * t * (3.0 - 2.0 * t)


def smootherstep(e0, e1, x):
    """C2-continuous ramp (zero velocity AND zero acceleration at both ends)."""
    t = clamp01((x - e0) / (e1 - e0 + 1e-12))
    return t * t * t * (t * (t * 6.0 - 15.0) + 10.0)


def ease01(t):
    """Scalar C2 ease used for every hero motion (quintic smootherstep)."""
    t = min(max(t, 0.0), 1.0)
    return t * t * t * (t * (t * 6.0 - 15.0) + 10.0)


def lerp(a, b, t):
    return a + (b - a) * t


def catmull(p0, p1, p2, p3, t):
    """Catmull-Rom - used for the breathing-zoom keyframe curve."""
    t2 = t * t
    t3 = t2 * t
    return 0.5 * ((2 * p1) + (-p0 + p2) * t +
                  (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 +
                  (-p0 + 3 * p1 - 3 * p2 + p3) * t3)


def keyframes(t, keys):
    """Smooth (C2) interpolation through (time, value) keyframes."""
    if t <= keys[0][0]:
        return keys[0][1]
    if t >= keys[-1][0]:
        return keys[-1][1]
    for i in range(len(keys) - 1):
        t0, v0 = keys[i]
        t1, v1 = keys[i + 1]
        if t0 <= t <= t1:
            return lerp(v0, v1, ease01((t - t0) / (t1 - t0)))
    return keys[-1][1]


# --------------------------------------------------------------------------
# tileable 3D value noise  (temporally coherent: time is the 3rd axis)
# --------------------------------------------------------------------------
class ValueNoise3D:
    """Periodic lattice noise. Because the lattice wraps, sampling the angular
    axis over exactly `nx` cells gives a seamless ring with no visible seam."""

    def __init__(self, nx=48, ny=48, nz=32, seed=7):
        rng = np.random.default_rng(seed)
        self.v = rng.random((nx, ny, nz)).astype(F32)
        self.nx, self.ny, self.nz = nx, ny, nz

    def __call__(self, x, y, z):
        nx, ny, nz = self.nx, self.ny, self.nz
        x0 = np.floor(x).astype(np.int32)
        y0 = np.floor(y).astype(np.int32)
        z0 = np.floor(z).astype(np.int32)
        fx = (x - x0).astype(F32)
        fy = (y - y0).astype(F32)
        fz = (z - z0).astype(F32)
        # smootherstep weights -> no visible lattice creases, C2 in time
        wx = fx * fx * fx * (fx * (fx * 6.0 - 15.0) + 10.0)
        wy = fy * fy * fy * (fy * (fy * 6.0 - 15.0) + 10.0)
        wz = fz * fz * fz * (fz * (fz * 6.0 - 15.0) + 10.0)
        i0 = np.mod(x0, nx); i1 = np.mod(x0 + 1, nx)
        j0 = np.mod(y0, ny); j1 = np.mod(y0 + 1, ny)
        k0 = np.mod(z0, nz); k1 = np.mod(z0 + 1, nz)
        v = self.v
        c00 = v[i0, j0, k0] * (1 - wz) + v[i0, j0, k1] * wz
        c01 = v[i0, j1, k0] * (1 - wz) + v[i0, j1, k1] * wz
        c10 = v[i1, j0, k0] * (1 - wz) + v[i1, j0, k1] * wz
        c11 = v[i1, j1, k0] * (1 - wz) + v[i1, j1, k1] * wz
        c0 = c00 * (1 - wy) + c01 * wy
        c1 = c10 * (1 - wy) + c11 * wy
        return c0 * (1 - wx) + c1 * wx

    def fbm(self, x, y, z, octaves=3, gain=0.5):
        """Lacunarity is fixed at 2 so every octave still wraps seamlessly."""
        total = np.zeros_like(np.asarray(x, dtype=F32))
        amp, norm, m = 1.0, 0.0, 1.0
        for _ in range(octaves):
            total += amp * self(x * m, y * m, z * m)
            norm += amp
            amp *= gain
            m *= 2.0
        return total / norm


# --------------------------------------------------------------------------
# resampling
# --------------------------------------------------------------------------
def bilinear_scale_translate(src, out_w, out_h, sx, sy, cx, cy, ocx, ocy):
    """Separable bilinear sample of `src` under an axis-aligned
    scale+translate. Used for background parallax / camera push."""
    h, w = src.shape[:2]
    u = np.arange(out_w, dtype=F32)
    v = np.arange(out_h, dtype=F32)
    xs = (u - ocx) / sx + cx
    ys = (v - ocy) / sy + cy
    x0 = np.clip(np.floor(xs), 0, w - 1).astype(np.int32)
    x1 = np.clip(x0 + 1, 0, w - 1)
    y0 = np.clip(np.floor(ys), 0, h - 1).astype(np.int32)
    y1 = np.clip(y0 + 1, 0, h - 1)
    fx = np.clip(xs - x0, 0, 1).astype(F32)[None, :, None]
    fy = np.clip(ys - y0, 0, 1).astype(F32)[:, None, None]
    rows = src[y0] * (1.0 - fy) + src[y1] * fy
    return rows[:, x0] * (1.0 - fx) + rows[:, x1] * fx


def box_blur(img, radius, passes=3):
    """Repeated box blur via cumulative sums ~= gaussian. img: (h,w,c)."""
    out = img
    for _ in range(passes):
        out = _box1d(out, radius, axis=1)
        out = _box1d(out, radius, axis=0)
    return out


def _box1d(img, r, axis):
    if r < 1:
        return img
    if axis == 0:
        pad = np.pad(img, ((r + 1, r), (0, 0), (0, 0)), mode='edge')
        cs = np.cumsum(pad, axis=0, dtype=np.float32)
        return (cs[2 * r + 1:] - cs[:-(2 * r + 1)]) / F32(2 * r + 1)
    pad = np.pad(img, ((0, 0), (r + 1, r), (0, 0)), mode='edge')
    cs = np.cumsum(pad, axis=1, dtype=np.float32)
    return (cs[:, 2 * r + 1:] - cs[:, :-(2 * r + 1)]) / F32(2 * r + 1)


def downsample(img, f):
    h, w, c = img.shape
    return img[:h - h % f, :w - w % f].reshape(h // f, f, w // f, f, c).mean(axis=(1, 3))


def upsample_to(img, out_h, out_w):
    h, w = img.shape[:2]
    ys = (np.arange(out_h, dtype=F32) + 0.5) * h / out_h - 0.5
    xs = (np.arange(out_w, dtype=F32) + 0.5) * w / out_w - 0.5
    y0 = np.clip(np.floor(ys), 0, h - 1).astype(np.int32); y1 = np.clip(y0 + 1, 0, h - 1)
    x0 = np.clip(np.floor(xs), 0, w - 1).astype(np.int32); x1 = np.clip(x0 + 1, 0, w - 1)
    fy = np.clip(ys - y0, 0, 1)[:, None, None].astype(F32)
    fx = np.clip(xs - x0, 0, 1)[None, :, None].astype(F32)
    rows = img[y0] * (1 - fy) + img[y1] * fy
    return rows[:, x0] * (1 - fx) + rows[:, x1] * fx


# --------------------------------------------------------------------------
# glow / grade
# --------------------------------------------------------------------------
def bloom(img, threshold=0.62, s1=0.55, s2=0.85, s3=0.55):
    """Three-octave additive bloom - gives the volumetric neon halo."""
    h, w, _ = img.shape
    bright = np.maximum(img - threshold, 0.0)
    b1 = box_blur(downsample(bright, 4), 3, 2)
    b2 = box_blur(downsample(bright, 12), 3, 3)
    f3 = 24 if (h % 24 == 0 and w % 24 == 0) else 20
    b3 = box_blur(downsample(bright, f3), 4, 3)
    return (upsample_to(b1, h, w) * s1
            + upsample_to(b2, h, w) * s2
            + upsample_to(b3, h, w) * s3)


ACES_A, ACES_B, ACES_C, ACES_D, ACES_E = 2.51, 0.03, 2.43, 0.59, 0.14


def aces(x):
    return np.clip((x * (ACES_A * x + ACES_B)) / (x * (ACES_C * x + ACES_D) + ACES_E), 0.0, 1.0)


def splat(buf, xs, ys, cols, gain=1.0):
    """Vectorised bilinear additive scatter of points into an (h,w,3) buffer."""
    h, w, _ = buf.shape
    x0 = np.floor(xs).astype(np.int32)
    y0 = np.floor(ys).astype(np.int32)
    fx = (xs - x0).astype(F32)
    fy = (ys - y0).astype(F32)
    flat = buf.reshape(-1, 3)
    for dx, dy, wx, wy in ((0, 0, 1 - fx, 1 - fy), (1, 0, fx, 1 - fy),
                           (0, 1, 1 - fx, fy), (1, 1, fx, fy)):
        xi = x0 + dx
        yi = y0 + dy
        m = (xi >= 0) & (xi < w) & (yi >= 0) & (yi < h)
        if not m.any():
            continue
        idx = yi[m].astype(np.int64) * w + xi[m]
        wgt = (wx[m] * wy[m] * gain).astype(F32)[:, None]
        np.add.at(flat, idx, cols[m] * wgt)
