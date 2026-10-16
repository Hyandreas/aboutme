# The original hyacinth, reconstructed in 3D

Updated October 13, 2026. The existing dotted hyacinth now uses a reconstructed 3D model and a native scroll-driven camera on the actual homepage. The rejected implementation is archived outside the application at `/private/tmp/hyacinth-rejected-20261013-202445`. Nothing has been pushed.

## Current scope

This is a personal portfolio. Its hyacinth is a visual motif, not the subject of the website. The user likes the existing visual and intentionally chose dots. Change the flower's underlying spatial structure while preserving its existing appearance and the rest of the site.

Keep the pages, Markdown copy, navigation, typography, layout, backgrounds, initial framing, TV introduction, ambient movement, and existing bloom interaction. Do not add flower explanations, new chapters, inspection controls, content sections, or another flower-themed demo. The user's clarification explicitly authorizes scrolling to change the view of the existing flower. The homepage keeps its original composition while a native scroll range drives the camera; other pages retain their current behaviour.

The [Lusion research](skills/lusion-spatial-storytelling/references/field-notes.md) remains useful for spatial quality and deliberate movement. It does not define this portfolio's subject or content.

## What went wrong

The first implementation replaced the distinctive photographed flower with a generic procedural specimen. Its regular lobes, flower arrangement, palette, dot density, shading, and silhouette differed substantially. Functional checks and multi-angle captures did not establish visual fidelity. Integrating that replacement before a close comparison with the original was the wrong gate.

Do not continue polishing that specimen. Reconstruct the particular flower in `public/assets/hyacinth.png`, constrained to the existing rendered entry view. The tall folded crown, dense irregular left cluster, right-facing blossoms, large lower-centre bloom, thin luminous veins, and overlaps are identifying features.

## Baseline that must be preserved

The active `HyacinthBackdrop` loads the PNG through `buildPhotoCloud` in `hyacinth3d.js`. It samples the photograph, discards the black background, wraps the samples around a cylindrical arc, and adds brightness relief. This gives the samples depth coordinates but does not reconstruct independent petals or concealed surfaces.

Use the original **rendered portfolio** as the comparison target, not just the source PNG. The camera, cylinder, shader, bloom, canvas translation, and original point sampling all contribute to the appearance the user approved. Desktop, mobile, and construction framing must each retain their existing composition.

Capture the original at a recorded viewport, pixel ratio, camera pose, elapsed time, completed introduction, and idle bloom state. Record the actual sampled point count, buffers, seeds, screen positions, colours, sizes, and postprocessing. The original seeds vary between mounts; comparison captures must share a fixed recorded sample set rather than compare two independently jittering clouds.

## Reconstruction method

1. **Trace the visible forms and overlap order.** Mark individual petals, floret attachments, curved edges, folds, the stem, and which surface sits in front of which. Do not substitute a regular spiral of identical six-lobed flowers.
2. **Model those particular forms.** Build separately curved petal surfaces, connected throats and attachments, actual undersides, and concealed geometry. A photograph-constrained sculpt or individually fitted curved patches is appropriate. Generic procedural botanical geometry, an extruded silhouette, and a curved image sheet are insufficient.
3. **Fit the model to the original camera.** Match projected contours and overlap relationships before sampling or changing the shader. Complete one distinctive blossom first; verify its front and profile before assembling the rest.
4. **Preserve the observed dots.** Keep the original front samples, colours, seeds, and apparent density. Move each observed sample onto its corresponding reconstructed surface along its original camera ray. For camera position `C` and original world point `P`, a point on `C + t(P - C)` retains its projected position. Compensate its physical point diameter for the new camera-space depth so it retains its original apparent diameter in the entry view. Validate this numerically and visually rather than assuming it matches.
5. **Complete the hidden surfaces.** Sample the actual side, underside, throat, and rear surfaces into additional dots with consistent material detail. These samples must remain concealed where appropriate at the original view and become visible naturally as the view changes. Do not mirror or duplicate the front photograph onto the back.
6. **Keep the existing treatment.** Preserve the original fine dot footprint, bright cyan/blue/violet/magenta detail, glow, and ambient behaviour. The photograph already contains illumination; adding a new front-lighting pass can repaint it. Any new surface response must preserve the approved entry appearance.

A single photograph does not uniquely specify depth or show the back. The observed view can be constrained closely; concealed surfaces must be modeled as a coherent interpretation. Do not claim an exact recovery of unseen anatomy.

## Replacement gates

The reconstruction is compared with the original renderer in an isolated, blank rendering fixture. The accepted local implementation then uses the existing portfolio mount. No new public route or visible copy is needed for diagnosis.

**First: fidelity.** Compare original and reconstructed renders at the same camera, viewport, sample set, and animation phase. Use an aligned overlay and difference image as well as a side-by-side view. Match the silhouette, scale, placement, individual blossom contours, negative spaces, overlaps, colours, vein detail, apparent dot sizes, and density. Check the comparison in the actual personal-site layout. A merely recognisable blue-purple flower does not pass.

**Then: spatial structure.** Inspect three-quarter, side, rear, and elevated views. Independent petals need real curvature and thickness, connected attachments, visible undersides, correct changing occlusion, and meaningful separation. Camera translation must alter the relative alignment of near and far parts. A nonzero depth range does not establish a reconstructed object.

**Finally: integration.** Use the existing backdrop after both visual gates pass. Wire the actual homepage's scroll position to its camera. Verify physical wheel input, reverse scrolling, keyboard input, route transitions, mobile and construction framing, introduction, existing bloom behaviour, ambient motion, and mounting/cleanup. Run lint and build. Preserve the content pipeline and compact shell on the other pages. Geometry-only diagnostics do not establish that the public page responds to scrolling.

## Scroll implementation

`FullscreenShell` opts into a scroll scene only on `/`. Its existing main content stays fixed in the viewport, with a 260svh native document range behind it. If short screens or enlarged text make the copy taller than the viewport, it keeps its original document flow so all text remains reachable. `HyacinthBackdrop` reads wheel, touch, and keyboard scrolling through the browser's ordinary scroll position. There is no wheel cancellation, scroll hijacking, cursor-driven movement, or new visible copy.

The camera starts at exactly the approved entry pose. By the end of the range it has moved through a 42-degree arc, from -24 to +18 degrees, while approaching from radius 10.8 to 8.7. Mobile uses a 32-degree arc and ends at radius 9.4. Elevation and the viewing target ease with the same progress. Elapsed-time damping smooths the view; reduced-motion mode removes this trailing motion. Scrolling backward traverses the same path. The old progress-driven palette, fog, and instrument changes stay at their initial treatment.

The TV intro retains its scroll lock. Leaving the homepage removes its scroll class and listeners. The current text, navigation, image, colours, dependencies, and page content remain intact.

Performance changes must be justified by measurement and must not quietly simplify the approved front view. Sample hidden geometry once, keep buffers persistent, and use the existing renderer. Do not add a framework, asset-generation service, or unrelated lifecycle redesign to this correction.

## Status

The reconstruction and homepage camera are implemented in the existing backdrop. Eight structural tests and nine camera tests pass, including true depth parallax and deterministic reverse movement. See [the implementation record](hyacinth-reconstruction/README.md) for browser evidence and limitations. The rejected demo remains removed; broader content and site redesigns remain outside this change.

The user's subsequent request for a more substantial, paper-like scroll journey is planned separately in [the 22-viewport camera storyboard](hyacinth-scroll-journey-plan.md). That proposal has not been implemented.
