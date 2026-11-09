# Loci: submission video kit

Target: about 2:45 (hard limit: under 3:00), public on YouTube, recorded from Lens Studio's preview.

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

- **Arrange again:** with Play On Start off, press the preview's reset: the orbs fly out and settle the same way every time. (WASD to move, right-drag to look, click = pinch.)
- **Walk around:** after placing, walk (WASD) so the palace stays fixed in the room while you move. This sells "it lives in your room".

## Shot list (matches the tour's timing at speed 1)

Rules from the hackathon: under 3 minutes, a screen recording of the Lens running in Lens Studio's preview, public on YouTube, no third-party music or trademarks (the chime is our own generated sound).

| Time | On screen | Voiceover |
|---|---|---|
| 0:00–0:12 | Title card: **Loci**, "too much on your mind? put it in your room", on Specs | Line 1 |
| 0:12–0:30 | Tour start: five glowing topic orbs, hint "Arranging your palace by how your ideas connect". They fly out and settle by themselves | Lines 2–3 |
| 0:30–0:45 | Head turns to a topic: it blooms into stars; thread lines reach to linked topics; a card opens | Line 4 |
| 0:45–1:20 | Glance down, pinch Recall. Labels vanish, a star brightens, question, Reveal, Right fades it, Wrong moves on, one answer at every topic | Line 5 |
| 1:20–1:30 | "Round done" with counts per topic and Go again; pinch Explore to finish | Line 6 |
| 1:30–1:50 | Palace switches to someone else's (guitar learner); it re-arranges itself; a card opens | Line 7 |
| 1:50–2:20 | Cut to the repo / terminal: a new thought added with `add.mjs`, the cloud links it (Groq names the relation), `sync_cloud.mjs` pulls it in | Line 8 |
| 2:20–2:45 | LEAF panel: 10/10 pass. Close on the title | Line 9 |

## Voiceover script (about 320 words, 2:30 at a calm pace)

1. "Exams, rent, a job hunt, a family wedding, waking at 4 a.m. When your head is full, everything feels like one big knot. Loci lets you take it out of your head and put it in your room, on Specs."
2. "These are the thoughts a student worked through in late-night AI chats: five topics, about thirty-five thoughts."
3. "I don't place anything. The palace arranges itself: a physics simulation pulls together topics whose ideas are linked and pushes the rest apart. Sleep sits next to exams and money, because they really do pull on each other."
4. "To explore, I just look. The topic I face blooms into stars: gold for decisions, rings for realisations, soft pulses for questions I haven't answered yet. A pinch opens the card. Threads show where a thought connects to another part of my life."
5. "Then Recall. Labels hide, and each place asks me one question. I answer in my head, reveal, and mark it right, and it fades, or wrong, and it stays bright for next time. That's the method of loci: thoughts tied to places I can walk between."
6. "One question per topic makes a round. I can go again, or stop."
7. "It isn't just one person's palace. This is someone learning guitar: same Lens, their thoughts, and it arranges itself around their links."
8. "Behind it is a graph in the cloud. A new thought joins the right topic on its own, and an AI keeps only the links that really matter and says how: this answers that, this depends on that."
9. "I built Loci with Claude Code and CLAD in Lens Studio, with the Spectacles Interaction Kit and UI Kit, and every interaction is covered by LEAF tests in the preview. All ten pass. Loci: a calmer head, one room at a time."

## Honest limits to say (or put in the Devpost text)

- No Specs device was available: feel on real glasses (gaze timing 0.6 s / 2 s, hand grabs, comfort over a full walk) is unproven. The logic is proven in the preview by LEAF.
- Topics float in a band in front of you; snapping them onto real furniture is next.
- The demo data is fictional and hand-written; the cloud groups and links it automatically.
- Placement and Recall progress aren't saved between sessions yet.
