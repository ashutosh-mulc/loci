# Loci build log

CLAD prompts, outcomes and LEAF results, session by session.

## Sat Nov 7: setup and sample data (Claude Code, before CLAD)

- Installed Node.js 26.13.0 (Homebrew) and the Devpost Learn skill pack (`npx skills add challengepost/learn-specs --all -y`), which added `plan-lens`.
- Exported the "Winning Strategy" and "Loci Build Plan" docs to `exports/curated/` (gitignored) as the v1 data source.
- Wrote `Assets/Scripts/PalaceData.ts` by hand from those two docs: 5 topics, 35 thoughts (7 per topic) and 18 threads. `tools/palace-builder/make_sample.py` regenerates it and fails loudly if a spec limit is broken. It passed every limit in `devpost/data-spec.md`, passed `tsc --strict` and has no people's names.
- Created the SPECS Base Template project (Lens Studio 5.23.2), then moved it into the repo root so the repo is the Lens Studio project. The only files with the same name, `.gitignore` and `CLAUDE.md`, were merged by hand. Git LFS is on for binary assets, as Lens Studio's `.gitattributes` expects.
- Installed CLAD (`ls-clad@ls-extensions`) and connected the Lens Studio MCP. TypeScript, including `PalaceData.ts`, compiles with no errors. The only Logger warnings are adb looking for a device over USB.
- `.agents/` vanished after the project reopened, which left `.claude/skills/plan-lens` a broken link. I replaced it with a real copy from `agent/skills/plan-lens`. No CLAD build yet, so no LEAF results.

## Sun Nov 8: CLAD build of done criteria 1 to 3

