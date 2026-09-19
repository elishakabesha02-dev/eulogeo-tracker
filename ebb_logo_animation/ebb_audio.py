#!/usr/bin/env python3
"""
EBB International - procedural cinematic sound design.

Every sound here is synthesised from scratch with numpy (noise, sines, swept
filters, synthetic impulse responses).  No samples, no copyrighted material.

    ambient hum      low futuristic bed, fades in from silence
    spin whoosh      band-passed noise whose pitch and level track the actual
                     angular velocity of the animation, so picture and sound
                     accelerate and decelerate together
    plasma crackle   sparse high-frequency electric transients
    hero impact      sub-bass drop + metallic strike at the moment it locks
    energy hum       soft pad under the breathing zoom
    dissolve         airy rising whoosh + granular sparkle
"""
from __future__ import annotations

import math
import os
import sys
import wave

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import ebb_logo_animation as A

SR = 48000


def _t(n):
    return np.arange(n, dtype=np.float64) / SR


def shaped_noise(n, env_fn, rng, block=2048):
    """Noise with a time-varying spectral envelope via overlap-add FFT.
    env_fn(time_s, freqs_hz) -> gain per bin."""
    hop = block // 2
    win = np.hanning(block + 1)[:block]
    out = np.zeros(n + block)
    src = rng.standard_normal(n + block)
    freqs = np.fft.rfftfreq(block, 1.0 / SR)
    for start in range(0, n, hop):
        seg = src[start:start + block] * win
        if seg.size < block:
            seg = np.pad(seg, (0, block - seg.size))
        spec = np.fft.rfft(seg) * env_fn((start + hop) / SR, freqs)
        out[start:start + block] += np.fft.irfft(spec, block)
    return out[:n]


def bell(f, c, w):
    return np.exp(-0.5 * ((np.log2(np.maximum(f, 1.0)) - math.log2(c)) / w) ** 2)


def reverb(x, seconds=2.2, decay=4.2, rng=None, mix=0.26):
    """Convolution reverb with a synthetic exponentially decaying noise IR."""
    n = int(SR * seconds)
    ir = rng.standard_normal(n) * np.exp(-np.linspace(0, decay, n))
    ir[:int(SR * 0.008)] *= np.linspace(0, 1, int(SR * 0.008))
    ir /= np.sqrt((ir ** 2).sum())
    size = 1 << int(math.ceil(math.log2(len(x) + n)))
    wet = np.fft.irfft(np.fft.rfft(x, size) * np.fft.rfft(ir, size), size)[:len(x)]
    return x * (1.0 - mix) + wet * mix * 2.2


