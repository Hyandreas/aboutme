# Point clouds with real anatomy

Use this reference when a subject should remain visibly composed of dots while gaining a coherent three-dimensional structure. These are implementation recommendations, not a claim about the private source code of any reference website.

## Geometry and appearance are separate

A point cloud can be sampled from a photo, a curved sheet, a three-dimensional surface, or a filled volume. The appearance alone does not establish which one it is.

A photo with brightness mapped into depth still lacks the hidden surfaces, back, cavities, and independent parts of the photographed subject. Wrapping that relief around a cylinder changes its support surface, not its anatomy. Duplicating or mirroring the sheet gives more views of the same image, not a reconstructed object.

For a botanical subject, build the structure in object space: a stem, individual flowers distributed around it, flower throats, curved petal surfaces, buds, and any leaves that belong in the composition. Then sample points from that structure. Sampling meshes can remain invisible; the visible flower can consist entirely of dots.

Do not fill every empty space with random points. The spaces between petals and flowers help the object read. A denser surface layer with occasional sparse interior points is a useful starting experiment, not a universal ratio.

## A practical sampling pipeline

1. Calibrate overall proportions against the existing art reference before adding fine detail.
2. Construct one convincing local part, such as a floret with a throat and recurved lobes.
3. Sample its actual surface by area, or use area-correct parametric sampling. Sampling only the mesh vertices creates density that follows tessellation rather than appearance.
4. Transform the sampled positions into the full object's coordinates. Apply the normal matrix to sampled normals when transforms include nonuniform scale.
5. Give the parts bounded, seeded variation in size, bend, orientation, and color. Stable randomness prevents resampling from changing the object between reloads or captures.
6. Store positions, normals, colors, local coordinates, part identity, and seeds in buffers appropriate to the intended interactions.
7. Render a few point batches instead of one scene object per dot. Keep background dust in a separate layer with a distinct density and response.

[MeshSurfaceSampler](https://threejs.org/docs/pages/MeshSurfaceSampler.html) samples positions and optional normals, color, and UV coordinates from a mesh. Its default distribution follows triangle area. [Points](https://threejs.org/docs/pages/Points.html) renders point geometry, and [BufferGeometry](https://threejs.org/docs/pages/BufferGeometry.html) holds positions and custom attributes. Check the installed Three.js version before adopting imports or methods from the current documentation.

For this portfolio's installed Three.js 0.160.x, the sampler exists at `three/examples/jsm/math/MeshSurfaceSampler.js`. Its installed source supports indexed geometry and a custom random generator. The site's existing `three/examples/jsm/` import style can be retained.

## Give dots a readable surface response

Keep point size and brightness controlled enough that nearby dots remain distinct. Use perspective attenuation, a restrained size variation, and a round footprint. Hardware limits may constrain large point sprites; consider instanced quads only if the intended macro view demonstrates that limitation.

For shader-based lighting, retain sampled surface normals and deliberately implement the lighting terms. A custom point shader does not automatically behave like a standard lit mesh. Use broad form lighting, a limited rim contribution, and low-level fill to reveal throat depth and petal curvature. Preserve the reference palette rather than repainting the entire object as an undifferentiated neon cloud.

Start with depth-tested, depth-writing point cores whose outer fragments are discarded. Test a separate restrained halo layer if needed. Fully additive rendering throughout the flower can show the back through the front and erase its depth. Transparent layers without a considered depth strategy can have sorting artifacts.

A hidden depth-only anatomical surface is an optional remedy for visible rear-point leakage, not the default: it can also make the flower feel unexpectedly solid. Evaluate that tradeoff in the actual views. Never turn the sampling surface into a visible opaque flower as an accidental fix.

Recompute viewport-dependent point-size uniforms when the canvas size or pixel ratio changes. Tune postprocessing after the geometry is convincing with effects disabled.

## Motion should preserve structure

Prefer coherent bending within a part over independent random jitter at every dot. Small local motion can remain inside the surface envelope and leave petal edges readable.

A bloom response can travel through plant height, then displace each part's points along their local normals or use its local petal coordinates. Pushing every point along world Z makes the response biased toward one viewing angle. Model-space attributes permit the response to look coherent from the back and side too.

For a temporary separation or expansion, preserve point-to-part correspondence and return to the same rest positions. Interpolate a stored rest state or a parametric part pose rather than repeatedly sampling a different flower.

## Verify that it is truly three-dimensional

Use a fixed set of front, three-quarter, left, right, rear, top-oblique, and close-up views, with motion and effects temporarily disabled. Check that:

- Side views reveal the lengths of throats, curvature of petals, and different flowers in front of and behind the stem.
- Rear views show independent rear flowers, not the front image reproduced backwards.
- Camera translation changes the relative position of near and far parts.
- Near petals correctly obscure farther structures while the dotted surface remains evident.
- Repeated reloads preserve anatomy and sampling.

A nonzero Z range or a visually interesting orbit alone is insufficient evidence. Judge the relationships between actual parts.

Measure performance in the largest planned close-up as well as the wide view. Point count, screen coverage, halo overdraw, pixel ratio, and postprocessing all matter. Use nested, spatially distributed quality tiers so reducing the point count does not remove entire flowers. Pause unnecessary work when the page is hidden and dispose buffers and materials when the scene ends.
