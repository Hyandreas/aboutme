# A continuous descent past the dotted hyacinth

Proposed October 13, 2026. Planning only: this document does not implement or change the live scene. It supersedes the short camera arc as the proposed next motion direction. Nothing is pushed.

## The direction

The visitor scrolls down beside a giant hyacinth suspended in space. It begins as the familiar object behind the personal homepage, grows into a landscape of dotted folds, lets the camera pass between nearby forms, and hangs overhead as the visitor continues down toward its stem.

The flower stays upright in its world. Scrolling moves the viewpoint through that world. Recognisable landmarks enter from below, rise through the visible scene, and leave above, giving the interaction the physical direction of scrolling down a long sheet of paper. Small sideways moves reveal thickness and navigate actual openings. Changes in scale turn familiar petals into foreground surfaces.

There are **22 full viewports of usable native scroll travel**, requiring approximately 23 viewport heights of document including the visible screen. This is a new sequence of compositions, rather than an extension of the current short camera arc. Movement starts on the first wheel input.

The homepage remains the personal homepage. Its current text, navigation, type, palette, image-derived dots, introduction, and ambient movement carry through the journey. Existing routes remain available immediately; finishing the journey is optional. The flower has no explanatory labels or new botanical copy.

## Storyboard

Viewport numbers refer to distance travelled from the top, not to new content sections. Boundaries are planning markers; the delivered camera motion crosses them continuously.

| Travel | Composition and action | Visible proof of depth |
| --- | --- | --- |
| **0–1** | Start at the exact approved homepage framing. Begin descending immediately, with a recognisable upper blossom rising in the frame during the first screen of travel. | The flower moves upward relative to the anchored name; near and far folds shift by different amounts. |
| **1–4** | Approach the upper flower on a shallow diagonal. A curled petal edge enlarges and crosses the right edge of the screen as the crown starts passing above us. | The edge acquires a visible underside; its outline changes against the farther blossoms. |
| **4–8** | Descend along the face of the flower. Individual blossoms become large enough to occupy most of the visual area. Different forms arrive from below as previous ones leave above. | Cyan veins wrap around curved surfaces. A foreground petal travels quickly while the deeper flower moves more slowly. |
| **8–12** | The signature passage: follow an existing open space between two petal edges. One edge passes close on either side of the visual area, framing the original blue and violet flower farther away. Continue through that opening with a small lateral turn. | Near surfaces briefly frame and occlude distant ones. The opening changes shape continuously as the camera passes beside it. |
| **12–16** | Emerge beneath the overlapping blossoms. Their undersides form a dotted canopy above/right. Keep descending with a restrained turn that makes the curved backs readable. | The visitor can see surfaces that were concealed in the opening view, with real near/far ordering and a visibly different silhouette. |
| **16–19** | Follow the narrower lower structure. Dense petals give way to a slender stem and more empty space. Continue vertical travel at a readable pace. | The spatial scale changes from broad foreground folds to a thin structure, with the larger bloom receding overhead. |
| **19–22** | Continue down and back away. The complete hyacinth becomes visible again at a smaller scale, suspended above/right from a low oblique angle. End in a calm, stable composition. | The final whole-object view explains where the visitor has just travelled. It is a new viewpoint reached through continuous movement. |

The opening, large front blossom, passage, underside, stem, and ending must be visibly distinct. Length is justified by changes in proximity, surface, occlusion, and spatial relationship throughout the route.

## How scrolling should feel

- Native wheel, trackpad, touch, PageDown, and Home inputs drive the same position. Input is not intercepted or converted into timed scene playback.
- Downward scrolling predominantly carries scene landmarks upward. The viewing target travels with the camera's descent, rather than continuously tracking the whole flower's centre.
- A modest scroll produces an immediately visible change. During close vertical passes, landmark travel should feel comparable to the physical scroll distance; the exact gain is tuned in the browser.
- Progress maps directly to distance along the route. Camera position and viewing direction blend smoothly across the storyboard boundaries. A global ease spread across all 22 screens would create long, nearly motionless regions and is unsuitable.
- Gentle damping should settle promptly when input stops. The camera does not continue an independent cinematic animation. Original ambient particle movement may continue.
- Reversing at any position retraces the same path, including the passage. There is no scene reset, automatic page change, jump back to the hero, or snap at the end.

## Composition and visual treatment

The existing personal copy and navigation stay anchored when they fit the screen. On short screens or enlarged text, preserve the current readable overflow behaviour. The densest and brightest surfaces stay clear of the text's main reading area. The current dark treatment can continue to separate text from geometry, but should not be intensified to hide weak shots.

Maintain the original blue, cyan, violet, and magenta treatment. Dots retain their identity and follow the same surfaces throughout the journey. At close range their sizes, density, shading, and occlusion need to remain coherent; they must not turn into huge flat discs or an indistinct glowing mass. Use proximity, changing overlaps, foreshortening, and parallax as the main depth cues.

Keep the subject upright and the visual horizon calm. Use a substantially steady field of view and move the camera to change scale. Sideways motion serves a particular fold or opening. Avoid camera roll that makes the fixed typography feel disconnected from the scene.

