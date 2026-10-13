# The hyacinth: real 3D, still made of dots

Plan dated October 13, 2026, following the [live-site research](skills/lusion-spatial-storytelling/references/field-notes.md). This document proposes the next implementation. No production scene, route, copy, or layout was changed in the research pass.

The user's clarification is the central requirement: the dots are intentional. The new flower should keep that appearance while becoming a coherent object that can be inspected from different directions.

## Recommended direction

Create a botanical sculpture sampled into luminous dots. Preserve the violet, blue, cyan, and magenta character of the existing flower, its silhouette, the dark atmosphere, and the quiet editorial typography. Give the dots real petal surfaces, throats, independent florets around the stem, and a plausible back.

The strongest reference is [Of The Oak's species explorer](https://oftheoak.co.uk/oak-species): a continuous dotted botanical structure with changing views and information alongside it. Borrow deliberate changes of camera distance from [Synthetic Humans](https://synthetic-humans.ai/) and clear local object feedback from [Oryzo](https://oryzo.ai/). The latter is a studio experiment; it is not a client commission.

![Of The Oak's point-built structure, captured during actual scrolling research](skills/lusion-spatial-storytelling/references/screenshots/10-oak-tree.jpg)

## What the current code actually does

The active route is `app/page.tsx`, which uses `FullscreenShell`. The shared shell mounts `HyacinthBackdrop` on the four public routes.

`HyacinthBackdrop` initializes the scene with `getProgress: () => 0` and loads `/assets/hyacinth.png`. Cursor input does not control the camera.

The renderer in `app/components/hyacinth/hyacinth3d.js` calls `buildPhotoCloud`. It samples image pixels into points, maps their horizontal coordinate around a cylindrical arc, and adds brightness-based relief and a dome term. Its point positions have depth, but their arrangement is still derived from a single image. It does not reconstruct the individual flowers, their unseen surfaces, or the real spaces between them. This is why more orbit alone will not solve the user's request.

There are dormant geometry builders for a curved stem, leaves, solid florets, and buds. They are useful material to inspect for sampling surfaces. They are not an approved visible solid-flower direction. Their old proportions and many repeated small florets also need comparison against the current macro flower image before reuse.

`HyacinthClient.tsx` is an older scroll experience. It is not the current homepage and should not be revived wholesale. It contains assumptions and copy paths from the previous design.

The earlier comments saying the photo cloud is coherent from all sides are not sufficient evidence. The next implementation should prove that visually.

## First milestone: anatomy before scroll

### 1. Calibrate one floret against the existing art

Use `public/assets/hyacinth.png` as the visual reference. Preserve its broad recurved petals, deep blue-violet throats, bright cyan accents, varied orientations, and tall flower-head silhouette. Begin with one large floret, not a full plant of repeated generic stars.

Build a throat with actual length and an opening, plus six curved lobes whose shape changes across their length and width. Include cupping, folded edges, and recurved tips. Give thin petal surfaces enough structural separation to remain readable in profile. Check the local floret from front, side, and rear before multiplying it.

The sampling surface can be a procedural mesh used only for generating points. A sculpted asset remains an alternative if the procedural shape cannot match the reference well enough. There is no need to choose an asset pipeline or introduce Blender dependencies for the first experiment.

### 2. Assemble a complete spatial flower head

Place independent florets around a curved stem in three dimensions. Use a controlled spiral as a starting arrangement, then tune size, reach, orientation, and overlap to match the current art. Put actual florets behind the stem as well as in front. Taper the upper portion and vary openness near the crown.

Retain enough negative space to distinguish separate throats and petal clusters. Preserve the current emphasis on the flower head; do not turn this into a potted-plant scene or add a large leaf fan merely because old geometry exists.

Keep the anatomy fixed relative to the cursor. Ambient motion should remain subtle and should not dissolve the silhouette.

### 3. Convert the surfaces into the visible dots

Use area-weighted surface sampling with stable seeds. `MeshSurfaceSampler` is already available in the installed Three.js 0.160.x package. Follow the repository's existing `three/examples/jsm/` import style. Alternatively use area-correct sampling of the procedural surfaces directly.

Store rest positions, surface normals, local petal coordinates, floret identity, height, color, and seeds in buffers. Transform positions and normals correctly from each floret's local space into the plant space. The sampled meshes remain invisible; the public flower is rendered as points.

Keep color variation related to the anatomy and the existing art. Use the original image as a palette and composition reference; do not project the same front image onto every rear surface. The back is a newly constructed interpretation, since the single image does not reveal it.

Start with a small number of `THREE.Points` batches and a custom point shader. Do not make a separate React component, mesh, or small sphere for each dot. Stable sampling should survive route changes and repeat captures without becoming a different plant.

### 4. Make depth legible without losing the dots

Use sampled normals to give the points a restrained directional surface response. Keep cyan and magenta accents as controlled cues, with enough fill to see rear structure. The points should remain dots at the ordinary viewing distance and become more distinguishable in the macro view.

Use depth testing and a considered depth-write strategy for the point cores. Start with clean circular fragments and very limited glow. Check that rear points do not shine uniformly through front petals. Evaluate any extra halo or invisible depth surface only after the basic representation works; either can reduce the dotted feel if overused.

Maintain a separate, sparse ambient dust layer. Its motion should be weaker than the subject's silhouette. Test the flower with postprocessing disabled before adding final glow.

For the bloom interaction, move or bend points in the local petal frame or along their surface normals. The current global-Z displacement would favor a single viewing direction. The new pulse should travel up the flower and return to the same rest state from every viewpoint.

### 5. Prove the result from seven views

Prepare consistent captures of front, three-quarter, left side, right side, rear, top-oblique, and one macro view. Use a temporary diagnostic camera or turntable for review; do not add permanent cursor orbit to the public page.

| Check | Acceptance criterion |
| --- | --- |
| Identity | The hero still looks like this site's dotted blue-violet hyacinth; its mass and palette remain recognizable |
| Side view | Throat length, petal curl, and separate flowers are visible; the subject does not collapse to a sheet |
| Rear view | Independent rear florets and stem relationships are present; there is no mirrored front-photo image |
| Parallax | A camera translation changes the relative alignment of near and far parts |
| Occlusion | Near petal points correctly obscure farther structures without unwanted wholesale transparency |
| Dot appearance | Point size, density, and glow preserve visible dots rather than merging into a smooth solid flower |
| Motion | Ambient motion and bloom keep the same anatomy and return cleanly to rest |
| Layout | The current text and navigation remain readable; the flower still leaves the existing copy area open |

This is the first reviewable deliverable: a flower that works in the existing four-page shell, plus its diagnostic multi-angle captures. Scroll choreography is a separate milestone, so the quality of the object can be judged on its own.

## Then: a short scroll study

The next step is an isolated three-state study using the verified point-built object. This is a proposed future change to the current desktop no-scroll design. It should not alter all four routes at once.

| State | Composition | Motion and purpose | Reading behavior |
| --- | --- | --- | --- |
| Recognition | The existing wide, slightly right-shifted flower with room for the name and short introduction | Begin from a familiar pose; only subtle ambient motion | Stable entry view |
| Inspection | An oblique view moves toward one prominent floret | A modest arc reveals its throat and the near/far petal relationships; a local bloom pulse can reveal curvature | Pause camera travel while any nearby explanation is read |
| Return | Pull back into a clear wide composition | Recover the whole flower and orient the visitor toward the existing portfolio routes | Stable ending with normal links |

Use an explicit camera target path as well as a camera position path. Keep the camera outside surfaces, avoid clipping through petals, and use one short orbit segment rather than the old two-revolution spiral. Block the three poses before tuning easing.

The simplest implementation can use native document scrolling to drive one normalized scene progress value and a fixed or sticky canvas. Update the scene in one render loop through refs/uniforms. Use elapsed-time-based damping, not a fixed per-frame smoothing factor. Keep transitions and reading intervals distinct. Reverse scrolling should restore previous poses and chapter jumps should reach the same scene state.

This can be tested in an isolated development view before selecting any permanent home-page scroll structure. `/projects`, `/about`, and `/songs` can continue to use quiet wide framing during that experiment. No dev server was started during this planning task; start one only when the user asks for preview or implementation requiring that workflow.

## Interaction ideas, in priority order

1. **Bloom along the flower.** Extend the existing intentional bloom interaction into a coherent wave through local petal geometry. Keep the action short, repeatable, and subtle.
2. **Inspect one floret.** A deliberate control or a small set of generous hotspots moves to a known detail view. Provide a visible return action and a keyboard-accessible equivalent.
3. **Reveal anatomy.** Temporarily separate or open one floret, inspired by Atlas's parts-to-whole sequence, then return it to the same rest state. This is optional and comes after the basic spatial experience.

Cursor-driven camera motion is not part of the first rebuild. If local pointer interaction is later chosen, confine it to a deliberate region and keep it from pulling the entire plant or camera away from the reading composition.

## Repository boundaries for implementation

- Preserve server-rendered content reads and the Markdown content pipeline in `content/` and `lib/content.ts`. New visible labels and hints must enter there first.
- Keep the global first-entry TV animation and the current navigation/content behavior unless a later design specifically changes them.
- Add the anatomical point builder as an isolated module, for example `app/components/hyacinth/hyacinthPointModel.js`. Keep point appearance and camera choreography separately understandable.
- Integrate through `hyacinth3d.js` and `HyacinthBackdrop.tsx` after the object passes its views. Retain the current photo asset for art reference and fallback.
- Keep the older `HyacinthClient` inactive. Inspect useful helpers individually rather than reactivating the old experience and its visible copy.
- If the scroll study becomes production, revise the relevant no-scroll guidance in `AGENTS.md` and `DESIGN.md` together with that scoped implementation. The current planning task does not silently change those rules.

## Performance and usability checks

Begin with measured quality tiers, using approximately 120,000 flower points on desktop and 40,000 on mobile as experimental starting budgets. These are proposed trial counts, not measured safe limits. Preserve the entire anatomical structure at both tiers; use a spatially distributed subset rather than removing complete rear flowers.

Keep the current pixel-ratio cap as an initial constraint. Measure point overdraw and frame time during the largest close-up, not just in the wide pose. Reduce halos and postprocessing before sacrificing anatomy. Sample geometry once; keep per-frame deformation on the GPU where useful. Pause unnecessary work in hidden tabs and dispose geometry/material resources on teardown.

Reduced motion should show a stable complete flower, skip camera travel and transient assembly, and retain navigation/content. If WebGL cannot load, the current image can provide a coherent static fallback. Canvas interactions that reveal meaningful information need equivalent DOM controls; the current backdrop is `aria-hidden`, so important controls cannot simply be hidden inside that wrapper.

Verify desktop composition, small-screen reading, focus/keyboard behavior, point size after resizing, route transitions, repeat bloom actions, context failure, and reduced motion during implementation. Run the repository's lint and build commands for actual code changes. Meaningful anatomy tests may verify deterministic sampling, finite coordinates, valid transforms, and structural coverage; they should supplement visual multi-angle review.

## Decision

Build the anatomical point-cloud flower first, preserving the existing art direction and quiet shell. Accept it only after the side and rear views are convincing. Then test a short recognition → inspection → return scroll sequence before deciding how much of the portfolio should become an immersive journey.
