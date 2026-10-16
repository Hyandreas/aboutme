# Directed, living descent — proposed revision

October 14, 2026. Planning only. The current implementation remains unchanged. This proposal extends the 22-viewport journey to **44 full viewport lengths of native scroll travel** (approximately 45 viewport heights of document). It is a new choreography with additional events, rather than the current camera path played at half speed.

## Creative direction

The camera's attention awakens the flower and sends a response through its surrounding space. A close-up has a subject and a consequence: the view finds a particular petal, the petal gathers tension and unfurls, and the surrounding particles and light respond. The camera follows that opening into the next composition.

The experience should progress through recognition, anticipation, opening, passage, suspension, another stronger opening, and a wide release. Power comes from the difference between quiet anticipation and a large coordinated movement. Each scene gives one action visual priority.

“Bloom harder” means both a visible change in petal shape and a stronger local light response. Actual uncurling and movement of the tip must remain clear with glow disabled. The full flower remains recognisable and upright; the dots stay attached to their surfaces.

Keep the original opening, personal copy, typography, navigation, soundtrack controls, and other routes. Keep the interface anchored and usable throughout. No botanical copy or chapter labels are proposed. The existing blue, violet, cyan and fuchsia palette carries through the new environmental effects.

## What the current implementation supplies

The current camera follows a descending series of positions and targets, but does not track a moving petal. Journey progress primarily changes camera position and the point material. The click bloom is a height-based displacement along world Z, rather than individual petals opening about their attachments. The homepage passes a constant style progress to the instruments and fluid background; those layers have ambient movement but little narrative response.

We already have independent petal shells, point-to-surface identities, attachment/tip/ridge annotations, two dust layers, rings, and a fluid background. These are useful foundations. The new work is a local deformation system, a shared choreography, and environmental motion tied to the same events.

## Storyboard: 44 viewports

Ranges refer to distance scrolled from the opening. They are working allocations to tune in the live browser.

| Travel | Camera direction | Flower action | Surrounding space |
| --- | --- | --- | --- |
| **0–4: Awaken** | Begin in the exact original frame. Descend on a shallow diagonal, gradually choosing the upper-right bell as the first subject. | A faint colour pulse travels toward that blossom. Its leading petal begins to gather tension near the end of the approach. | Existing dust starts to form a loose current toward the focal area. The distant background remains quiet. |
| **4–10: First opening** | Move toward one curled lip, then ease back slightly as it opens toward the view. Track the moving tip, keeping the root and a neighbouring petal visible as spatial references. | The selected petal uncurls visibly; adjacent petals follow with a smaller, staggered response. A cyan-violet highlight travels from attachment to rim. | Motes draw inward before opening, then expand outward in a thin curved wave. A nearby ring responds after the petal, establishing cause and effect. |
| **10–16: Follow the edge** | Sweep diagonally along the opened rim and beneath its curve. Let the near edge pass the right/lower boundary of the image while a farther blossom stays visible. | Opening travels along the petal rather than moving it as a rigid flap. The tip settles with restrained secondary motion. | Sparse foreground motes cross the camera faster than the distant field. The previous wave stretches into the direction of travel. |
| **16–22: Passage** | Enter the gap beside two real neighbouring petals. Shift the viewing target from the first edge to the next, with a short increase in travel speed through the opening. | The first petal makes room; the next begins opening just before it becomes the subject. Their responses overlap briefly, then separate. | A curved particle current leads through the gap. Light from the opening reaches the background, followed by a broad, faint distortion in the existing fluid field. |
| **22–28: Suspended beneath** | Continue descending but look back upward beneath the canopy. Give the new underside view enough travel to read, with a slow lateral drift. | Small phase differences let nearby petals breathe as a group. The major bloom settles, revealing the thickness and curled undersides. | The current loosens into a slow vortex overhead. Foreground particles become sparse, creating a quieter interval after the passage. |
| **28–34: Second opening** | Choose a lower blossom from an oblique angle. Follow its tip outward, then widen to show the response reaching its neighbours. This is a different composition from the first close-up. | A larger local bloom opens sequentially across a small group. Its attached bases remain stable while the outer curls spread. | An asymmetric wave bends the nearby rings and carries a ribbon of existing dust around the blossom. Cyan light hands off to violet/fuchsia along the moving contour. |
| **34–39: Down the stem** | Descend more decisively along the narrow lower structure. Let the bloom rise above the frame, maintaining the physical direction of scrolling. | A restrained pulse travels down the connecting structure; the surrounding blossoms begin to relax. | Particles align into a vertical current, giving a strong sense of travel through space. Depth and directional motion supply intensity while the flower occupies less of the frame. |
| **39–44: Wide release** | Pull down and back into the low, whole-flower view. The last composition reveals the relationships between the earlier close-ups. | A final, staggered opening travels across the flower. It is broad but less locally extreme than the close-up bloom; the silhouette stays recognisable. | One broad ripple expands behind the flower through the existing ring/particle field. It thins and settles into a calm living state at the endpoint. |