def build(total=A.T_TOTAL, seed=4):
    rng = np.random.default_rng(seed)
    n = int(SR * total)
    t = _t(n)
    mix = np.zeros(n)

    # ---- angular velocity of the medallion, sampled at audio rate --------
    dt = 1.0 / 240.0
    grid = np.arange(0.0, total + dt, dt)
    ang = np.array([A.spin_angle(float(x)) for x in grid])
    vel = np.abs(np.gradient(ang, dt)) / 300.0                 # ~0..1
    vel = np.interp(t, grid, vel)
    lvl = np.interp(t, grid, np.array([A.energy(float(x)) for x in grid]))

    # ---- low futuristic ambient bed --------------------------------------
    amb_env = np.clip((t - 0.02) / 0.75, 0, 1) * (1.0 - np.clip((t - 6.6) / 0.6, 0, 1))
    hum = (0.34 * np.sin(2 * np.pi * 55.0 * t + 0.6 * np.sin(2 * np.pi * 0.21 * t))
           + 0.20 * np.sin(2 * np.pi * 82.5 * t)
           + 0.10 * np.sin(2 * np.pi * 110.0 * t + 1.1)
           + 0.05 * np.sin(2 * np.pi * 164.8 * t))
    mix += hum * amb_env * 0.30
    mix += shaped_noise(n, lambda s, f: bell(f, 180, 1.5) * 0.9, rng) * amb_env * 0.05

    # ---- spin whoosh: pitch + level follow real angular velocity ----------
    vin = np.interp(np.linspace(0, total, 512), t, vel)

    def whoosh_env(s, f):
        v = float(np.interp(s, np.linspace(0, total, 512), vin))
        centre = 260.0 * (2.0 ** (2.4 * v))
        return (bell(f, centre, 0.95) + 0.35 * bell(f, centre * 2.4, 0.7)) * (0.25 + 1.5 * v)
    mix += shaped_noise(n, whoosh_env, rng) * 0.16

    # a tonal component that rises with the spin, for the "technological" edge
    ph = 2 * np.pi * np.cumsum(180.0 * (2.0 ** (1.9 * vel))) / SR
    mix += np.sin(ph) * (vel ** 1.6) * 0.055
    mix += np.sin(ph * 1.5) * (vel ** 2.2) * 0.022

    # ---- plasma crackle ---------------------------------------------------
    crack = np.zeros(n)
    k = int(300 * float(np.mean(lvl)) + 140)
    pos = rng.integers(int(SR * 0.45), n - SR // 6, k)
    for p in pos:
        ln = int(SR * rng.uniform(0.004, 0.022))
        seg = rng.standard_normal(ln) * np.exp(-np.linspace(0, 9, ln))
        crack[p:p + ln] += seg * rng.uniform(0.15, 1.0)
    crack = shaped_noise(n, lambda s, f: bell(f, 4200, 1.15), rng) * 0 + crack
    mix += crack * np.interp(t, grid, np.array([A.energy(float(x)) for x in grid])) * 0.085

    # ---- hero impact ------------------------------------------------------
    i0 = int(SR * A.T_SPIN)
    ln = min(int(SR * 2.4), n - i0)
    lt = _t(ln)
    sub = np.sin(2 * np.pi * np.cumsum(np.linspace(88.0, 33.0, ln)) / SR) * np.exp(-lt * 3.1)
    click = rng.standard_normal(ln) * np.exp(-lt * 38.0)
    ping = sum(np.sin(2 * np.pi * fr * lt + rng.uniform(0, 6)) * amp * np.exp(-lt * dcy)
               for fr, amp, dcy in ((523.3, 0.30, 5.5), (784.0, 0.20, 6.5),
                                    (1174.7, 0.12, 8.0), (1864.7, 0.07, 10.0)))
    mix[i0:i0 + ln] += sub * 0.62 + click * 0.10 + ping * 0.24

    # pre-impact swell
    pre = int(SR * 0.55)
    ps = max(0, i0 - pre)
    swell = np.linspace(0, 1, i0 - ps) ** 3
    mix[ps:i0] += shaped_noise(i0 - ps, lambda s, f: bell(f, 900, 1.3), rng) * swell * 0.13

    # ---- soft energy hum under the breathing zoom -------------------------
    bz = np.clip((t - A.T_HERO) / 0.5, 0, 1) * (1.0 - np.clip((t - A.T_BREATH) / 0.5, 0, 1))
    breath = 0.5 + 0.5 * np.sin(2 * np.pi * 0.42 * (t - A.T_HERO))
    mix += (np.sin(2 * np.pi * 110.0 * t) * 0.16 + np.sin(2 * np.pi * 220.5 * t) * 0.07
            + np.sin(2 * np.pi * 330.0 * t) * 0.035) * bz * (0.55 + 0.45 * breath) * 0.55

    # ---- dissolve: airy whoosh + granular sparkle -------------------------
    ds, de = A.T_BREATH, A.T_OUTRO
    dmask = np.clip((t - ds) / 0.35, 0, 1) * (1.0 - np.clip((t - de + 0.25) / 0.45, 0, 1))
    prog = np.clip((t - ds) / (de - ds), 0, 1)

    def diss_env(s, f):
        p = min(max((s - ds) / (de - ds), 0.0), 1.0)
        return bell(f, 700 * (2.0 ** (2.6 * p)), 1.25) * (0.4 + 1.3 * math.sin(math.pi * p) ** 0.7)
    mix += shaped_noise(n, diss_env, rng) * dmask * 0.15

    spark = np.zeros(n)
    for _ in range(420):
        p = int(SR * rng.uniform(ds + 0.05, de))
        ln2 = int(SR * rng.uniform(0.010, 0.055))
        if p + ln2 >= n:
            continue
        fr = rng.uniform(1800, 7200)
        lt2 = _t(ln2)
        spark[p:p + ln2] += (np.sin(2 * np.pi * fr * lt2) * np.exp(-lt2 * rng.uniform(40, 130))
                             * rng.uniform(0.2, 1.0))
    mix += spark * 0.085

    # sub drop as it lets go
    mix += np.sin(2 * np.pi * np.cumsum(np.full(n, 42.0)) / SR) * dmask * (1 - prog) ** 2 * 0.10

    # ---- space + master ---------------------------------------------------
    mix = reverb(mix, 2.4, 4.0, rng, 0.24)

    # gentle stereo widening via a short decorrelating delay
    d = int(SR * 0.011)
    left = mix.copy()
    right = mix.copy()
    left[d:] += mix[:-d] * 0.16
    right[d:] += mix[:-d] * -0.16
    st = np.stack([left, right], 1)

    # fades, soft limit, normalise
    fi = int(SR * 0.03)
    st[:fi] *= np.linspace(0, 1, fi)[:, None]
    fo0 = int(SR * (A.T_OUTRO - 0.05))
    st[fo0:] *= np.linspace(1, 0, n - fo0)[:, None] ** 1.6
    st = np.tanh(st * 1.5) / 1.5
    st /= max(np.abs(st).max(), 1e-9)
    return (st * 0.89)


def write_wav(path, data):
    d = np.clip(data, -1, 1)
    pcm = (d * 32767.0).astype('<i2')
    with wave.open(path, 'wb') as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())
    return path


if __name__ == '__main__':
    out = sys.argv[1] if len(sys.argv) > 1 else os.path.join(
        os.path.dirname(os.path.abspath(__file__)), 'output', 'ebb_sound_design.wav')
    os.makedirs(os.path.dirname(out), exist_ok=True)
    write_wav(out, build())
    print('wrote', out)
