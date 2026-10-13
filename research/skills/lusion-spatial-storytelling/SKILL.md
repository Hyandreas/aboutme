---
name: lusion-spatial-storytelling
description: Design and plan immersive, scroll-driven WebGL experiences using patterns observed on Lusion and its launched client sites. Use for Lusion-inspired spatial websites, camera choreography, interactive hero objects, and turning an existing point-cloud visual into a true 3D subject. Preserve the project's chosen visual identity; this is not a site-cloning or video-generation workflow.
---

# Spatial storytelling for the web

Make the visitor understand a subject by moving through its space. Start from the project's existing identity and content, then choreograph changes in view, scale, representation, and interaction around that subject.

This skill is grounded in a hands-on browser pass on October 13, 2026. Read [field-notes.md](references/field-notes.md) when selecting reference patterns or making a claim about a specific website. Those notes include the actual launched URLs, actions, accepted screenshots, and limits of the observations. The sites can change; the notes are dated evidence, not a promise about their current behavior.

For particle subjects, read [point-clouds.md](references/point-clouds.md). A dotted appearance and a three-dimensional structure are independent decisions.

## Establish what the project needs to retain

Inspect the active scene, routes, assets, content pipeline, and repository guidance. Distinguish the current experience from dormant experiments. Identify the recognisable subject, palette, material language, typography, and useful navigation before proposing changes.

Translate “like Lusion” into experience qualities, such as spatial depth, coherent transitions, one striking object, or responsive feedback. Do not infer permission to copy their objects, branding, client content, or exact scene compositions. Do not replace dots with solid meshes when the user intentionally chose dots.

Match the requested deliverable. Research and a plan do not authorize implementing a redesign. Complete an authorized implementation without adding an unrelated hosting, video, or asset-generation pipeline.

## Research the actual experience

When new reference research is requested:

1. Open the source studio's case study only to establish authorship and find its launch link.
2. Visit the launched website itself. An archived working website can be useful; label it as an archive. A preview video on the studio's site is not evidence of the client's interactions.
3. Inspect the loaded opening state, physically scroll forward in manageable increments, stop within important transitions, and reverse through at least one sequence.
4. Separate ambient motion that continues at rest from movement caused by scrolling and movement caused by a click or drag.
5. Exercise a relevant visible interaction when available. Verify the result instead of assuming that a displayed control works.
6. Save and inspect screenshots of meaningful states. Record the URL, chapter, action, visual change, persistent controls, and uncertainty. Reject loading screens and accidental transitional blanks as representative evidence.

Do not infer a site's renderer, simulation, asset format, exact timing, or performance from screenshots. Attribute technical claims to the studio's documentation. If the browser fails, use its supported recovery or an available browser fallback and report the limitation.

## Choose a small set of spatial patterns

| Observed pattern | Useful application | Decision check |
| --- | --- | --- |
| Of The Oak's point-built ecosystem and adjacent information | Use a continuous botanical structure as the anchor for changing views and content | Does geometry remain understandable from a new angle? |
| Synthetic Humans' wide-to-close camera staging | Move from recognition of the whole subject into one meaningful detail | Does the close-up explain something the wide view could not? |
| Atlas Motion's separated and assembled motor views | Reveal constituent parts while preserving the subject's identity | Can the visitor follow the relationship between parts? |
| Devin's demonstration followed by conventional content | Concentrate spatial motion where it explains the product, then provide quiet reading | Can visitors quickly reach the useful information? |
| Oryzo's object flip and material close-up | Make an action produce a clear response in the subject itself | Is the consequence legible and consistent with the material? |
| Lusion's framed opening, editorial rhythm, and full-screen journey | Build a progression from seeing an object to entering its world | Is each change connected to the preceding composition? |

Use only the patterns that serve the brief. A personal botanical portfolio does not need every effect seen in an agency showcase.

## Write a storyboard before a timeline

Define the main scenes as compositions, not lists of effects. For each scene specify:

- What the visitor should notice or learn.
- Subject scale and screen position; foreground, middle ground, and background.
- Camera position, target, and the path from the previous composition.
- Which text enters, where it rests, and when it leaves.
- Which change is driven by scroll, which continues at rest, and which needs a deliberate interaction.
- A stable reading interval and a reverse-scroll result.

Keep camera movement on intentional arcs with gradual acceleration. Let secondary motion follow the main movement without obscuring the silhouette. A small orbit that reveals hidden anatomy can be more useful than several full revolutions.

Separate a transition interval from a reading interval. Hold the framing while text is being read; limit simultaneous changes in camera, object deformation, color, and typography. Carry an object, contour, framing direction, or lighting cue into the next scene so transitions feel related.

Keep navigation as a reliable spatial reference. A route jump or chapter selector should reach the same state as scrolling. Avoid copying automatic route changes at the end of a scroll unless the brief benefits from that behavior.

## Implement the scene as one coherent system

Prefer the project's existing renderer and animation tools when they can do the work. Another framework or smooth-scroll library is not inherently an improvement.

Keep persistent geometry and point identities. Build assets and buffers outside the frame loop. Use one main render loop and one shared progress value for the camera, object pose, lighting, and any related DOM presentation. Use elapsed-time-based damping so response does not depend on refresh rate.

Distinguish input from scene state. Native document scrolling can drive normalized chapter progress while a fixed or sticky canvas displays the scene. Scroll reversal must recover the previous composition, rather than replaying a one-shot animation. A click response can use its own short-lived interaction state without taking control of the scroll timeline.

Preserve DOM text, semantic links, and visible focus. Give canvas interactions equivalent controls when they affect meaningful navigation or information. Local pointer responses should not unexpectedly move the camera or the whole subject. Keep audio optional and deliberate.

## Judge the result from more than the hero

Verify these properties in the delivered implementation:

- The subject reads at the entry pose, oblique view, side view, and planned close-up.
- Geometry has meaningful depth; a warped photo or camera-facing sheet is not accepted as a reconstructed object.
- Text remains legible during its resting interval and avoids the subject's important contours.
- Forward scrolling, reversal, chapter jumps, route changes, and resizing agree about scene state.
- Each interaction has a clear result, reaches a stable end, and leaves navigation usable.
- Dots remain visible if dots are part of the brief; glow and density do not merge them into an unintended solid surface.
- Mobile, reduced motion, missing WebGL, and background-tab behavior remain useful.
- Particle count, pixel ratio, overdraw, and postprocessing are measured on the target devices. Do not claim a frame-rate or load-time result without measuring it.

Use visual evidence to decide whether to improve the model, lighting, camera, or sampling. Do not conceal weak geometry with blur, glow, or more rotation.

## Handoff

For a plan, deliver the selected direction, a small storyboard, the first implementation milestone, concrete acceptance checks, and the reference evidence. Label proposals separately from observed behavior.

For an implementation, show the verified result, describe what changed and why, summarize actual checks, and identify material limitations. Do not claim that a source-site technique was reproduced merely because the first screenshot looks similar.
