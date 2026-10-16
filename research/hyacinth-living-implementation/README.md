# Living descent implementation

October 14, 2026. Revision of the approved 22-viewport reconstruction into a 44-viewport native scroll journey.

The original opening, dotted specimen, personal copy, typography and navigation are retained. The homepage now supplies 44 viewport heights of travel; the other routes keep their existing presentation. No commit or push was made for this revision.

## Choreography

| Travel | Action |
| --- | --- |
| 0–4 | Original framing opens into a diagonal approach. |
| 4–10 | The upper-right petal anticipates, bends from its attachment and uncurls; the camera follows its moving tip. |
| 10–16 | A lateral sweep follows the rim into the next gap. |
| 16–22 | The middle blossom opens during the close passage. |
| 22–28 | A quieter upward view underneath the canopy lets the opening settle. |
| 28–34 | A lower group opens in sequence from an oblique view. |
| 34–39 | The camera descends along the stem. |
| 39–44 | The camera pulls back; a staggered whole-flower opening and broad spatial response settle at the endpoint. |

The camera has continuous position and velocity, bounded banking, and blends its attention toward the deformed petal tip. Bloom, focus and environmental envelopes are functions of scroll position: the large action holds when scrolling stops and rewinds when scrolling reverses. Ambient breathing remains very small.

## Rendering

Petals use the existing traced attachment and tip landmarks. Dots, anatomical depth surfaces, normals and CPU focal anchors share the same curved deformation. The root stays attached; the lip moves rather than simply receiving more glow. The leading upper and lower petals open about 34 degrees, and the passage petal opens 20 degrees.

The environmental layer uses five particle currents, asymmetric ripple arcs and sparse foreground motes. It adds three draw calls and 15,980 desktop / 5,196 mobile points. Its own seeded generator preserves the original flower's samples. It is absent at the original entry and strongly suppressed during the underside interval. Existing rings and the fluid background respond to the shared energy envelope. Fine point size remains bounded.

Mobile has additional camera clearance and fewer environmental points. Reduced motion removes large petal deformation, focus swings, banking, ripple arcs and foreground motes. Live preference changes are supported. A lost graphics context restores the static fallback and resumes the original scroll position after recovery.

## Verification

- Production build and lint passed.
- All 28 camera, choreography, deformation and reconstruction tests passed.
- Held-camera proof with post-process bloom, local rim light and click glow disabled: the leading tip moves 0.59314 world units, changing 8.78% of the image while the camera and projection remain identical (`petal-rest.png`, `petal-open.png`, `petal-motion-proof.json`).
- Original-entry pixel comparison: 0.0279% of pixels differ beyond the 8/255 tolerance; mean channel error 0.00316/255. No shader or runtime errors in the rendering fixture.
- Physically scrolled the actual homepage through 8.5, 20, 26, 32 and 42 viewports in the in-app browser. Native travel measured exactly 44 viewports and the personal interface remained fixed and readable.
- All 32 final browser checks passed on the rebuilt production preview (`living-browser-full.json`): native wheel movement, stopped and reversed major state, all focal stations, Home/End, resizing, the other three routes, mobile framing and navigation, fresh and live reduced-motion preferences, initial graphics fallback, and graphics-context recovery at a peak. No application runtime, shader or font errors were recorded. Browser checks ran sequentially; visual proof came from the actual in-app browser and controlled rendering fixtures.

`geometry-*.png` are controlled scene captures without the website interface. `live-*.png` show the actual website. Additional browser and held-camera reports are saved beside these captures.

The first atmosphere isolation captures document a placement defect found during tuning: the close-up currents were projected outside the right edge, while the wide-view currents overlapped the flower. GPU state was correct. The final version moves the near current into the open corridor toward the camera and gives it a wider S-shaped path. `geometry-8.5.png`, `geometry-42.png` and `live-wide-release.png` show the corrected version.

The compressed reconstruction assets are unchanged. New motion attributes are derived once from the loaded geometry; the animation updates uniforms instead of rebuilding the cloud per frame. Headless software-renderer timings are not representative of device performance.