The mobile path keeps the same sequence and scroll distance, with framing fitted to its narrower visible area. A petal passage must leave a readable view beyond it. Reduced-motion presentation keeps native access to the page and its copy, and uses a simplified vertical passage with limited lateral movement and zoom. No-WebGL presentation retains the existing static appearance and accessible navigation.

## Refined material direction — October 14

The first concept stills made the flower feel too much like a synthetic solid object. The revised target makes its construction from dots unmistakable while preserving high-resolution curvature and believable depth. The user requested a slightly stronger psychedelic art treatment without a low-resolution or low-poly appearance.

- Build the visible surfaces from dense, fine, individually legible points with small dark gaps. Avoid a continuous waxy petal material with decorative speckles layered over it.
- Preserve the original irregular blossom anatomy and folded silhouettes. Express curvature through point density, directional shading, and occlusion; do not replace the flower with a symmetrical procedural motif.
- At close range, retain small crisp dots, subtle size variation, and shaded recesses. At distance, let the points resolve into continuous form without turning the near surfaces into chunky beads or flat discs.
- Introduce restrained cyan, violet, cobalt, and fuchsia colour interference that follows each petal's curvature. These bands are changes in the existing dots' colour and brightness, not solid ribbons or additional geometry.
- Keep the background quiet and the existing personal interface intact. Concentrate the psychedelic treatment within the flower, with restrained bloom and no extra symbols, props, or full-screen effects.
- In eventual animation, any colour movement should remain slow and attached to the same surface coordinates so it reinforces the form through camera movement. The stills establish a material direction; motion still needs evaluation in the actual renderer.

The revised approach and close-passage concepts are saved with the [stills](hyacinth-scroll-stills/README.md). Their generated anatomy and fine surface detail are visual targets, not a claim that the current geometry already reproduces them.

## Model requirements for the close passage

The current reconstruction supplies the original front samples, separately curved petals, hidden surfaces, and connecting structures. Its existing entry comparison is useful evidence for the opening pose. It does not establish that every proposed macro shot is ready.

Choose the central passage from a real gap in the current model and prove it at close range. The camera must have enough clearance from solid surfaces and ambient dot displacement. Inspect curved rims, undersides, local colour continuity, and the view of distant blossoms through that gap. Repair the particular surfaces needed for the shot while keeping the original front projection intact. If the narrow opening cannot support a convincing shot, route the camera through the larger existing gap between neighbouring blossoms.

Exact camera coordinates are derived from the reconstructed model and approved screen compositions. They should not be guessed from the old whole-flower orbit. Dense detail should be built or sampled before playback; the frame loop only updates the view and existing ambient uniforms.

## Implementation sequence after approval

1. **Block out the compositions in the actual homepage.** Establish the approved opening plus the approach, front pass, passage entrance/exit, underside, stem, and ending. Capture these with the existing copy visible. Confirm that the central passage looks convincing before developing the whole timeline.
2. **Prove physical vertical travel over a short segment.** Connect the first front-to-passage move to native scrolling. Check that recognisable features enter below and leave above, that the movement responds immediately, and that reverse scrolling works. This establishes the movement language before extending the route.
3. **Connect the full 22-viewport path.** Replace the short camera sampler with a continuous position-and-target path. Keep one native progress source and the existing render loop. Fit the document range to 22 full screens of travel, preserving the current position through responsive resizing.
4. **Complete local geometry and point rendering where the chosen shots need it.** Preserve the entry view and original dot treatment. Add efficient visibility/level-of-detail handling only where measurements show it is needed; close shots should not require drawing concealed parts at full cost.
5. **Verify the complete live experience.** Physically traverse the actual homepage in both directions, inspect every viewport and meaningful intermediate state, and test keyboard input, touch, route changes, intro locking, resizing, short-screen reading, reduced motion, and missing WebGL. Run the repository lint and production build.

## Acceptance gates

- At least 20 actual viewport lengths are available to scroll; the target is 22. Measure document travel rather than just the CSS element's total height.
- The first viewport has noticeable movement. Every subsequent viewport has purposeful visual progression, without stretching a nearly static pose across several screens.
- The original entry composition and personal-site content remain intact.
- Several recognisable landmarks pass vertically through the frame. Camera descent must not collapse into a flower-centred orbit.
- The central passage shows genuine foreground/background separation and changing occlusion, with no solid-surface intersections or exposed gaps in the model.
- The close views preserve legible dots and show real curvature. The underside and stem views look materially different from the front view.
- The name, copy, navigation, and existing controls remain readable and reachable. Navigation works at any scroll position.
- Forward and reverse visits to the same scroll position recover the same camera composition, apart from the original ambient movement.
- Mobile retains the intended sequence, and short screens can read the full existing copy.
- Visual acceptance uses captures from the actual portfolio at several intermediate positions, alongside physical scrolling. Unit tests and isolated geometry views alone do not establish the delivered experience.

## Reference basis

This direction uses the previously recorded [Lusion field notes](skills/lusion-spatial-storytelling/references/field-notes.md): Of The Oak's persistent point-built subject, Synthetic Humans' transition from recognition to close inspection, and Lusion's observed foreground framing during spatial travel. These are dated observations informing a new proposal for this portfolio; the storyboard above is not a claim about those sites' exact camera paths.
