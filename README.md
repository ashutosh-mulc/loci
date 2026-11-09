# Loci

**A memory palace for your AI conversations, in your own room, on Specs.**

Each topic from your AI chats lives at a real place you choose (desk, shelf, window) as a constellation: one star per thing you decided, learned or still wonder about. Recall turns the room into a self-test, the method of loci with your own thinking in it.

Entry for Devpost's **Learn AR with SPECS**. Built with Claude Code and **CLAD** through the **Lens Studio MCP**, with SIK and UI Kit, and tested with **LEAF**.

📺 Demo video: _link on the Devpost page_

## How it works

| Mode | You do | You see |
|---|---|---|
| **Place** | Grab a topic orb and let it go toward any spot in your room | It flies there and anchors with its name. On Specs it lands on the real surface you aimed at (World Query) |
| **Explore** | Just look at a placed topic | It blooms into 6 to 8 stars: gold stars are decisions, rings are insights, soft pulses are open questions. Threads of light link ideas to other topics. Only the spot you face opens |
| **Card** | Pinch a star | A one-line card with where the idea came from and when |
| **Recall** | Pinch Recall | Labels hide. Each spot asks one star's question. Reveal, then mark Right (the star fades as mastered) or Wrong (it stays bright). One answer per topic makes a round. "Round done" shows your score per topic, with **Go again** |

**Any user, any data.** A palace is a JSON file (`devpost/data-spec.md`). `LociPalaceSource` loads one, and a validator enforces the limits: at most 8 stars per topic, labels of 4 words or fewer, at most 2 threads per thought, and stars spaced at least 6 cm apart. The demo tour switches to someone else's guitar-learning palace to show this (`Assets/Data/guitar-palace.json`).

## Why glasses

A memory palace works because ideas are tied to real places you move between; a screen flattens that into a list. On Specs, your room is the index, where you look is the input, and your hands stay free.

## Built with CLAD

- Planned with `plan-lens` (`devpost/design-brief.md`); built through CLAD skills (`specs-build-ui`, `specs-world-query`, `specs-interaction-recipes`, `build-sfx`, `verify-preview`) driving the Lens Studio MCP.
- One loop per change: a failing LEAF test, the fix, every LEAF test, `verify-preview` screenshots, then a log entry in `devpost/build-log.md`. Two code reviews were worked through this way.
- **10 LEAF scenarios, all passing in preview** (`Assets/Tests/`): place, gaze explore, card, recall rounds, any user's data, same-spot drops, threads, reset, aimed label, render cost.

## Run it

1. Open `Loci-Proj.esproj` in Lens Studio 5.22 or later.
2. Set the Preview device to **SPECS 27** and the input to **Interactive**.
3. Drag orbs with the mouse; click to pinch.
4. Optional: select **DemoTour** and tick *Play On Start* for the scripted 2-minute tour.

## Honest limits

- **No Specs device was available.** Logic is proven in the preview with LEAF; feel on real glasses (gaze timing, hand grabs, comfort) is unproven.
- **World Query** can't see the preview's simulated room, so topics land 1.6 m out along your aim. On Specs it answers at about 5 Hz and Loci waits only 0.4 s for a hit, so some topics will still land mid-air; a longer wait or retry is the next fix.
- **The data is hand-curated** from my own planning chats (`PalaceData.ts`); automatic extraction was cut for time.
- **Nothing is saved between sessions yet.**
- No camera, recording or face features, and no people's names in the data.

## Repo map

`Assets/Scripts/` (the Lens), `Assets/Tests/` (LEAF), `devpost/` (brief, data spec, design notes, build log, video script).
