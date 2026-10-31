# Loci

_Planning README. Step 10 replaces it with the judges' README (under 600 words)._

Loci turns a chosen set of your AI conversations into a memory palace in your room. Each topic sits on a real spot as a small cluster of glowing stars, one per thing you concluded. Threads of light link related ideas across topics, and a Recall mode quizzes you as the labels fade.

Entry for Devpost's **Learn AR with SPECS** hackathon, built by CLAD through the Lens Studio MCP.

## Plans

- [Build plan](https://claude.ai/artifact/RVbf8FKL9L5hs6iAhst8fr): current, finalised 31 Oct 2026. Full steps, prompts, answer sheet, video script and risks.
- [Strategy and research](https://claude.ai/artifact/9Z6xifZdnCEEQpv4zJ2B5r): written 31 Oct 2026. Its idea and plan sections are superseded by the build plan.

## Key Dates (IST)

| Date | Milestone |
|------|-----------|
| Sat Oct 31 | Step 0: tools and repo |
| Sun Nov 1 | Brief, sample data, **v1** (Place, Explore, cards) |
| Mon Nov 2 | Chats-to-stars script working |
| Wed Nov 4 | **v2** (real data, Follow, Recall, debrief). Post WIP on Discord that evening |
| Thu Nov 5, 10:30 PM | Live Review (12 PM ET) |
| Fri Nov 6 | Polish: a LEAF test per done criterion; tune text, placement, sound |
| Sat Nov 7, 12 PM | **Feature freeze** (stretch goals only if v2 is solid) |
| Sat Nov 7 to Sun Nov 8 | Video and README |
| Sun Nov 8, 11 PM | **Submit** (our target) |
| Mon Nov 9 | Buffer |
| Tue Nov 10, 3:30 AM | Hard deadline (Mon Nov 9, 5 PM ET) |

Judging runs Nov 10 to 17, and winners are announced around Nov 19. Total budget is about 41.5 hours around the day job, with 10 of them for the video.

## Hackathon Facts (verified 31 Oct 2026)

- **Judges:** Joe Holmes (AI Learning Hackathon Architect, Devpost) and Darlyze Calixte (Developer Marketing Manager, Devpost). Review may be AI-assisted and uses only the text, images and video.
- **Criteria (equal weight):** Design, Technical Implementation (use of CLAD, Lens Studio, MCP), Innovation/Idea, Presentation. Ties go to Design. There is no Impact criterion.
- **Stage One (pass/fail):** a new project, planned with the plan-lens skill (`devpost/design-brief.md`), built by CLAD through the Lens Studio MCP, running in preview, a public YouTube video under 3 minutes, and a public repo with the Lens Studio project and `devpost/` folder.
- **Live Review:** post WIP in Discord `#devpost-learn-feedback`, tagged "Learn AR with SPECS" and "Will It Ship".
- **Prizes:** $1,250 / $750 / $500. Devpost Learn runs a new round each month.
- **Skill pack:** `npx skills add challengepost/learn-specs --all -y`, then "Run the plan-lens skill".

**What wins:** Snap needs proof that Specs ($2,195, shipping fall 2026) are useful every week, and needs many developers testing CLAD. Devpost needs proof its learning-hackathon format works. So the winner is a glasses-native Lens for a real, repeated task that combines all three strengths. It is built visibly by CLAD, verified with LEAF, clear in 30 seconds, and unlike the step-by-step task coaches that crowd this round.

## What We're Building

| Mode | What you do | What you see | Strength |
|------|-------------|--------------|----------|
| **Place** | Grab each of five topic orbs and drop it on a spot | The orb settles on the spot with its topic name | Draws in your world |
| **Explore** | Look at a spot | Its 6 to 8 stars open while other spots stay dim dots. Pinch a star for its one-line card | Shares your view |
| **Follow** | Pinch Follow on a card | The thread pulses to the linked star. Out of view: a chime from its direction and an edge arrow | Leaves your body free |
| **Recall** | Switch to Recall | Labels fade, each spot asks one question. Reveal, mark right or wrong, mastered stars dim, then a debrief | All three |

**Spots:** shelf, desk, window, door and plant, 1.2 to 2.5 m away in the front half of the room. In the preview they are virtual stand-ins at real size.

### Done Criteria

These go into the brief word for word, and each one becomes a LEAF test.

1. Dropping a topic orb on a spot anchors it there and shows its name.
2. Looking at an anchored spot for 0.6 s opens its cluster; looking away for 2 s closes it; only one cluster is open at a time.
3. Pinching a star shows its one-line card beside it; pinching again hides it.
4. Pinching Follow pulses the star's thread. If the linked star is out of view, a chime plays and an arrow at the edge of the view points to it. Facing it opens that cluster.
5. In Recall, labels hide. Reveal shows the answer, marking it right dims that star, and the debrief shows the recalled count per topic.

### Why Glasses

- **Shares your view:** only the spot you face opens.
- **Draws in your world:** thoughts live on real places, which is the method of loci.
- **Leaves your body free:** you walk your palace with your eyes up.
- **Evidence:** in a [University of Maryland study](https://www.umiacs.umd.edu/about-us/news/people-recall-information-better-through-virtual-reality-says-new-umd-study), a memory palace in a headset gave 8.8% better recall than the same palace on a desktop screen.

**Why it's new:** AR memory palaces already exist on phones as flashcards ([Topos](https://www.producthunt.com/p/topos)), and browser extensions draw chats as 2D graphs. Loci is your own thinking, placed in your room and walked through on glasses.

**Ideas we rejected:** the talk-rehearsal Loci (not novel enough), Tandem, an AR body double, and Pivot, moving furniture through doorways (both not useful enough), and a sunlight planner (already on phones: Solis, Insolation AR).

**Estimated score:** about 8.25 (Design 8, Technical 9, Innovation 8, Presentation 8). Design stays at 8 or higher only if each spot stays sparse.

## Data

- The Lens reads one file, `Assets/Scripts/PalaceData.ts`. Its schema and limits are in [devpost/data-spec.md](devpost/data-spec.md).
- v1 uses a hand-written sample, so CLAD never waits on the script.
- `tools/palace-builder` turns chats in `exports/curated/` into that file: LLM extraction, local embeddings, k-means into 5 topics, cross-topic threads (cosine similarity of at least 0.55), PCA layout, then validation that fails loudly.
- The demo uses only our chats about this hackathon.

**Privacy rules**
- Raw chats never enter git: `exports/` is gitignored.
- Read the generated file before every commit.
- Keep other people's names out of the data. The skill pack checks for consent.
- The final README says which chats were used and which steps called an online API.

## Project Structure

```
AR_SPECS/                      repo root, and the Lens Studio project root (holds the .esproj)
├── Assets/                    the Lens, built by CLAD (created by Lens Studio)
│   └── Scripts/PalaceData.ts  generated data, curated and safe to publish
├── devpost/
│   ├── data-spec.md           schema and limits
│   ├── design-brief.md        from plan-lens, approved (Step 1)
│   ├── design-notes.md        what we saw, what changed, why
│   ├── build-log.md           CLAD prompts and outcomes
│   ├── leaf-results.md        test table
│   └── data-card.md           sources and cleaning steps
├── tools/palace-builder/      the chats-to-stars script
├── exports/curated/           raw chats, never committed
├── docs/                      GIF and screenshots for the README
├── CLAUDE.md                  rules for every Claude Code and CLAD session
└── README.md
```

## Build Sequence

Full prompts and checks for each step are in the [build plan](https://claude.ai/artifact/RVbf8FKL9L5hs6iAhst8fr). Start a fresh chat whenever a step says so.

- [ ] **0. Tools and repo** (Sat, 2.5 h): Lens Studio 5.24 (or 5.23.2), Node.js, Git, Claude Code, CLAD, skill pack, `git init`. Check: `/mcp` shows lens-studio connected and `/plugin` lists CLAD.
- [ ] **1. Brief** (Sun, 30 min): run plan-lens with the answer sheet. Check: `devpost/design-brief.md` says `status: approved`.
- [ ] **2. Sample data** (Sun, 30 min): hand-written `PalaceData.ts`. Check: no Logger errors.
- [ ] **3. CLAD builds v1** (Sun, 1 to 2 h): criteria 1 to 3 first, then stop and report.
- [ ] **4. Walk it and fix it** (Sun, 3 h): design notes, not code. Log to `design-notes.md` and `build-log.md`.
- [ ] **5. Script** (Sun evening and Mon, 4 to 6 h): if it's not working by Monday night, hand-curate the data.
- [ ] **6. v2** (Tue and Wed): Follow and Recall, criteria 4 and 5.
- [ ] **7. Review** (Wed Nov 4): 60-second clip to Discord with one specific question.
- [ ] **8. LEAF evidence** (Thu): `devpost/leaf-results.md`.
- [ ] **9. Apply feedback** (Fri, Sat until noon): freeze at noon Sat.
- [ ] **10. Judges' README** (Sat): under 600 words, replaces this file.
- [ ] **11. Video and submit** (Sat and Sun): 2:45 video, public repo, Devpost, by Sun 11 PM IST.

## Submission Checklist

**Pass/fail gate**
- [ ] Project started after Oct 15 (git history shows it)
- [ ] `devpost/design-brief.md` is from plan-lens and marked approved
- [ ] Built by CLAD through the Lens Studio MCP, with `build-log.md` as evidence
- [ ] Runs in the Lens Studio preview
- [ ] Video is public on YouTube and under 3:00, with no copyrighted music or trademarks
- [ ] Repo is public with the Lens Studio project and the `devpost/` folder
- [ ] Description covers what it does, who it's for and what we learned

**What the judges score**
- [ ] LEAF results recorded for all five done criteria
- [ ] `design-notes.md` shows at least three design-led fixes with a before and after
- [ ] Video has one unbroken end-to-end run, the three strengths labelled on screen, and captions
- [ ] README links the evidence for each criterion and names the preview stand-ins
- [ ] Repo searched for real names and private topics before going public
- [ ] Submitted by Sun Nov 8 at 11 PM IST, and Devpost shows it as submitted

## Strategy Notes from the Concept Video

The video is the grading guide: one design challenge, three capabilities, four UI rules and one preview constraint.

| Time | What the video says | What it means for us |
|------|---------------------|----------------------|
| 0:00 | Avoid "websites that live on your face" | No floating 2D panel as core UI. Judges look for this first. |
| 1:10 | Specs track hands and voice | Voice is a first-class input, not an extra. |
| 1:32 | Agent writes code; you bring ideas, taste, judgment | Design rationale is the product. Show decisions, not code volume. |
| 1:41 | Real apps, not demos you watch once | Pick a task people repeat weekly or daily. |
| 1:57 | Comfortable for eyes and body | Short sessions, no neck turns, no arms held up for long. |
| 2:05 | Meaningfully improve on the laptop version | One-line answer to "why not a phone?" |
| 2:19–3:32 | Shares your view, draws in the world, leaves body free | Show each capability in the demo, labelled on screen. |
| 3:55 | Put information on the thing it's about | World-anchored cues at real size, never a HUD. |
| 4:12 | Don't show everything at once | One step, one cue at a time. Silence is a feature. |
| 4:26 | Big, forgiving pinch targets; few small buttons | Two or three large controls, backed by voice. |
| 4:48 | Keep UI where they're already looking | Content sits on the object in the line of sight. |
| 5:38 | Preview can walk, place, pinch, grab, track hands | Build the demo out of exactly those verbs. |
| 5:55 | Preview can't recognise real objects, so mock it | Fake detection on purpose, build the experience on top. |
| 6:26 | Skill pack interview → brief → CLAD build → preview → iterate | Repo and video should show that loop happening. |
| 8:44 | "Will It Ship" feedback session | Shippability is the hidden bar. |

**Most-copied ideas to avoid:** the video's own examples (sign translation, looking things up, pool shots, objects on tables) and step-by-step task coaches, such as the skill pack's risotto coach.
