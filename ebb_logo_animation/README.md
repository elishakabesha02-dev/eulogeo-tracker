# EBB International — Cinematic Logo Intro / Outro

A premium, movie-studio-style logo ident animated **entirely from the single
supplied artwork**. The logo is never redrawn, recoloured, re-typed or
restyled — it is lifted off its backdrop once and then driven for the whole
shot by continuous transforms, procedural effects and particle simulation.

![source](assets/ebb_logo_source.png)

## Deliverables

| File | Format |
|---|---|
| `output/EBB_International_Cinematic_Intro.mp4` | 1920×1080, 60 fps, H.264 High, yuv420p, faststart |
| `output/EBB_International_Cinematic_Intro_Square.mp4` | 1080×1080, 60 fps, H.264 High, yuv420p, faststart |
| `output/EBB_International_Cinematic_Intro_With_Sound.mp4` | 1920×1080 + AAC 192 kbps cinematic sound design |
| `output/ebb_sound_design.wav` | 48 kHz stereo master of the score |

## Timeline (7.40 s total)

| Time | Beat |
|---|---|
| 0.00–0.50 | Black → faint core glow → embers rush inward → medallion fades up, 0.865 → 1.00 scale |
| 0.50–3.00 | One full 360° perspective spin about the Y axis; blue plasma ignites around the bezel |
| 3.00–3.40 | Hero stop — damped inertia settle, shockwave, flames flare then decay |
| 3.40–5.50 | Breathing zoom 1.00 → 1.07 → 0.986 → 1.00; fire relaxes into drifting energy wisps |
| 5.50–7.00 | Fragment dissolve into blue particles and energy dust |
| 7.00–7.40 | Black |

## How the motion is made

**Everything is a smooth function of `t`.** There are no pre-rendered stills and
no stitched images — each frame is evaluated from continuous curves, so nothing
can step, pop or slideshow.

* **Easing.** Hero motion uses quintic smootherstep, which has *zero velocity
  and zero acceleration* at both ends. The spin therefore starts from a dead
  stop, accelerates, peaks at ~270 °/s mid-rotation and decelerates onto its
  mark without any visible snap.
* **True 3D rotation.** The medallion is a textured square plate of half-size
  `q` at a camera distance of 2300 units. Its corners are rotated about Y,
  perspective-projected, and a homography (4-point DLT) is solved from texture
  space to those corners. Every destination pixel is inverse-mapped through
  it — so the plate genuinely foreshortens and skews with perspective rather
  than squashing linearly. At 0° it is full width; approaching 90° it narrows
  to its machined edge; past 90° the reverse plate faces camera.
* **Anisotropic filtering.** A Y-axis spin compresses the texture along its X
  axis *only*, so the renderer keeps a horizontal-only mip chain and samples it
  trilinearly. That is the exact prefilter for this motion: it removes shimmer
  at grazing angles while keeping vertical detail razor sharp.
* **Real motion blur.** Frames whose rotation exceeds 0.62° are rendered as up
  to 6 sub-samples across a 0.62-frame shutter and averaged in premultiplied
  space — genuine temporal integration, not a directional smear.
* **The edge.** The medallion has 48 units of thickness. Its rim is the convex
  hull of the front and back face ellipses, computed analytically, shaded with a
  metal gradient across the thickness and lit by the plasma.
* **The reverse.** Deliberately radially symmetric machined chrome, so the EBB
  wordmark is never seen mirrored. Its outer bezel band is the *real* chrome
  ring from the artwork, so the rim reads as one continuous piece of metal
  through the whole spin.
* **Specular.** A travelling highlight tracks `sin θ` and therefore vanishes
  completely at the front-facing hero position — the hero frame is the
  untouched artwork.

## The blue fire

Not recoloured orange flame, and not brightness flicker. A periodic 3-D
value-noise field is sampled in the medallion's own polar space, with **time as
the third axis** — so the plasma evolves continuously and stays temporally
coherent instead of hashing frame to frame. Low radial frequency and high
angular frequency produce tongues that lick outward from the bezel.

