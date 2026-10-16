# Reference-constrained hyacinth reconstruction

Implemented locally on October 13, 2026. Nothing pushed.

The hyacinth's model, rendering adapter, and homepage scroll camera changed. The homepage now has a native scroll range while its existing content stays in place. Markdown content, navigation, typography, backgrounds, entry framing, TV introduction, dependencies, and project configuration retain their existing treatment. The earlier flower-themed demo is removed.

## Model

The reference data traces 85 individual visible petals, folds, and bell walls from the original PNG. The reconstruction builds 96 independently closed surfaces, including the stem and ten connecting necks. Petal depth comes from fitted folds and overlaps, not photograph brightness. The original photograph's old cylindrical coordinates are used only to preserve its approved camera rays.

Every original front dot moves along its original camera ray onto its assigned curved surface. Its colour and seed remain intact, and its diameter and ambient displacement scale with depth to retain the entry appearance. The renderer preserves the original fine-dot overlap at that view and transitions to reconstructed geometric depth as the viewing direction changes. Completed undersides, rim walls, concealed patches, and both sides of connecting necks have their own surface samples and normals. Back-facing points are culled; unseen samples are revealed with the new view. Canonical rendering skips those hidden vertices and the extra depth pass.

The browser's desktop specimen has 130,671 observed dots and 94,083 completion dots. Mobile completion is capped at 20,000. Completion uses each part's own local pigment and vein colours with restrained underside shading and a fine dot-size cap.

Unseen shapes are inferred from one photograph. This is a coherent reconstruction, not an exact recovery of unobserved anatomy.

## Homepage movement

The actual `/` route opts into native document scrolling. Its camera makes a restrained orbit and moves closer to the existing flower; the resulting perspective and changing overlaps expose the model's depth. The original entry camera is unchanged, and scrolling backward returns to it. Desktop uses a 42-degree arc and mobile a 32-degree arc. The existing atmosphere and colour treatment do not advance through the dormant renderer's old scroll palette.

No new page sections, labels, controls, or flower-themed copy were added. Other routes retain their original compact presentation. On short screens or with enlarged text, the existing copy can scroll normally rather than being clipped. The first-entry TV animation keeps scrolling locked until it finishes.

## Verification

- Eight geometry tests pass: original projection and diameter, exact RGB and seeds, actual shell occupancy, closed independent petals, hidden-surface sampling and normals, both neck-wall orientations, independence from pixel brightness, and determinism.
- Nine camera tests pass: exact starting pose, separation of overlapping points at different depths, larger detail as the camera moves closer, orbit-only distance, a gentler mobile path, clamping, reversibility, finite poses, and smooth endpoints.
- Full-photo structural audit: 96 closed shells, every edge shared by two triangles, positive enclosed volumes, and no collapsed faces. Sampled source points lie within 1.4e-7 world units of their assigned surfaces. Maximum canonical projection drift is about 0.000026 pixels.
- With the original bloom and output treatment, only 0.0279% of pixels differ by more than 8/255 from the recorded original entry render. Mean channel error is 0.0031 on a 0–255 scale. This is a fixed viewport, sample set, and animation phase comparison, not a comparison of independently moving clouds.
- Prior reconstruction integration checks found all four configured routes returned 200 and rendered the reconstructed shader without page errors. The new homepage intentionally extends the document height for camera progress while keeping its personal copy within the screen.
- Native browser checks confirm forward and reverse wheel movement, PageDown/Home, reload at the initial view, navigation cleanup, and unchanged homepage copy and framing. They observe the point-cloud camera's submitted matrix translation, separately from ambient particle rotation. Desktop scrolling reaches 1440px and changes camera translation by about 2.44 world units; mobile reaches 1350px with about 1.39 units of camera movement.
- The final production build passes seven focused checks for desktop motion and fixed content, plus readable text and continuing camera motion at 568×320. The last home line moves into view after a real 200px wheel scroll. At normal desktop and portrait mobile sizes, the original copy stays in place.
- The first-entry TV intro blocks a real 1400px wheel scroll at scrollY 0. After it finishes, a 600px wheel scroll reaches scrollY 600. Mobile subpage checks preserve the original flow and static camera: `/songs` has its existing 49px natural overflow, while `/projects` and `/about` fit that tested viewport. The broader initial run's assertion that every mobile page must have zero overflow was invalid; the separate subpage checks verify the existing behaviour.
- The live in-app browser was physically scrolled forward and backward on the final homepage. Its copy remained fully visible. Some software-GPU headless screenshots intermittently clip the left edge despite unchanged DOM bounds; raw screenshots are retained, and the clean captures and live browser provide the visual check.
- The existing bloom handler dispatches its event. The fullscreen main layer already intercepts physical background clicks; that pre-existing pointer behaviour was preserved rather than changing page CSS.
- Lint and production build pass. Production verification uses an isolated build directory so the existing development cache is preserved.

See [diagnostics.json](diagnostics.json), [portfolio-diagnostics.json](portfolio-diagnostics.json), [scroll-diagnostics.json](scroll-diagnostics.json), [scroll-final-smoke.json](scroll-final-smoke.json), [scroll-intro-lock.json](scroll-intro-lock.json), [scroll-mobile-subpages.json](scroll-mobile-subpages.json), and the original/entry/quarter/side/rear captures in this directory.

## Re-run

```sh
node --test tests/hyacinth-reconstruction.test.mjs tests/hyacinth-scroll-camera.test.mjs
npm run lint
npm run build
```

The isolated comparison script uses an available Playwright installation. Set `HYACINTH_PLAYWRIGHT_PATH` when it is outside the project's normal dependency resolution, then run `node scripts/hyacinth-reconstruction-capture.mjs`. It creates a temporary blank rendering fixture and closes it after capture; it does not add a portfolio page or start a Next development server.

With the production preview already running, `node scripts/hyacinth-scroll-check.cjs` exercises native wheel and keyboard input on the actual portfolio. Set `HYACINTH_CHECK_URL` to use a different local preview URL. The `--final-smoke`, `--intro-only`, and `--mobile-subpages` modes provide focused checks; run after the production build finishes so concurrent compilation does not delay browser startup.
