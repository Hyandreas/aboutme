# Secondary forms: origins and continuity

Status: proposed choreography; no implementation changes.

## Direction

Give the existing etched fields, curled forms, and dotted currents a believable origin. The visitor should discover an environment already surrounding the flower, then see the flower send smaller forms into that environment. Keep the current material language and the 44-viewport descent, with distinct quiet intervals and peaks.

The opening stays a personal portrait with a dotted hyacinth. Two incomplete, faint contour fragments behind the flower establish depth before scrolling. A very fine strand follows the edge of one upper petal. These are identifiable early states of forms encountered later, placed predominantly around the flower and away from the reading area.

## Observed problem

The current implementation hides both secondary groups at viewport zero, then applies the same `ease(at / 0.9)` reveal to their full geometry. The sky and DOM shading also change over the same interval. This brings all scales of detail into view together. Actual Chrome inspection at zero and 0.65 viewport confirmed the large difference: the second frame already contains broad surrounding fields, multiple curls, and particle arcs.

Large fields are currently composed mostly in camera space, with only a 17 percent blend toward world positions. Some small forms also follow camera-relative positions. Atmospheric origins follow the camera's blended look target. These choices maintain framing but do not establish a stable source for the forms.

## Storyboard

| Scroll distance | Composition and action |
| --- | --- |
| 0 | Flower remains dominant. Two incomplete indigo/lilac contours are perceptible deep behind it, with restrained ambient light. A short luminous thread hugs an upper petal edge. No foreground sweep. |
| 0–1.5 viewports | Camera movement separates those background contours from the flower through parallax. Their existing shapes become easier to read. The petal thread remains attached. No mass arrival of curls or halos. |
| 1.5–4 | One distant contour turns into the light and reveals its folded surface progressively. Another remains recessed. A highlight travels along the petal thread, suggesting where the next motion will begin. |
| 4–6 | During the existing upper-petal preparation, the thread starts lifting from the lip. Its base follows the deformed petal. Dots travel along the growing thread and gather into the first small curl. |
| 6–9 | The first petal opens. The curl unfurls into the existing engraved form, extending outward before drifting away. A broken dotted wave travels from the same petal into the surrounding field. The field brightens locally only when the wave reaches it. |
| 9–14 | The released curl moves into the environment while the camera moves on. Background fields remain legible at lower intensity. Their apparent size and overlap change with depth. |
| 14–24 | The middle bloom develops a broader, oblique fan from its own petal anchor. Existing forms carry the transition into the centered passage. Source, unfolding, and surrounding response overlap but peak at different scroll positions. |
| 24–28 | Quiet passage: persistent dark contours and occasional traveling glints. Previously released forms recede through depth. |
| 28–38 | The lower bloom sends a longer downward curl along the descent. Nearby field ridges respond in sequence. |
| 38–44 | The pullback reveals how the forms occupy one shared volume around the flower. The wide aureole grows from contours already encountered. |

Background discovery and petal emission have different motion: large fields reside in space; small forms start attached to anatomy, unfold, and then drift into that space. A shared palette and engraved material connect them.

## Implementation

1. Add a shared secondary choreography sampler, with independent tracks for distant-field illumination, thread growth, curl unfolding, release, and the response traveling through the surrounding field. Replace the single global entrance ramp in the world, atmosphere, sky, and page shading. Preserve subtle baseline visibility at zero; keep the overall page brightness stable during the first scroll.
2. Compose the large fields in world space around the camera's existing route. Use real depth, partial occlusion, perspective, and changing illumination to reveal them. Stage their initial silhouettes in the opening camera so they are readable without crowding the flower. Avoid continuously re-centering them on the camera.
3. Extend the existing petal rig API to expose a deformed edge anchor and tangent/normal frame. `getFocus()` currently provides a moving tip position; the new emitter needs an orientation as well. Use the same deformation as the dots and depth surface so the strand cannot slide across the petal.
4. Keep persistent secondary geometry. Reveal a small curl along its length and gradually unfold it from the petal frame into an authored trajectory. Blend its attachment into a stable release frame before it drifts away. Preserve the flower's original points; the emitted strand is a secondary layer aligned with them.
5. Replace arbitrary repeating halo origins with authored wave paths from those petal anchors. Travel down the strand precedes the distant field response. A delay measured in scroll distance makes the causal sequence reversible and consistent when the visitor stops.
6. Coordinate GPU motion and DOM shading from the same sampled progress. Use deterministic scroll functions rather than spawn events or accumulating simulations. Treat ambient motion separately and keep it small enough that it cannot obscure the authored sequence.
7. Check occlusion carefully at the opening: the flower's existing anatomical depth surface is currently skipped at the exact reference pose. Compose recessed fields and, if necessary, add occlusion limited to the secondary render without changing the original dotted portrait.

Reuse the existing Three.js renderer, mesh batches, point batches, and petal rig. Keep content, navigation, and the established camera composition. Other routes retain their current treatment. On mobile, reduce concurrent strands rather than removing their origins. Reduced motion retains the faint opening environment and uses restrained illumination changes in place of large unfolding motion.

## First milestone and acceptance

Build and inspect only the 0–10 viewport sequence first: faint resting environment, parallax discovery, one connected petal thread, its curl, and one traveling response. Use that sequence to tune scale and timing before applying the behavior to later blooms.

Capture actual browser states at 0, 0.25, 0.65, 1.5, 3, 5, 7, and 9 viewports, and inspect continuous forward/reverse movement. The first small scroll must show recognizable movement of what was already visible. Each new prominent form must be traceable to a background silhouette or a petal strand. The first full-strength response belongs near the first bloom, around 8–9 viewports.

Then inspect the full 44 viewports, phone layout, reduced motion, fast scroll, restored scroll position, resizing, and route changes. Verify that anchors do not snap at focus-slot boundaries and that the flower's depth correctly hides background forms. Keep text readable and maintain clear quiet/peak differences. Run lint, build, and focused choreography/anchor continuity checks. Compare rendering cost with the current scene before increasing geometry or adding passes.

Reference principles: `research/skills/lusion-spatial-storytelling/SKILL.md` (continuous spatial relationships, persistent geometry, reversible choreography). This proposal uses local scene inspection; no new claims about external reference websites are made.
