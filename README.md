# Loci

**Too much on your mind? Put it in your room.**

Loci is a memory palace on Specs for an overloaded mind. The things you work through in late-night AI chats (decisions, realisations, open questions) become glowing constellations around you, one per topic. Topics that connect drift together on their own, so you can see how your sleep, money and exams pull on each other. Then Recall turns the room into a gentle self-test: the method of loci, with your own thinking in it.

The demo palace belongs to a fictional final-year student: Exams, Job hunt, Money, Sleep and body, Home and family.

Entry for Devpost's **Learn AR with SPECS**. Built with Claude Code and **CLAD** through the **Lens Studio MCP**, with SIK and UI Kit, and tested with **LEAF**.

📺 Demo video: _link on the Devpost page_

## How it works

| Mode | You do | You see |
|---|---|---|
| **Arrange** | Nothing: just watch | The palace arranges itself. A force-directed simulation (a port of d3-force) lays the topics out by how their ideas link, and each orb flies there as a Lens Studio rigid body in its own zero-gravity physics world. Linked topics settle close; every topic stays at least 20° from the others so you can look at one alone |
| **Grab and throw** | Pinch a topic's dot, move it, let go | It glides on with your throw's momentum and stops; topics linked to it follow part of the way on springs, so the palace feels connected. Closed topics also drift and breathe gently |
| **Explore** | Just look at a placed topic | It blooms into 6 to 8 stars: gold stars are decisions, rings are insights, soft pulses are open questions. Threads of light link ideas to other topics. Only the spot you face opens |
| **Card** | Pinch a star | A one-line card with where the idea came from and when |
| **Recall** | Pinch Recall | Labels hide. Each spot asks one star's question. Reveal, then mark Right (the star fades as mastered) or Wrong (it stays bright). One answer per topic makes a round. "Round done" shows your score per topic, with **Go again** |

**A graph that connects itself (cloud).** New thoughts go to a Supabase graph (`supabase/`). Each one is embedded, joins the closest topic (or starts one), and gets candidate links by similarity. An LLM (Groq, `gpt-oss-120b`) then keeps only real, specific links and names them: *answers*, *supports*, *contradicts*, *depends on*, *refines*, *example of*. `tools/palace-builder/sync_cloud.mjs` syncs both ways: new local thoughts go up, and the judged graph comes down into the Lens. `./start.sh` sets the whole backend up in one command. The Lens itself ships with the data bundled and needs no network or keys to run.

**Any user, any data.** A palace is a JSON file (`devpost/data-spec.md`). `LociPalaceSource` loads one, and a validator enforces the limits: at most 8 stars per topic, labels of 4 words or fewer, at most 2 threads per thought, and stars spaced at least 6 cm apart. The demo tour switches to someone else's guitar-learning palace to show this (`Assets/Data/guitar-palace.json`).

## Why glasses

A memory palace works because ideas are tied to real places you move between; a screen flattens that into a list. On Specs, your room is the index, where you look is the input, and your hands stay free.

## Built with CLAD

- Planned with `plan-lens` (`devpost/design-brief.md`); built through CLAD skills (`specs-build-ui`, `specs-world-query`, `specs-interaction-recipes`, `build-sfx`, `verify-preview`) driving the Lens Studio MCP.
- One loop per change: a failing LEAF test, the fix, every LEAF test, `verify-preview` screenshots, then a log entry in `devpost/build-log.md`. Two code reviews were worked through this way.
- **10 LEAF scenarios, all passing in preview** (`Assets/Tests/`): auto layout (physics, deterministic, linked topics closer), gaze explore, card, recall rounds, any user's data, same-spot drops, threads, reset, aimed label, render cost.
- **Performance traced** with `specs-capture-perf-trace` (`devpost/perf-report.md`): 0 frames over the 16.7 ms budget; all of Loci's scripts take about 0.7 ms per frame, including during the physics flight.

## Run it

1. Open `Loci-Proj.esproj` in Lens Studio 5.22 or later.
2. Set the Preview device to **SPECS 27** and the input to **Interactive**.
3. Watch the palace arrange itself, then look around (right-drag) to open a topic; click to pinch a star; drag a topic's dot to grab and throw it.
4. Optional: select **DemoTour** and tick *Play On Start* for the scripted 2-minute tour.

## Honest limits

- **No Specs device was available.** Logic is proven in the preview with LEAF; feel on real glasses (gaze timing, hand grabs, comfort) is unproven.
- **Topics float in front of you rather than sitting on real furniture.** The layout places them in an 80°-wide band around where you face; snapping each to a nearby real surface (World Query) is the next step.
- **The demo data is fictional** and hand-written (`tools/palace-builder/student-palace.json`); the cloud groups and links it automatically. Pulling thoughts straight out of chat exports, and speaking new ones on Specs, are next.
- **Nothing is saved between sessions yet.**
- No camera, recording or face features, and no people's names in the data.

## Repo map

`Assets/Scripts/` (the Lens; `LociForceLayout.ts` is the layout physics), `Assets/Tests/` (LEAF), `supabase/` (graph schema and the `ingest` function), `tools/palace-builder/` (seed, sync, judge), `start.sh` (backend setup), `devpost/` (brief, data spec, design notes, build log, video script).

## Licence

MIT (`LICENSE`). Third-party packages under `Packages/` (Spectacles Interaction Kit, UI Kit, LEAF, Bitmoji 3D) keep their own licences.
