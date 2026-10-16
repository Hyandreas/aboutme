# Etched environment revision

This revision replaces the broad glossy membranes and repeated crescent fragments with a more restrained material and more detailed supporting forms. The dotted hyacinth, personal interface and centered 44-viewport camera journey remain as they were.

Three asymmetric folded fields are drawn with fine antialiased contour lines and occasional cross-ribs. Their broad openings frame the subject. Scroll changes their orientation, depth and folding, with tighter overlap in the central passage and an open aureole at the final reveal. Twelve smaller orbit knots on desktop, seven on mobile, repeat the same engraved material at another scale.

The palette is violet, lilac and pearl, with limited mineral turquoise and copper highlights. Particle halos have scalloped, interrupted contours. The distant background uses textured pigment pools and isolated light ridges instead of repeated neon stripes. Quiet sections retain visible surrounding forms; blooms strengthen their light. On phones, the reading shade eases away below the text after entry so it does not obscure the fine artwork across the entire screen.

## Visual evidence

Actual Chrome captures, taken while scrolling the production preview:

- `live-02-approach.png`: early, open composition beside the flower.
- `live-20-passage.png`: centered close passage with denser contour overlap.
- `live-26-quiet.png`: darker passage with the supporting layers still present.
- `live-42-release.png`: settled, centered wide reveal.
- `live-mobile.png`: the phone rendering settings.

## Validation

- Production build and lint pass.
- Twenty focused tests pass for camera continuity, entry preservation, centering, scroll reversal, persistent environment, reduced-motion state and resource disposal.
- Live desktop rendering reported no application/shader errors. Forward and reverse scrolling and the early, central, quiet and final compositions were inspected directly.
- The separate offscreen capture fixture timed out during startup. Its run is not treated as passing; the images above come from the real page in Chrome.
- No new assets, dependencies, visible page copy or routes were introduced. The world still uses four mesh batches, alongside the existing three particle batches and background shader. No frame-rate claim is made.

Art direction and storyboard: `../hyacinth-world-implementation/art-direction.md`.
Preview: `http://127.0.0.1:5003/`. Nothing pushed.