Because the fire lives in texture space it is welded to the ring and is
foreshortened by the same warp as the metal. Layered on top: sharp noise ridges
gated in time give electric arcs, and a bright head chases the bezel leaving an
energy trail. Every angular frequency is an exact multiple of the noise
lattice period, so the ring has no seam at φ = π.

## Particles

Simulated once for the whole shot at fixed `dt`, with real velocity, drag and
lifetime — ambient dust, inrushing embers, bezel sparks (emission rate tracks
angular velocity), a hero-stop burst and dissolve shards. Each is drawn as a
short streak between its previous and current position, which is what gives
them physical motion blur. Pre-simulating means frames stay reproducible and
can be rendered out of order, in parallel.

## Dissolve

A key per pixel — `0.44 × left-to-right sweep + 0.30 × (1 − radius) +
0.26 × (fine noise + block noise)` — is thresholded by a sweep calibrated to
the key's measured distribution (0.035 … 0.727). The bezel lets go first, the
EBB wordmark survives longest, the boundary glows, and shard particles spawn
along the advancing front. The rim dissolves with the face, so nothing is left
standing.

## Grade

Linear HDR compositing → three-octave bloom → ACES filmic tonemap → gentle
S-curve → vignette → ordered dither. The dither is what keeps the deep navy
gradients free of 8-bit banding.

## Running it

```bash
pip install numpy pillow          # ffmpeg must be on PATH
python3 ebb_logo_animation.py --all             # both videos
python3 ebb_logo_animation.py --preview 3.05    # single frame QC
python3 ebb_audio.py                            # sound design only
```

| Flag | Meaning |
|---|---|
| `--wide` / `--square` / `--all` | which deliverables to render |
| `--preview T [T …]` | write PNGs at those timestamps (`$EBB_PREVIEW_DIR`) |
| `--crf`, `--jobs` | encode quality, worker processes |
| `--audio FILE` | mux a soundtrack while encoding |

## Files

```
ebb_logo_animation.py   timeline, projection, warp, plasma, particles, compositor
ebb_emblem.py           separates the artwork into face / halo, builds the reverse
ebb_core.py             easing, tileable 3-D noise, resampling, bloom, tonemap
ebb_audio.py            procedural sound design (no samples, no third-party audio)
assets/                 the original supplied artwork, untouched
```

Measured emblem geometry (from `assets/ebb_logo_source.png`): centre
(624, 609), chrome ring outer radius 556 px.

## Verified output

Measured on the encoded files, not asserted:

| Check | 1920×1080 | 1080×1080 | With sound |
|---|---|---|---|
| Container | H.264 High L4.2, yuv420p, 60 fps | ✔ | ✔ |
| Duration / frames | 7.400 s / 444 | 7.400 s / 444 | 7.400 s / 444 |
| Faststart (moov before mdat) | YES | YES | YES |
| Size / bitrate | 10.9 MB / 11.8 Mb/s | 8.1 MB / 8.7 Mb/s | 11.1 MB / 12.0 Mb/s |
| Audio | — | — | AAC 2ch 48 kHz 200 k |
| Frame 0 brightness | 0.000 (pure black) | 0.000 | 0.000 |
| Black tail | 0.35 s | 0.35 s | 0.35 s |
| **Motion discontinuities** (frame delta > 4× local median) | **0 of 443** | **0 of 443** | **0 of 443** |

Zero discontinuities means no jumps, no frame stepping and no slideshow
artefacts anywhere in the shot. The largest frame delta sits at t = 2.983 →
3.000 s, which is the intended hero-impact light burst: brightness ramps
smoothly in (47.6 → 49.2), bursts on the single lock-off frame (57.7) and
decays cleanly over the following 15 frames.

**Logo fidelity.** The front-facing hero frame correlates **0.856** with the
original artwork and only **0.500** with a mirrored copy — the medallion
returns to the front unreversed, and EBB / INTERNATIONAL /
PEOPLE • DATA • SOLUTIONS are preserved. The residual gap from 1.0 is the
cinematic grade (bloom, plasma light, breathing zoom), not geometry.

Audio master: peak 0.89, no clipped samples, negligible DC, with the intended
dynamic arc — intro 0.056 RMS, spin 0.186, impact 0.391, breathing 0.206,
dissolve 0.219, tail 0.041.
