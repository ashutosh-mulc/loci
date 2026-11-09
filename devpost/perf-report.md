# Loci: performance trace report

Captured on 2026-11-10 with the CLAD skill **`specs-capture-perf-trace`** (`preview.profiling.startTrace` through the Lens Studio MCP). Analysed with **`perfetto-trace-analysis`** (Phase 1, `analyze_lens_trace.py`).

- Raw traces: `devpost/perf/*.pftrace`. Open them at ui.perfetto.dev.
- Summaries: `devpost/perf/*.summary.json`.

## Setup

- Lens Studio 5.23, Preview on **SPECS 27**, Interactive input, Evening Room.
- The final build: the student palace with 5 topics, 35 thoughts and 11 judged links.
- **A — Arrange (9 s).** Recording started right after a preview reset, so it covers the physics layout: 5 rigid bodies in their own zero-gravity world fly out and settle, then Explore begins.
- **B — Explore (10 s).** The settled palace: closed topics drift and breathe, and the halos twinkle.

## Results

| | A: Arrange (physics flight) | B: Explore (steady) |
|---|---|---|
| Frames recorded | 562 | 582 |
| Frame time p50 / p90 / p99 | 4.75 / 7.54 / 10.47 ms | 4.95 / 7.64 / 10.51 ms |
| Worst frame | 13.28 ms | 13.76 ms |
| Frames over the 16.7 ms budget | **0** | **0** |
| `Scene::Update` + `Scene::LateUpdate` (all Lens scripts) | 0.34 + 0.32 ≈ **0.66 ms/frame** | 0.37 + 0.30 ≈ **0.67 ms/frame** |
| `RenderFrame` (drawing the scene) | 0.60 ms/frame | 0.53 ms/frame |
| `Track` (preview's simulated device tracking) | 4.70 ms/frame | 4.89 ms/frame |
| `FaceDetectPreprocess` (preview pipeline) | 0.82 ms/frame | 0.83 ms/frame |

## What it means

- **No dropped frames.** Neither capture has a single frame over the 16.7 ms budget, and the worst frame is about 14 ms.
- **Loci's own cost is small.** All the Lens's scripts together (layout, physics steering, gaze, labels, twinkle) take about **0.7 ms per frame**, and drawing the whole palace about **0.5–0.6 ms**.
- **The physics flight is nearly free.** The arrange capture costs the same as the steady one (0.66 vs 0.67 ms of scripts), so the five rigid bodies and the force-layout playback add nothing measurable. The force simulation itself (300 ticks for 5 topics) runs once, in a single frame, and doesn't show up as a spike: the worst frame in A is 13.3 ms.
- **Most of each frame isn't Loci.** The largest cost is `Track`, the Preview's simulated device tracking, at about 4.8 ms. `FaceDetectPreprocess`, about 0.8 ms, is part of the preview pipeline; Loci has no face features. Both appear in every Lens run in this Preview.
- The cheap rendering reflects earlier design choices: one 2-triangle glow sprite per halo, shared meshes and materials, and only the topic you face opens. Round 12 and the `loci-11-render-cost` LEAF test cover this.

## Honest limits

- These are **Lens Studio Preview** traces on a Mac, not Specs hardware. The analyser marked its device-profile guess as low confidence and its FPS estimate as unreliable, so trust the frame times and slice costs above, not an FPS number.
- These are slice times on the render thread, not CPU-core time.
- The round-0 baseline in `devpost/build-log.md` (Phase 0) was noisy because Lens Studio wasn't the focused app. These captures were taken with the Preview running steadily after a fresh Lens Studio restart.
