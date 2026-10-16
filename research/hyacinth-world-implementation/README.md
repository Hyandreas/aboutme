# Persistent surrounding world

The later [etched environment revision](../hyacinth-etched-implementation/README.md) supersedes this note's glossy ribbon treatment. The camera-centering changes documented below remain active.

The October 14 revision responds to the empty space around the flower: visual activity now continues throughout the 44-viewport descent, including the early and quiet intervals.

## Visible changes

- Four overlapping waves of dotted auras expand continuously with scroll. Each wave fades before resetting, so reverse scrolling recovers the same wave pattern without a seam.
- Six large twisted translucent membranes and 26 smaller curved forms occupy multiple depths on desktop. Their luminous contours and changing overlaps give the camera something to move past. Mobile uses four membranes and 14 smaller forms.
- Cyan and violet auroral folds animate across the distant background. Quiet intervals retain a visible floor; bloom peaks intensify the surrounding world.
- Denser particle currents and foreground motes remain present between blooms. Clicking the existing bloom area also brightens the surrounding forms and waves.
- The original opening is retained at scroll zero. Surrounding layers reveal during the first 0.9 viewport. Personal copy, typography, navigation and the dotted flower geometry are unchanged by this revision.

## Evidence

Actual page captures, taken after native scrolling in the in-app browser:

- `live-early.png`: two viewports into the descent, with the personal interface.
- `live-opening.png`: the first bloom passage.
- `live-quiet.png`: the quieter underside passage at viewport 26.
- `live-release.png`: the final wide release around viewport 42.
- `live-mobile.png`: phone-sized layout with the surrounding world visible.

Controlled, fixed-time renderer captures at viewports 2, 8.5, 26 and 42 are in `geometry-*.png`; `geometry-diagnostics.json` records camera poses and renderer errors. These isolate the scene and omit the HTML interface.

## Implementation and verification

The environment uses 23,160 particles on desktop and 7,540 on mobile in three batches, plus four mesh batches for membranes, smaller forms and their contours. Geometry buffers are fixed; animation runs in shaders. The existing background sphere supplies the distant light folds. No new image downloads or flower asset changes are required.

Scroll controls the large movement. Ambient time only adds slow motion within each composition. Reduced motion freezes the spatial forms and background travel, removes expanding auras and foreground motes, and preserves the simplified existing camera. Both environment systems release their resources on disposal.

- Production build and lint pass.
- 19 focused tests pass: aura continuity, reverse traversal, entry preservation, camera/choreography behavior, reduced motion and GPU resource disposal.
- Controlled renderer capture completed with no shader/runtime errors.
- All 16 desktop browser checks passed, including the populated early/quiet scenes, all 44 viewports, fixed copy, pause and reversal. Four mobile checks also passed for the environment, layout and reversal. No application or shader errors were reported.
- The automated mobile route transition and reduced-motion startup timed out. A fresh automated retry also timed out during page startup; those runs are preserved in `living-browser-desktop-mobile-reduced.json` and `living-browser-mobile-reduced.json`. These are not recorded as passing runs.
- Direct Chrome verification then confirmed a fresh homepage load, desktop route navigation, homepage remount, and the mobile menu transition to Projects. The mobile transition removed the journey class and returned the document scroll range to zero. The viewport override was reset afterward.
- Reduced-motion factory and choreography tests pass, but the automated end-to-end reduced-motion check remains unverified because of the startup timeout. No application changes were made speculatively in response to the automation timeouts.

The local preview is at `http://127.0.0.1:5003/`. Nothing has been pushed.

## Centered compositions follow-up

The hyacinth now leaves the right-hand column after the first bloom. Between viewports 10 and 16, both the camera film offset and the original CSS canvas translation ease toward zero. The middle passage stays centered from viewports 16–26. The lower bloom moves slightly right again before the final pullback centers the whole flower from viewport 39 onward.

The original opening, reduced-motion camera, personal text and navigation remain intact. The canvas translation follows the same smoothed camera state, including on reverse scroll, and is removed on disposal. Fifteen camera/choreography checks cover continuity, reversal, entry, mobile framing, reduced motion and the projected flower axis at the final reveal. Production build and lint pass.

`live-centered-release.png` and `live-centered-passage.png` show the actual page at the new compositions.
