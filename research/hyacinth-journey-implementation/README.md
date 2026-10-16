# Implemented hyacinth journey

The homepage has 22 viewport heights of native travel. Its existing copy, navigation, soundtrack control, type and dark treatment remain in place. The camera descends toward the original hyacinth, passes beside its overlapping petals, follows the lower structure, and pulls back into a low view. Reverse scrolling retraces the same camera path.

The visible object uses the original portrait's dots projected onto 85 independently curved petal shells, with a stem and connecting throats (96 closed surfaces total). Fine completion samples reveal previously concealed surfaces. A depth-only surface pass gives the dots consistent occlusion. Close views limit particle diameter, reduce independent jitter, and add restrained blue/violet/fuchsia interference tied to the surface. The opening retains the original dot shader treatment.

The approved generated stills remain visual direction; the images in this directory are captures of the implementation. `live-passage.png` shows the actual portfolio in the in-app browser after physical scrolling to the tenth viewport. `geometry-*.png` are isolated rendering fixtures without the interface.

## Loading and maintenance

The dense reconstruction is built offline. The browser loads cached compressed geometry and preserves its own original image sampling along the reference camera rays. Desktop geometry is 14.54 MB compressed and mobile is 6.36 MB; this is an additional first-visit transfer. The static original remains visible while it loads. The other portfolio routes keep the original backdrop and do not request the reconstruction assets.

Regenerate both geometry assets after changing anatomy:

```sh
node scripts/build-hyacinth-asset.cjs
```

Front attributes and shell positions are stored exactly. Hidden sample attributes and shell shading coordinates use 16-bit storage with less than 0.000063 world units of quantization error. Fetch failures fall back to local reconstruction; missing WebGL retains the static appearance and readable page content.

## Verification

- Production build and repository lint passed.
- All 16 camera and geometry tests passed.
- The opening comparison against the original renderer changed 0.0279% of pixels beyond an 8/255 channel threshold; mean channel error was 0.00316/255. No renderer errors were reported.
- Physically scrolled the live homepage through 0, 3, 10, 15, and 22 viewport positions and back. The full native range measured exactly 22 viewports, with anchored text and navigation.
- Browser checks passed for wheel reversal, Home/End, settled resizing, unchanged routes, mobile portrait, reduced motion, and short-screen no-WebGL fallback. `/about` retains its existing construction notice. Automated results and responsive captures are saved alongside this document by `scripts/hyacinth-journey-check.cjs`.

No push or deployment was performed.
