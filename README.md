# Transcendent Life in Christ — website

A static website for Transcendent Life in Christ, the ministry founded by
Apostle Benjamin Zulu. No build step, no dependencies, no CDN calls — open
`index.html` and it runs.

```
index.html                              home
teachings/the-transcendent-mandate.html the foundational teaching, full text
assets/css/site.css                     all styling
assets/js/site.js                       nav, scroll reveals, reading bar, form
assets/fonts/                           self-hosted Bodoni Moda, Spectral, Archivo
assets/img/                             crest, portraits, icons, social image
site.webmanifest, robots.txt, sitemap.xml
```

## Before you publish: five things to replace

Everything below is a placeholder. Each one is marked in the HTML with an
`EDIT ME` comment and a `data-edit` attribute, so you can find them by
searching for `data-edit`.

| What | Where | Currently says |
| --- | --- | --- |
| Service times (3) | `index.html`, `#gather` section | `00:00 — add your time` |
| Email address | `index.html`, `#connect` section | `hello@yourdomain.com` |
| Phone / WhatsApp | `index.html`, `#connect` section | `+00 000 000 000` |
| Meeting address | `index.html`, `#connect` section | `Street address · City · Country` |
| Form recipient | `index.html`, `<form data-mailto="…">` | `hello@yourdomain.com` |

Also update the domain in three places once you have one: the `<link rel="canonical">`
and `og:` tags at the top of both HTML files, and `sitemap.xml` / `robots.txt`.

## The contact form

It has no server behind it. On submit, JavaScript composes the message and
opens the visitor's own email app addressed to `data-mailto`. That works
everywhere with zero setup.

To collect submissions online instead, sign up with a form service (Formspree,
Basin, Netlify Forms) and add its URL to the form tag:

```html
<form class="form" method="POST" data-endpoint="https://formspree.io/f/XXXX"
      action="https://formspree.io/f/XXXX">
```

When `data-endpoint` is present the script steps aside and the browser posts
the form normally. Then delete the explanatory note under the send button.

## Publishing it

Any static host works. The simplest is GitHub Pages: in the repository, go to
**Settings → Pages**, choose **Deploy from a branch**, pick your branch and the
`/ (root)` folder. Netlify, Vercel and Cloudflare Pages all work by pointing
them at this repository with no build command.

## Design notes

- **Ground is pure black** (`#000`), because that is the crest's own
  background. The crest images are composited onto `#000` so their edges are
  invisible against the page — if you ever change `--ink`, re-composite them or
  the artwork will show as a rectangle.
- **Palette**: crown gold `#c9a227`, scrollwork silver `#c6cbd2`, cool-biased
  neutrals. All defined as custom properties at the top of `site.css`.
- **Typefaces**: Bodoni Moda (display), Spectral (reading), Archivo (labels and
  navigation) — self-hosted as woff2, latin subset only, ~240 KB total.
- **Bodoni's optical-size axis**: `opsz` must roughly match the size the text
  actually renders at. Set it too high and hairline strokes — em dashes
  especially — thin out to nothing. Avoid em dashes inside Bodoni display text.
- **The crest sheen** uses `mix-blend-mode: overlay`, which leaves pure black
  untouched and lifts only the metal. It is clipped to the artwork and disabled
  under `prefers-reduced-motion`.
- The site commits to one dark theme rather than following the OS light/dark
  setting, and paints every colour explicitly.

## Images

Source photographs were cropped and processed for the web:

- `crest-hero*.jpg` — the crest, tight-cropped to its artwork on pure black.
- `founder-portrait*.jpg` — the podium photograph, cropped to 4:5.
- `founder-standing*.jpg` — the studio photograph, with the phone screenshot's
  letterboxing, caption bar and watermark removed.
- `og-image.jpg` — 1200×630 social card.
- `favicon*`, `apple-touch-icon.png` — the crowned globe alone; the scrollwork
  is unreadable below 64px.
