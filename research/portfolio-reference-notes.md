# Portfolio Reference Notes

Research pass on July 2, 2026.

## Screenshots Captured

- `research/portfolio-screenshots/bangle-home.png`
- `research/portfolio-screenshots/bangle-work.png`
- `research/portfolio-screenshots/bangle-timeline.png`
- `research/portfolio-screenshots/jia-home.png`
- `research/portfolio-screenshots/jia-about.png`
- `research/portfolio-screenshots/jia-writing.png`

## Reference Sites

### Bangle Wei

Pages reviewed:

- `https://banglewei-com.vercel.app/`
- `https://banglewei-com.vercel.app/work.html`
- `https://banglewei-com.vercel.app/timeline.html`

Notes:

- The home page is memorable because it spends nearly the whole first viewport on one huge typographic gesture and very few words.
- Navigation is small, quiet, and peripheral. It reads like part of the atmosphere rather than a standard portfolio header.
- The work page avoids cards. It uses a dated ledger: date, sentence, arrow. This makes work feel chronological and lived-in.
- The timeline page has a thesis, not a category title: "I am defined by my failures" and "because it means I tried." That framing makes a list of milestones feel authored.
- The best transferable move is not the exact visual style. It is the combination of sparse rows, dated proof, and one personal editorial claim.

What not to copy:

- The text is sometimes too low-contrast.
- The nav has more links than this portfolio needs.
- The pure black page would fight the existing hyacinth scene if copied directly.

### Jia Chen

Pages reviewed:

- `https://jia.sc`
- `https://jia.sc/about`
- `https://jia.sc/writing`

Notes:

- The home page is anchored by a real personal place. The first impression is emotional and specific before it is informational.
- The about page is not a résumé summary. It is a long personal story with photos, captions, and oddly specific memories.
- The writing page is radically sparse: a title and a handful of links. The confidence comes from refusing extra explanation.
- The site uses lowercase, direct language. It feels like a person left the door open, not like a template was filled in.
- There is no dedicated work/projects page. Current work and public output are woven into the home and writing surfaces.

What not to copy:

- The long-scroll about story does not fit this repo's desktop no-scroll rule.
- The full-bleed video/photo hero is unnecessary here because the hyacinth is already the main visual object.
- The casual lowercase voice should not be copied unless Andreas wants that tone.

## What A Nice Portfolio Website Looks Like

- It has one unforgettable object or mood in the first viewport.
- It gives the visitor a strong sense of the person before listing credentials.
- It uses fewer, sharper words instead of explanatory paragraphs.
- Work is presented with evidence: dates, outcomes, links, awards, shipped artifacts, or public traces.
- The about page contains personal specificity, not just fields of interest.
- The layout makes absence useful. Empty space is part of the composition.
- Navigation stays quiet and predictable.
- The site chooses a point of view and repeats it across pages.

## Plan For This Portfolio

The existing hyacinth stage is already the memorable object. The tweaks should make `/projects` and `/about` feel more authored without adding desktop scroll or hard-coded copy.

### Projects Page

Goal: replace the current "project cards" feeling with a tighter selected-work ledger.

1. Extend project Markdown frontmatter in `content/projects/*.md` with editable evidence fields:
   - `date`
   - `role`
   - `outcome`
   - `artifact_label`
2. Update `lib/content.ts` so those fields are typed and available to the page.
3. Rework `app/projects/page.tsx` from a tile grid into a dated ledger:
   - left column: date or season
   - middle: project title, one-line outcome, compact description
   - right edge: small arrow or artifact link
4. Replace broad tech chips with proof chips where available:
   - finalist medallion
   - Wolfram Community post
   - simulation, poster, demo, paper, or award labels
5. Keep the page inside `FullscreenShell` and preserve the flower on the right.
6. Use CSS that feels like a field notebook over the hyacinth stage:
   - thin separators instead of cards
   - restrained hover/focus glow
   - compact row height
   - enough contrast to beat Bangle's readability issue

### About Page

Goal: move from a generic interest ledger to a compact personal field-note page.

1. Expand `content/about.md` with editable sections:
   - `now`
   - `throughline`
   - `notes`
   - optional `artifacts` if local personal images are available later
2. Update `lib/content.ts` with typed `AboutNote` and optional `AboutArtifact` structures.
3. Rework `app/about/page.tsx` into a two-part composition:
   - left: title plus a sharper first-person lede
   - right: 4 to 5 field notes with small labels, like "physics," "flight," "software," "violin," "water"
4. Keep the interest content, but make each row more concrete:
   - not "Computer Science / software & algorithms"
   - closer to "software / making tools that make hard systems visible"
5. If Andreas has usable personal images, add a tiny artifact strip with captions. If not, do not add stock imagery.
6. Preserve the no-scroll desktop rule. On small screens, allow vertical flow as the current shell already does.

### Shared Polish

- Keep all visible copy in Markdown.
- Keep navigation unchanged unless the page copy reveals a better label.
- Keep the hyacinth static with respect to cursor movement.
- Avoid large opaque panels that cover the flower.
- Use existing typefaces: Cinzel for title moments, Crimson Text for intimate copy, Special Elite for dates and labels.
- Add only subtle entrance/hover motion, no new spectacle.

## Implementation Order

1. Content model: update Markdown and `lib/content.ts`.
2. Projects: convert tiles to selected-work ledger.
3. About: convert interest ledger to field notes.
4. Responsive pass: verify desktop fits in one viewport and mobile can scroll cleanly.
5. Verification: run `npm run lint` and `npm run build`.
