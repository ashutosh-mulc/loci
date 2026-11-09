# Loci: Devpost submission text

Paste-ready text for the submission form. Video: (YouTube link). Repo: https://github.com/ashutosh-mulc/loci

## Tagline

Too much on your mind? Put it in your room. A self-arranging memory palace on Specs.

## What it does

When your head is full (exams, rent, a job hunt, a family trip, waking at 4 a.m.), everything feels like one knot. Loci takes the things you worked through in AI chats and puts them in your room as glowing constellations: one per topic, one star per decision, realisation or open question.

- **It arranges itself.** No dragging. A force-directed simulation (our TypeScript port of d3-force) lays the topics out by how their ideas link. Each orb flies there as a Lens Studio rigid body in its own zero-gravity physics world, pushing off the others in flight. Linked topics settle close and unrelated ones drift apart, so you can *see* that sleep, money and exams pull on each other. Every topic stays at least 20° from the others, so you can look at one alone.
- **Grab and throw.** Pinch any topic and move it or fling it. It glides on with your momentum, and the topics linked to it follow part of the way on springs, like pulling on a thread. Closed topics drift and breathe, so the room never looks frozen.
- **Explore by looking.** Face a topic and it blooms into stars: gold for decisions, rings for realisations, soft pulses for open questions. Pinch a star to read its one-line card and where it came from. Faint threads reach to related thoughts in other topics. Only the topic you face opens; everything else stays a quiet dot.
- **Recall.** Labels hide and each place asks you one question. Reveal, then mark it right (the star fades) or wrong (it stays bright for next time). One answer per topic makes a round, with "Round done" counts and Go again. This is the method of loci: thoughts tied to places you move between.
- **A graph that connects itself.** In the cloud (Supabase + pgvector), each new thought is embedded and joins the closest topic, or starts one. Similarity proposes links, and an LLM (Groq, gpt-oss-120b) keeps only real, specific ones and names them: answers, supports, contradicts, depends on, refines, example of. A two-way sync script brings the judged graph into the Lens and sends new local thoughts up. `./start.sh` sets up the backend in one command.
- **Any user, any data.** A palace is a validated JSON file (at most 8 stars per topic, labels of 4 words or fewer). The demo switches from a student's palace to a guitar learner's in the same Lens.

The demo palace is fictional: a final-year student's Exams, Job hunt, Money, Sleep and body, and Home and family.

## Why AR and Specs

A memory palace works because ideas are tied to real places you move between, and a flat list on a screen loses that. On Specs your room is the index, where you look is the input, and your hands and eyes stay free. The display is additive, so everything is light: no dark panels, only glow.

## How we built it

- Planned with the Devpost Learn skill pack (`plan-lens` → `devpost/design-brief.md`) and built with Claude Code through **CLAD** and the Lens Studio MCP. We used `specs-build-ui`, `specs-interaction-recipes`, `physics`, `build-sfx` and `verify-preview`, with SIK and UI Kit for every interaction.
- One loop per change: a failing **LEAF** test first, then the fix, every LEAF test run one at a time, `verify-preview` screenshots, and an entry in `devpost/build-log.md`. **10 LEAF scenarios pass in the preview:** auto layout (physics bodies, deterministic, linked topics closer), gaze to open, cards, Recall rounds, another user's data, same-spot handling, threads, reset, aimed label and render cost.
- `devpost/` holds the brief, data spec, design notes, build log and video script.

## Challenges

- **Dense graphs fight intuition.** With d3's default link strength, linked topics in a small, dense palace ended up *farther* apart than unlinked ones. We tuned link strength per thread until distance reliably falls as links strengthen, and wrote a LEAF test for exactly that.
- **Physics for motion, maths for placement.** Lens Studio physics has no spring joints, so the simulation decides where topics go, and rigid bodies with colliders carry them there.
- **Similarity isn't meaning.** Short notes all look alike to embeddings: "Builds take thirty minutes" ended up linked to "Cooking is crowded". An LLM judge removed 9 of 13 such links in a dry run.

## Honest limits

- No Specs device was available. Logic is proven in the preview with LEAF; the feel on real glasses is unproven.
- Topics float in a band in front of you rather than sitting on real furniture. Snapping to surfaces is next.
- Demo data is hand-written. Importing chat exports, and speaking new thoughts on Specs, are next.
- No camera, recording or face features, and no people's names in the data.

## Built with

Lens Studio 5.22+, Specs (SPECS 27 preview), Spectacles Interaction Kit, Spectacles UI Kit, LEAF, CLAD, Claude Code, TypeScript, Supabase (Postgres, pgvector, Edge Functions, gte-small), Groq.
