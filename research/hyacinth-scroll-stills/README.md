# Hyacinth scroll journey — concept stills

Four generated visual targets for the [22-viewport journey](../hyacinth-scroll-journey-plan.md). Created with the built-in `image_gen.imagegen` tool using the existing homepage screenshot and the original hyacinth as references. These are concept composites, not screenshots of an implemented camera path or proof of real-time performance.

The homepage reference supplies the personal copy, navigation, typography, palette, and placement. The generated flower views explore realistic curvature, near/far overlap, and light on the existing dotted material. Image generation may introduce small differences in type placement or anatomy; the eventual implementation must use the actual unchanged page interface and a single coherent flower model.

| Scroll distance | Still | Purpose |
| --- | --- | --- |
| 3 viewports | [Approach](03-approach.png) | Move close to a curled upper blossom while its neighbours recede behind it. |
| 10 viewports | [Petal passage](10-passage.png) | Pass between nearby rims, with smaller blossoms and the stem visible deeper in the gap. |
| 15 viewports | [Underside](15-underside.png) | Emerge beneath the overlapping petals and reveal their curved backs and connections. |
| 22 viewports | [Ending](22-ending.png) | Pull back after the descent so the whole flower is visible above and to the right. |

The initial website reference is [the existing homepage capture](../hyacinth-reconstruction/scroll-smoke-1440x900-initial.png). The original anatomy reference is [the supplied hyacinth](../../public/assets/hyacinth.png).

## Revised dotted / psychedelic direction — October 14

The latest concepts increase the visibility of individual points, reduce the smooth synthetic surface appearance, and use richer cyan/violet/fuchsia variation across the folds. The approach keeps fine botanical detail. The close passage received a second refinement to reduce the bead-like highlights and give the near rim finer stippling. These remain generated concept edits, with the existing website interface used as a locked reference.

- [Revised approach](03-approach-psychedelic-v2.png)
- [Refined close passage](10-passage-psychedelic-v3.png)
- [Initial revision prompts](psychedelic-v2-prompts.json)
- [Close-passage refinement prompt](psychedelic-v3-refinement.json)

The [journey plan](../hyacinth-scroll-journey-plan.md) records this updated material direction. Earlier stills remain available for comparison. No live site implementation changed during this revision.

## Generation record

- [Background scene prompts and references](prompts.json)
- [Website composite prompts](composite-prompts.json)
- The `*-background.png` files are the intermediate flower plates.
- The four PNGs linked in the table are the final website concepts.

The live website was not changed for this still-generation request. Nothing was committed or pushed. Before implementing the complete journey, the next visual gate is reproducing the close petal passage with actual geometry and the existing point renderer, then demonstrating coherent forward and reverse scrolling through it.
