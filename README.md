# aboutme

Personal portfolio of **Andreas Tsang** — applied physics, aerospace, computer science, and violin.

**Live:** https://hyandreas.xyz

The homepage is a scroll-driven 3D scene: a photograph of a hyacinth reconstructed as a WebGL
point cloud that the camera orbits while crossfading text "beats" tell the story. A second page,
`/projects`, lists selected work.

## Stack

- Next.js 15 (App Router) · TypeScript · Tailwind CSS
- Framer Motion (DOM animation) · three.js 0.160 (the homepage point cloud)
- Content authored in Markdown under `content/`, read at build time

## Develop

```bash
npm install
npm run dev      # http://localhost:5001
npm run build    # production build
npm run start    # serve the production build on :5001
npm run lint     # ESLint, zero warnings
```

> Don't run `npm run build` while `npm run dev` is running — see `CLAUDE.md`.

## Editing content

All site text lives in `content/` as Markdown — no code changes needed:

- **`content/home.md`** — every word on the homepage (hero, beats, work items, footer). Wrap a
  word in `*asterisks*` for the lilac emphasis; multi-line headings are YAML lists.
- **`content/projects/*.md`** — one file per project on `/projects` (`title`, `status`, `tech`,
  `link`; the body is the description).
- **`content/config.md`** — site flags (e.g. `lockdown`).

See [`CLAUDE.md`](./CLAUDE.md) for architecture notes.