The hero moments are the first opening, the passage, and the final wide release. The second opening bridges those scales. Every viewport must advance a composition, deformation, or spatial event; quiet stretches still have readable parallax and descent.

## Camera rules

- Give each close-up a named petal or cluster and a particular anchor: attachment, rim, tip, or throat. Blend attention between these anchors. Sample the *deformed* anchor so the camera follows the actual opening.
- Descend continuously through the overall route. Looking upward or following a petal sideways can create an expressive shot while the camera itself continues travelling downward.
- Use lead-in, approach, a slower inspection interval, and release. Change speed within the route, with continuous position and velocity at joins. Avoid long flat spots and repeated stops at every storyboard boundary.
- Use changing position and viewing target as the main expressive controls. A small bank, initially limited to about 2 degrees, can support one or two close passes. Keep the horizon level in the opening, reading intervals, and ending. Lens changes are optional and bounded; prove the choreography first with the existing field of view.
- A petal opening toward the view produces a small retreat or sideways adjustment, all authored on the same scroll timeline. This creates the appearance of responsive camera work without taking scroll control away from the visitor.
- Keep an escape view through each close composition: a darker gap and a recognisable farther surface. Reserve the existing text column rather than darkening it further to compensate for poor framing.

## Petal animation

Start with the upper-right bell, one middle/front passage pair, and a lower blossom. Confirm the exact members and pivots against the existing traced anatomy before assigning shot coordinates.

Each focal petal needs a rest shape, attachment frame, longitudinal coordinate from root to tip, and a curl weight. Bloom bends about that attachment and relaxes the lip's curl, with the root fixed. Starting visual targets are roughly 20–30 degrees of opening on the leading petal and a smaller response on its neighbours; the final values are determined by silhouette and surface clearance.

An opening has four readable parts: a small inward anticipation, a decisive unfurl, staggered follow-through at the tip/neighbours, and a softer sustained pose. Its scroll-authored state can hold while the visitor pauses. Very slight breathing can continue at rest; large openings do not complete independently of scrolling.

The fine dots, their normals, the invisible occlusion surfaces, and camera focal anchors must use the same deformation. Otherwise dots will disappear behind an undeformed depth surface or the camera will track an obsolete position. New attributes are baked once; the browser updates a small set of deformation controls rather than rebuilding the cloud per frame.

Preserve point identities and density. Do not enlarge the point sprites to make a bloom feel powerful. Stronger illumination is concentrated around the active rim and fades into its neighbours, retaining dark gaps between dots. Any particles shed into the surroundings belong to a separate effect layer; the flower's anatomy remains intact.

## Environmental effects

Use three related systems, derived from what is already present:

1. **Directed particle currents.** Existing near/far dust becomes a sparse flow field that gathers, releases, and stretches around the active petal. A small near-camera layer establishes foreground depth. Stream positions are repeatable at a given scroll location.
2. **Responsive rings and ripples.** The existing rings bend and expand as a bloom's response reaches them, then relax. Their delayed response connects the flower to a larger space. Their brightness and placement must leave the personal copy clear.
3. **A light response in the fluid background.** Local bloom energy reaches the background after the near particles, briefly strengthening existing filaments and distorting a bounded area behind the action. A small number of spatially placed wisps may supplement this only if the existing field cannot establish depth.

Use foreground, flower, and background responses at different distances and phases. At least one motion must remain visible outside the flower during a major bloom. Avoid continuous maximum intensity: the underside interval and final settlement need quieter surroundings.

## Scroll, interaction, and access

One native progress value coordinates camera, deformed petal pose, focus, lighting, rings and particle currents. Event envelopes are functions of scroll position, so reversing rewinds the major action and revisiting a position restores it. Seed environmental particles and use analytic motion or baked paths rather than accumulating an irreversible simulation.

Keep slow ambient breathing separate from this authored timeline. If retaining the existing click bloom, let it add a small bounded response to the currently featured blossom; it must not reset or take over the descent. No pointer-driven camera and no new automatic audio.

Use 44 viewports of actual travel and preserve progress when resizing. On mobile, retain the main focal events with greater camera clearance, fewer foreground motes and a gentler bank. Reduced motion removes camera banking, rapid approaches, expanding foreground waves and large petal movement, while keeping native reading/navigation. The static fallback and existing routes remain available without completing the journey.

## Implementation order after approval

1. **Prove one complete encounter first.** Build the equivalent of viewports 4–10 using one existing petal: camera attention, anticipation, physical opening, local light and a surrounding particle/ring response. Capture its rest, maximum opening and underside, then inspect the continuous forward/reverse motion in the actual homepage. This is the visual decision point before extending the sequence.
2. **Build the shared scene controls.** Add petal attachment/curl data and shared deformation for dots, normals, depth and focal anchors. Replace the camera-only sampler with a scene sampler carrying camera pose, focal targets, bloom envelopes and environmental responses. Keep the existing renderer and content structure.
3. **Choreograph all 44 viewports.** Block the eight compositions, then join them with variable pacing. Add the second focal group and wide release. Rebuild the compressed assets only for the new attributes or necessary local geometry repairs.
4. **Tune effects and performance in the actual scenes.** Reuse point batches and the existing background. Profile the peak opening and passage; reduce layered overdraw and effect counts before adding another fullscreen effect. Measure any asset-size increase against the current geometry payload.
5. **Verify and present real captures.** Physically scroll forward and backward at slow and fast input speeds. Check stop/reversal at peak bloom, resize, route navigation, mobile, reduced motion and WebGL fallback. Run lint, build, geometry/deformation tests and browser checks. Show the opening, first opening, passage, underside and finale from the actual site.

## Acceptance criteria

- The first frame retains the approved original appearance and personal interface.
- Native scroll travel measures approximately 44 viewports, with meaningful progression throughout.
- With the camera held still, the selected petal visibly unfurls and settles; with glow disabled, that action is still legible.
- The camera follows specific moving landmarks, and each major shot has a distinct composition and purpose.
- A bloom creates a visible, delayed response beyond the flower's silhouette.
- At any stopped scroll position, the large action holds. Reverse input restores the same camera, petal and environmental state apart from slow ambient motion.
- Petal roots remain attached, dots stay on the animated surfaces, and the depth pass does not clip the moving flower.
- The entire subject remains identifiable and composed of fine dots, including at maximum bloom.
- Text and navigation stay readable and operable, and the existing mobile/reduced-motion/fallback paths remain useful.

This direction builds on the existing spatial-storytelling research and the current 3D reconstruction. It proposes new choreography for this portfolio; it does not claim to reproduce the internal techniques of a reference website.
