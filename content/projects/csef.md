---
title: Hybrid Neural Heuristics for Faster Real-Time Path Planning
status: past
tech:
  - "A*"
  - Dijkstra
  - U-Net
  - Neural heuristics
link: "https://fs12.formsite.com/ctsciencefair/files/f-89-26-16389191_4quFFs81_csef_poster.pdf"
---
Path planning is important in robotics, autonomous navigation, and game AI, but classical search
algorithms such as A* and djikstra can become computationally expensive in cluttered environments
because they must expand many nodes before reaching a goal. This project investigated whether learned
spatial guidance could reduce search effort while preserving path quality. I hypothesized that combining a
learned corridor predictor with a learned heuristic would allow a search algorithm to find paths more
efficiently than standard A*.
To test this, I generated datasets of two-dimensional obstacle maps and computed optimal shortest-path
costmaps using Djikstra’s algorithm. I then trained two U-Net models: one to predict a normalized
costmap from a grid and goal, and a second to predict a “pathmask” representing a corridor containing the
optimal path. These learned outputs were integrated into a hybrid planning system in which the pathmask
restricted the search region and the costmap provided a neural-clamped heuristic for A*.

This project was submitted to the Connecticut Science and Engineering Fair in 2026 and was awarded a Finalist Medallion in the Mathematics category.