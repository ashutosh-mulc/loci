# Loci: submission video kit

Target: about 2:40, public on YouTube, recorded from Lens Studio's preview.

## Set up (once)

1. Preview panel: device **SPECS 27**, Interactive, environment **Evening Room** (already set).
2. Make the Preview panel big (undock it or maximise it). Hide other panels you don't want in shot.
3. Select the **DemoTour** object (scene root). Tick **Play On Start**. Speed 1. Show Any User on.
4. Turn your Mac's volume up a little: there's a soft chime when a topic opens.

## Record the tour (about 110 s)

1. Press **Cmd+Shift+5**, choose *Record Selected Portion*, drag the box over the Preview panel only.
2. Press **Record**, then click the preview's reset button (circular arrow) so the tour starts from the top.
3. Stop recording after the head turns back to the front at the end ("LociDemoTour: done" in the Logger).
4. Afterwards, untick **Play On Start** so the tour doesn't move your view in normal use (and doesn't fight the LEAF tests).

Record two or three takes; they come out the same, so pick the smoothest.

## Optional live shots (Interactive Preview, by hand)

- **Real grab:** with Play On Start off, reset the preview, drag one orb up and to the side with the mouse and let go. It flies out and anchors. (WASD to move, right-drag to look, click = pinch.)
- **Too close:** drop a second orb right next to the first: the hint says "Too close to …" and the orb flies home.
- **Walk around:** after placing, walk (WASD) so the palace stays fixed in the room while you move. This sells "it lives in your room".

## Shot list (matches the tour's timing at speed 1)

| Time | On screen | Voiceover |
|---|---|---|
| 0:00–0:15 | Title card: **Loci**, "a memory palace for your AI conversations", on Specs | Line 1 |
| 0:15–0:22 | Tour start: five glowing topic orbs, hint "Drag a topic toward any spot in your room" | Line 2 |
| 0:22–0:38 | Each topic flies to a place in the room and anchors with its name | Line 3 |
| 0:38–0:50 | Head turns to a topic: it blooms into a constellation; thread lines; a card opens | Line 4 |
| 0:50–1:25 | Glance down, pinch Recall. Labels vanish, a star brightens, question, Reveal, Right dims it, Wrong moves on, then one answer at every topic | Line 5 |
| 1:25–1:35 | "Round done" with counts per topic and a Go again button; pinch Explore to finish | Line 6 |
| 1:35–1:55 | Palace switches to another person's guitar palace; topics fly out; a card opens | Line 7 |
| 1:55–2:15 | Optional live shot: walk around the placed palace (WASD) | Line 8 |
| 2:15–2:40 | Close: screen of LEAF results (10/10 pass) or the repo, then title again | Line 9 |

## Voiceover script (about 330 words, 2:20 at a calm pace)

1. "I have dozens of conversations with AI about the things I'm building. The conclusions get buried. Loci turns them into a memory palace, in my own room, on Specs."
2. "Each glowing orb is a topic from my chats."
3. "I look at a place in my room — the shelf, the desk, the window — and let a topic go. It flies there and stays. Any room works: on Specs it lands on the real surface I aimed at."
4. "To explore, I just look. The topic I'm facing blooms into stars — one star for each thing I concluded. Gold stars are decisions, rings are insights, the soft ones are open questions. A pinch opens the one-line card with where it came from. Faint threads show where an idea links to another topic across the room. Only the spot I face opens; everything else stays a quiet dot."
5. "Then I test myself. Recall hides the labels. At each place, one star lights up and asks me its question. I answer in my head, reveal, and mark it right — the star dims — or wrong, and it stays bright for next time. That's the method of loci: memories tied to real places I walk between, which a flat screen can't give me."
6. "One question per topic makes a round. Round done shows what I recalled in each topic, and I can go again or stop."
7. "And it isn't just mine. The palace is a data file. Here's someone else's — they're learning guitar. Same Lens, their topics, their room."
8. "Everything stays where I put it as I move, with my eyes up and hands free."
9. "I built Loci with Claude Code and CLAD in Lens Studio, using the Spectacles Interaction Kit and UI Kit. Every interaction is covered by LEAF tests running in the preview — placing, gaze to open, cards, Recall rounds, another user's palace, and the fixes from code review — all ten pass. Loci: remember what you figured out, where you live."

## Honest limits to say (or put in the Devpost text)

- No Specs device was available: feel on real glasses (gaze timing 0.6 s / 2 s, hand grabs, comfort over a full walk) is unproven. The logic is proven in the preview by LEAF.
- In the preview, World Query can't see the simulated room, so topics anchor 1.6 m out along your aim; on Specs they snap to the real surface.
- Placement and Recall progress aren't saved between sessions yet.
