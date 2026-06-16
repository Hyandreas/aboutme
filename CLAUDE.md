# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # Start dev server on port 5001
npm run build     # Production build
npm run start     # Serve production build on port 5001
npm run lint      # ESLint with zero warnings allowed
```

> ⚠️ **Never run `npm run build` while a `npm run dev` server is running.** A production build
> overwrites `.next/` underneath the dev server and corrupts it (pages start returning 500 /
> `Cannot find module './vendor-chunks/…'`). Cure: stop dev, `rm -rf .next`, restart dev.

## Architecture

Next.js 15 portfolio (App Router, TypeScript, Tailwind CSS, Framer Motion, three.js). **Two routes:**

- **`/`** — the homepage scene: a scroll-driven 3D experience.
- **`/projects`** — a list of selected work (an older editorial-styled page, kept by choice).

There is intentionally no `/about`, `/skills`, or `/contact` — the homepage scroll covers
About / Work / Contact.

### Homepage — the Hyacinth scene (`/`)

`app/page.tsx` (server) reads `content/home.md` and passes it to
`app/components/hyacinth/HyacinthClient.tsx` (`'use client'`), which renders:

- **`hyacinth3d.js`** — the WebGL scene (vanilla three.js, ported from a design bundle). A photo
  (`public/assets/hyacinth.png`) is resampled into a ~130k-point cloud; one smoothed scroll value
  drives a two-revolution camera orbit plus bloom, fog, and light. It is **dynamic-imported inside
  `useEffect`** so its browser globals never run during SSR, and it exposes `dispose()` for a clean
  route unmount.
- **`hyacinth.css`** — the scene styles, all scoped under a `.hy` wrapper so nothing leaks site-wide.
- `three` is pinned to **0.160.0** to match the source bundle — don't bump casually.

**All homepage text lives in `content/home.md`**, which maps 1:1 to the `HomeContent` interface in
`HyacinthClient.tsx`. Conventions: wrap a word in `*asterisks*` to render the lilac `<em>` emphasis;
multi-line headings/ledes are YAML string arrays; `interests` and `work` are arrays of objects.

### Content system

All editable content lives in `content/` as Markdown with YAML frontmatter. `lib/content.ts`:

- `getPageContent<T>(filePath)` — typed frontmatter + body for any file.
- `getAllProjects()` — every `.md` under `content/projects/` → `ProjectData[]`.
- `getConfig()` — `content/config.md` site flags.

**Adding a project:** create a new `.md` in `content/projects/` with frontmatter `title`, `status`
(`current` | `past` | `future`), `tech` (array), and optional `link`; the body becomes the
description. It appears on `/projects` automatically.

### Global chrome & route gating

The root layout (`app/layout.tsx`) renders site-wide decorative client components (LivingInk
flow-field background, grain, void effects, magnetic cursor, page/entrance curtains).
`app/components/RouteGate.tsx` (`hideOn: string | string[]`) suppresses them per-route:

- the ambient set is hidden on `/` (the scene supplies its own atmosphere and needs an unlocked
  scroll + visible cursor);
- the entrance/route curtains are hidden on `/` **and** `/projects` (they delayed first paint and
  locked scroll). `/projects` instead shows a lightweight loading veil —
  `app/components/Overture.tsx` (+ `overture.css`), the same counter curtain the homepage uses.

**Lockdown mode:** `content/config.md`'s `lockdown: boolean` → the layout renders `LockdownOverlay`
over the whole site (gate it during development).

### Conventions

- **Page pattern:** a server `page.tsx` fetches content, then passes it to a `'use client'`
  `*Client.tsx` for interactive/animated UI.
- **Fonts:** Google Fonts (Cinzel, Crimson Text, Special Elite) via `@import` in `app/globals.css`;
  `font-display` / `font-serif` / `font-mono` are defined in `tailwind.config.js`.
- **Path alias:** `@/` maps to the repo root (`tsconfig.json`).
- Orphaned on disk (unused but kept, recoverable): `app/components/Hero.tsx` +
  `MarionetteStrings.tsx` from the previous multi-page homepage.
