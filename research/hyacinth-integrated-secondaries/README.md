# Connected secondary forms

Implementation of `../hyacinth-secondary-integration-plan.md`.

The opening now contains faint fragments of two etched fields. Their geometry occupies fixed world positions around the plant; the existing camera discovers their depth. Independent illumination tracks reveal each field over several viewports. The former shared 0.9-viewport entrance ramp has been removed from the fields, atmosphere, sky, and reading shade.

Smaller forms start at four real, deformed petal tips. Dotted strands and engraved curls share the same curve and attachment frame. Each grows along its length, unfolds with its bloom, and then releases into a stable trajectory. Waves originate at the corresponding petal, and local field illumination uses the same source, orientation, elliptical radius, and propagation phase. The upper, central, lower, and final bloom sequences are all sampled directly from scroll distance.

The original camera path, flower dots, personal copy, navigation, and 44-viewport length remain. Homepage bloom clicks use the petal rig so the attached thread follows the clicked bloom. A depth-only anatomical pass runs after the flower and before the secondaries; this prevents distant forms showing through the reference portrait while leaving its dots untouched. Other routes do not mount this extra pass.

## Cost

The secondary geometry counts remain unchanged from the etched revision:

| Tier | Mesh batches | Mesh triangles | Point batches | Points |
| --- | ---: | ---: | ---: | ---: |
| Desktop | 4 | 33,024 | 3 | 23,160 |
| Mobile | 4 | 12,160 | 3 | 7,540 |

The occlusion fix adds one anatomical depth draw, sharing the existing geometry. No new assets or dependencies. The fields and sparse atmosphere now render at the opening, so entry cost is higher than the former hidden groups. No frame-rate claim is made.

## Verification

- 37 focused tests passed for chronology, entry continuity, reverse scroll, camera continuity, attachment orientation, canonical release frames, shared source uniforms, reduced motion, transparent draw ordering, and resource disposal.
- ESLint passed.
- Final production build passed and preview restarted at `http://127.0.0.1:5003/`.
- Actual Chrome inspection of 0, 0.25, 0.65, 1.5, 3, 5, 7, 9, 20, 26, 32, and 42 viewports, then reverse travel to 7. No reported application or shader errors.
- Fresh 390 × 844 phone load: scene ready, no horizontal overflow, opening and first bloom inspected, menu opens and closes. Desktop viewport restored afterward.
- Projects navigation retains its single viewport; returning home restores the scroll scene. The final preview is at viewport zero, scene ready, 1440 × 641.
- Reduced-motion behavior verified by focused tests; OS-level reduced motion was not changed for live browser inspection.

## Actual browser captures

- `entry.png`: resting scene with faint background contour fragments.
- `scroll-025.png`, `scroll-065.png`, `scroll-150.png`: first small scrolls.
- `scroll-03.png`, `scroll-05.png`, `scroll-07.png`, `scroll-09.png`: approach, strand unfolding, and response.
- `scroll-20.png`, `scroll-26.png`, `scroll-32.png`, `scroll-42.png`: central bloom, quiet passage, lower bloom, pullback.
- `reverse-07.png`: return to the first bloom.
- `mobile-entry.png`, `mobile-bloom.png`: mobile rendering and copy clearance.

No commits or pushes were made.