- Prompt: "Read devpost/design-brief.md and build it for SPECS. Follow the brief closely. Get the basic flow working first, then add detail. Write and run LEAF tests for each done criterion, and tell me which pass." Scope this run: criteria 1, 2, 3 only.
- Lens Studio had an empty temp project open; CLAD opened Loci-Proj.esproj.
- Built: `LociPalaceController` (Place, Explore gaze, cards; test API), `LociState`, `LociMeshes` (code-built orbs, stars, rings, wireframe stand-ins), `LociSpotStandIn`, `LociLabelsUI`, `LociCardUI` (UI Kit rounded outline + flex layout, no dark panel), and a soft `ClusterChime.wav`.
- LEAF: installed Leaf 2.0.2 (4.0.0 needs a newer SIK than this project's SpectaclesInteractionKit 2.0.0). Scenarios in `Assets/Tests/`, run by `LociLeafRunner` (tick Auto Run on the LeafIndex object, then reset the preview).
- LEAF results (3/3 pass, run three times):
  - loci-1-place: PASS (real SIK grab and drag of an orb onto the desk; a missed drop does not anchor)
  - loci-2-explore-gaze: PASS (0.3 s not open, 0.9 s open, switch spots, still open at 1 s away, closed at 2.4 s, never more than one open)
  - loci-3-star-card: PASS (pinch shows the card with sentence and source/date beside the star, pinch again hides, one card at a time, closes with its cluster)
- Not built yet: Recall (criterion 5) and Follow (criterion 4).

## Sun Nov 8: Recall (criterion 5), built in the main session with CLAD skills

- Prompt: "Yes please. Keep me updated about this." (go-ahead to build Recall and fix the orb position).
- Built: `LociRecall.ts` (Recall flow, reads PalaceData), `LociRecallUI.ts` (UI Kit Ghost buttons with a thin glowing outline, flex layout, no dark panel). Controller: gaze also opens spots in Recall, cards are blocked in Recall, the asked star grows 1.7x, spot label toggle.
- Scene: `Loci > UI > RecallUI` (LociRecallUI) and a LociRecall component on `Loci`, wired through the Editor API. Saved.
- Environment: the Lens Studio capture tool re-installed `AiPreviewAgentInspect`, `Icons` and `Motion` (and an "AiPreviewAgent Handler" object), which break compilation against SIK 2.0.0. Removed again.
- LEAF now runs through the LEAF panel and the `run_leaf_scenario` MCP tool (the LociLeafRunner still works too).
- LEAF results, final code (4/4 pass):
  - loci-1-place: PASS
  - loci-2-explore-gaze: PASS
  - loci-3-star-card: PASS
  - loci-5-recall: PASS (pinches the real Recall, Reveal, Right and Wrong buttons; labels hide; the prompt shows and its star is highlighted; Reveal shows the card text; Right dims and counts; Wrong stays bright and moves on; debrief on a second Recall pinch, and on its own once all five spots have been answered, with per-topic counts)
- Criterion 4 (Follow) is not built and has no test.

## Sun Nov 8 (later): any room, any data, new look

- Prompt: "it looks very bad actually ... I need a presentable project. Lets build a scalable more general product. The scene can change for different users right." Then approved: any room + any data, look, hints, video.
- Probe: World Query in Interactive Preview rooms returns only a fixed plane 5 m ahead; no hits on furniture or floor.
- Built: drop-anywhere Place with flights (LociPalaceController rewrite), LociPalaceSchema + LociPalaceSource (per-user JSON), LociHintUI, glow halos, bloom, threads. Removed LociSpotStandIn and the Spots stand-ins.
- LEAF results (5/5 pass): loci-1-place (real SIK drag, anchor 147 cm out, 6.7° off the aim line; too-close refusal), loci-2-explore-gaze, loci-3-star-card, loci-5-recall, loci-6-any-data (new: validator + rebuild from another user's palace).

## Sun Nov 8 (later): demo tour

- Prompt: "Can you commit before you proceed with the demo?" Committed 80ffaad first, then built the tour.
- Built LociDemoTour (scripted, smooth head turns, uses the real controller/Recall/data APIs) and the video kit (devpost/video-script.md).
- Watching the tour exposed two bugs, fixed: the debrief vanished when glancing down to pinch Explore; the Recall hint re-armed and overlapped. Recall panel enlarged 1.4x.
- LEAF results, final code (5/5 pass): loci-1-place, loci-2-explore-gaze, loci-3-star-card, loci-5-recall (now also asserts the debrief shows within 30 cm of the button), loci-6-any-data.
- Review fixes (relayed ultrareview of the uncommitted demo work): committed LociDemoTour + video script; one restartable debrief timer; the Recall nudge keeps its full 6 s when other topics open; the smaller debrief size applies only beside the button; removed the unreachable 1 m-ahead debrief fallback. LEAF 5/5 pass after the fixes.

## Nov 8: /verify-preview QA pass

Prompt: `/ls-clad:verify-preview`.

- Ran the demo tour in Interactive Preview and screenshotted Explore, a Recall question and the debrief. The debrief shows above the Recall button and is readable (first visual check of that change).
- Found: one tour run placed only 2 of 4 guitar topics, and the debrief counted 1 Right answer instead of 2. Cause: the tour used fixed timers. When the preview drops frames, gaze dwell and the async World Query answer arrive late, and the tour moves on too early.
- Fixed in `LociPalaceController.releaseOrb`: if World Query hasn't answered within 0.4 s, the orb uses the default distance. Before, the orb could hang forever. The orb now stays busy while a release is pending, a palace swap mid-release is ignored, and refusals are logged.
- Fixed in `LociDemoTour`: it waits for the real state (anchored, open, question asked), up to 3 s, and logs if it gives up.
- Re-ran: the tour placed 5/5, the debrief counted both answers (2 Right), and all 4 guitar topics placed. No "gave up" lines.
- LEAF after the change: loci-1-place, loci-2-explore-gaze, loci-3-star-card, loci-5-recall and loci-6-any-data all pass (5/5).

## Nov 9: review v2 loop

Prompt: "run the suggested loop" over `loci-review-v2.md` (one item per round: LEAF test first, fix, all LEAF, verify-preview, log, commit).

### Phase 0: perf baseline (specs-lens-perf-attribution)
- Temporary harness `Assets/Scripts/Profiling/PerfSweepDriver.ts` (since removed). Three 10 s traces: 00 Loci off, 01 Place, 02 Explore with one topic held open.
- The bundled `perfetto_sweep_summary.py` fails with the current `perfetto` Python package (`'Row' object is not iterable`), so I queried the traces directly.
- Result: noisy. Preview frame pacing swings when Lens Studio isn't the focused app (71 to 371 frames per trace). Loci's own `Scene::Update` + `LateUpdate` + `RenderFrame` is about 1.5 ms/frame in Explore and up to about 7 ms/frame in the throttled Place trace. The Preview's simulated tracking (`Track`, 5 to 25 ms/frame) dominates and isn't ours. Treat as a rough baseline; Phase 3 will use A/B traces.

### Round 1: item A, an orb refused on landing hung in mid-air
- Test first: new `loci-7-same-spot` (`LociSameSpotScenario.ts`) releases two orbs at the same place in the same frame. Before the fix: **failed**, with the refused orb left 176.9 cm from home.
- Fix (`LociPalaceController`):
  - If `placeTopicAt` fails when the flight lands, the orb flies home.
  - `rejectReason` also counts orbs still flying to a place.
  - `updateFlights` runs `done()` after replacing the flight list. Before, a fly-home started inside `done()` was dropped.
- LEAF: loci-1-place, 2-explore-gaze, 3-star-card, 5-recall, 6-any-data and 7-same-spot all **pass (6/6)**. The refused orb ends 0.0 cm from home.

### Round 2: #1, threads started near the cluster centre, not at their stars
- Test first: new `loci-8-threads` compares each thread's start with its own star after the bloom. My first version compared with the *nearest* star and passed falsely, because the star at offset (0,0,0) sits at the centre. Fixed the test. Before the fix: **failed**, with the worst start 13.8 cm from its star.
- Fix: `buildThreads` reads star positions with the cluster at full size, since it is still at 1% when threads are built, then restores the bloom scale. Added `getThreadSegments()` for tests.
- LEAF: 1, 2, 3, 5, 6, 7, 8 all **pass (7/7)**.
- verify-preview: screenshot of the tour's Explore step ("Build plan") shows threads leaving from four different stars.

### Round 3: #3, reset and palace swap put the orbs where the Lens started
- Test first: new `loci-9-reset-here` turns the head 90° right and resets, then 90° left and swaps palaces, and measures the orbs' angle from the view direction. The first version passed falsely because preview tracking reset the head between frames, so it now applies the head turn in the same frame. Before the fix: **failed**, with an orb 114° off the view.
- Fix: `resetPalace` re-anchors the palace to the user (as at start) and puts each orb back at its arc position under the moved root (new `homeLocal`), recomputing `home`. `setPalace` goes through `resetPalace`, so it gets the same.
- LEAF: 1, 2, 3, 5, 6, 7, 8, 9 all **pass (8/8)**. After the fix the worst orb is 24° off, which is the arc's half-width.

### Round 4: #5, the orb arc was 48° wide, wider than the ~32° Specs view
- Test first: tightened `loci-9-reset-here` so every orb must be within 15° of the view direction. Before the fix: **failed** at 24°.
- Fix: the arc is 22° wide (`orbArcSpanDeg`, scene value too), at most 5° per gap. Orbs sit in staggered height rows 7 cm apart (2 rows for 4–5 topics, 3 for 6–8) so neighbouring labels don't collide. Orb halo is r×1.9 (was 2.6) and orb label cap is 0.9 cm.
- verify-preview: three passes at true Specs scale. At 28° the edge labels were cut off, and at 20° "Open questions" touched "What Snap wants". At 22° with staggered rows, all five names are separate and inside the view.
- LEAF: 1, 2, 3, 5, 6, 7, 8, 9 all **pass (8/8)**. The `loci-8-threads` tool call timed out once; the log showed the scenario had run (0.00 cm), and a re-run returned **succeeded**.

### Round 5: #4, how Recall ends (your decision: one round per topic)
- Test first: extended `loci-5-recall`. After one answer at every topic, the panel must be `roundDone` with text starting "Round done", the per-topic counts and a Go again button. Pressing the real `GoAgainButton` must start a new round with a not-yet-recalled question. Before: **failed** (`Expected "roundDone", received "debrief"`).
- Fix:
  - `LociRecallUI` has a `roundDone` panel mode: counts above, one "Go again" button in the action row.
  - `LociRecall.goAgain()` clears the round and asks again at the open topic; recalled stars stay recalled. Topics opened after the round ends show the same Round done panel.
  - Pinching Explore still ends Recall with the counts above the button.
- Demo tour now answers at every topic so the video shows "Round done". `video-script.md` timings updated (about 2:40).
- verify-preview: tour screenshot shows "Round done", five topics at 1/7, and the Go again button, all readable. The tour still finishes all four steps (guitar 4/4).
- LEAF: 1, 2, 3, 5, 6, 7, 8, 9 all **pass (8/8)**. The `loci-5-recall` tool call times out because the scenario is long; the result was read from the log ("Scenario loci-5-recall completed successfully").

### Round 6: #6, star labels were well under the brief's ~4 cm cap height
- Test first: new `loci-10-aimed-label`. Open a topic, aim the gaze at its outermost star: that star must be "aimed" with a label scale above 2, others at about 1, and it must shrink back when the gaze moves on. Before: **failed** (aimed = null, scale 1.00).
- Fix: `updateAimedLabel` picks the star under the hand ray, else the one nearest the gaze within 4° (`aimConeDeg`). Its label eases to `aimedLabelCapCm` = 4 cm (the brief's size), 2.2× the normal 1.8 cm; the others fade to 30% while one is aimed. `LociLabelsUI.setScale`/`getScale`/`setAlpha` added.
- verify-preview: two tour screenshots. First pass: the big label ("Data first, then CLAD") read well but covered a neighbour's label. After the fade, the other labels sit back and the aimed one stands out.
- LEAF: 1, 2, 3, 5, 6, 7, 8, 9, 10 all **pass (9/9)**. Run **one at a time** at your request, after a batch collided in the background and five runs were cancelled (cancelled, not failed).

### Round 7: #7, card text didn't scale with distance
- Test first: extended `loci-3-star-card`. Open the farthest topic, show a card, and expect the card's scale to equal max(1, distance / 150 cm). Before: **failed**, with the card at scale 1.00 on a topic 221 cm away (1.47 needed).
- Fix: `LociCardUI.place()` scales the card (and its offset from the star) by max(1, distance / readingDistanceCm), the same rule the Recall panel uses, so the text keeps the angular size it has at 1.5 m.
- verify-preview: tour Explore screenshot. The card beside "Fresh chat per build" reads clearly and sits fully in view.
- LEAF: 1, 2, 3, 5, 6, 7, 8, 9, 10 all **pass (9/9)**, run one at a time.
