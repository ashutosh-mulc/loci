---
status: approved
---

# Design brief: Loci

<!-- Filled in by plan-lens from the learner's own planning docs (README.md, devpost/data-spec.md, the Oct 31 build plan, and the Nov 7 scope cut). Values the learner didn't choose are marked (default). -->

## The one spatial moment
I stand in my room and turn toward my desk. The small dim dot on it opens into a cluster of six to eight glowing stars, one for each thing I concluded in my AI chats about that topic. I pinch one star and its one-line card appears beside it. Then, in Recall, the labels fade and I walk my palace, testing myself spot by spot.

## Why it belongs on glasses
- Uses: all three. **Shares your view:** only the spot you face opens. **Draws in the world:** thoughts live on real places in your room, which is the method of loci. **Leaves your body free:** you walk your palace with your eyes up and your hands free.
- Why it's better than the phone or laptop version: a memory palace works because ideas are tied to real places you move between. A screen flattens that into a list or a 2D graph. In a University of Maryland study, a memory palace in a headset gave 8.8% better recall than the same palace on a desktop screen. Phone AR memory palaces exist only as flashcards (Topos). Loci holds your own thinking, placed in your own room.

## Product or overlay
- Type: product. The palace is the experience. It sits on real spots, but nothing has to be recognized.
- What the real version would sense: the real shelf, desk, window, door and plant, so it can snap topics onto them, and later your real chat history.
- Stand-in for the preview: five virtual stand-in spots at real size (a shelf, a desk, a window, a door and a plant) in the front half of the room. The user places topics on them by hand (Place mode), so no recognition is faked. The data is a hand-curated `Assets/Scripts/PalaceData.ts` (5 topics, 35 thoughts, 18 threads) made from my own hackathon planning chats, with the schema in `devpost/data-spec.md`.

## Where things live
- Where the user is looking during the main task: straight ahead or slightly down at whichever spot they're facing, 1.2 to 2.5 m away.
- **Spots (stand-ins):** shelf, desk, window, door and plant, spread 1.2 to 2.5 m away across the front half of the room (about 150° wide), each at its real height: desk top 75 cm, shelf 110 cm, plant 90 cm, window centre 130 cm, door handle 100 cm (heights are defaults). Simple outlined or wireframe shapes in a soft light colour, so they read as stand-ins.
- **Topic orbs (Place):** five glowing orbs, 10 cm across (default), in a gentle arc 60 cm in front of the user and 25 cm below eye level at start (default), each with its topic name.
- **Closed spot:** one dim glowing dot, 3 cm across (default), on the spot, with the topic name in small light text above it.
- **Open cluster:** 6 to 8 stars within ±20 cm of the spot centre (from the data's offsets). Stars are 2 to 3 cm across (default), shaped by kind: decision = solid star, insight = ring, question = slow pulse. Each has a label of 4 words or fewer in light text, sized to read from 2.5 m (about 4 cm cap height, default).
- **Card:** right beside the pinched star, about 25 × 10 cm (default), facing the user. It shows the thought's sentence (20 words or fewer) and its source and date in smaller text. Light text with a thin glowing outline and no dark panel.
- **Recall button:** one large button, 12 cm wide (default), that lazily follows the user 50 cm ahead and 35 cm below eye level, low enough to stay out of the way (default).
- **Recall question and debrief:** at the open spot, just above the cluster, in light text.

## Hands and input
- **Place:** grab a topic orb and drag it onto a spot (SIK grab). Dropping within 30 cm of a spot (default) snaps it there and anchors it.
- **Explore:** look at a spot. Looking is the input (head direction, which is the camera in the preview). Pinch a star (SIK pinch, a mouse click in the preview) to show or hide its card.
- **Recall:** pinch the Recall button to switch modes. At each spot, pinch Reveal, then pinch Right or Wrong. All three are large UI Kit buttons, at least 6 cm across (default).
- **Follow (stretch):** pinch Follow on a card.
- Targets are big, and they highlight when aimed at.
- Voice: none in this version (default). Every action is a pinch or a grab.

## When things show
- **Topic orbs:** show at start, and each one disappears into its spot when placed. Explore begins automatically once all five are placed (default).
- **Clusters:** a spot opens after you look at it for 0.6 s and closes after you look away for 2 s. Only one cluster is open at a time, and every other spot stays a dim dot.
- **Cards:** show on pinch and hide on a second pinch. Only one card is open at a time (default), and it closes with its cluster.
- **Recall button:** visible once all topics are placed. In Recall it reads "Explore" to switch back (default).
- **Recall:** labels hide. The open spot asks one star's question (its `prompt`) and highlights that star. Reveal shows the answer (the card text). Right dims that star as mastered. Wrong leaves it bright and moves to the next star (default). The debrief shows the recalled count per topic. It appears at the current spot after every spot has been asked at least once, or when Recall is pinched again (default).
- If something needs attention out of view: only in Follow (stretch), with a chime from the linked star's direction and a small arrow at the edge of the view. Otherwise the palace stays silent, with a soft chime when a cluster opens (default).

## Done criteria
Each one can be checked in Lens Studio's preview.
1. Dropping a topic orb on a spot anchors it there and shows its name.
2. Looking at an anchored spot for 0.6 s opens its cluster; looking away for 2 s closes it; only one cluster is open at a time.
3. Pinching a star shows its one-line card beside it; pinching again hides it.
4. **(Stretch: build only after 1, 2, 3 and 5 pass in LEAF.)** Pinching Follow pulses the star's thread. If the linked star is out of view, a chime plays and an arrow at the edge of the view points to it. Facing it opens that cluster.
5. In Recall, labels hide. Reveal shows the answer, marking it right dims that star, and the debrief shows the recalled count per topic.

## Out of scope
- The chats-to-stars script (`tools/palace-builder`): the data is hand-curated for this version.
- Recognizing real furniture: the user places topics on stand-in spots by hand.
- Remembering placement or Recall progress between sessions.
- Voice, AI calls at runtime, and sharing a palace with another person.
- Camera, recording or face features. No people's names in the data.

## Risks and open questions
- **Gaze-to-open timing (0.6 s in, 2 s out)** may feel twitchy or slow on real glasses. Logic proven in preview, feel unproven.
- **Narrow view (about 37° × 32°):** spots are spread across 150°, so the user turns to face each one. That's intended, but a cluster near the edge of the view could clip. Keep each cluster within ±20 cm.
- **Additive display:** UI Kit's default backplates are dark. Cards and buttons must use light or glowing styles instead.
- **Follow** is a stretch goal and may not ship by the Tue Nov 10 3:30 AM IST deadline.
- Recall comfort over a full walk (standing and turning for a few minutes) is feel unproven.

## Build notes for CLAD
- Build for SPECS so it runs and can be demonstrated in Lens Studio's preview. No SPECS device is available.
- Use Spectacles Interaction Kit (SIK) and UI Kit for all interactions, so they work with the mouse in Interactive Preview and with LEAF.
- Build any stand-in exactly as described above, and keep it obvious in the scene.
- Use real-world scale in centimeters. Keep content inside the user's view during the main task.
- The display is additive: black renders as transparent. Don't rely on black or very dark content to be seen; keep text light and readable from where the user stands.
- Get the basic flow working first, then add detail.
- Write LEAF scenarios for each done criterion, run them in preview, and report which pass. Say which criteria have no test.
- Don't record, identify, or follow people.
- Read all content from `Assets/Scripts/PalaceData.ts` (schema in `devpost/data-spec.md`). Don't hard-code thoughts in scene scripts.
- Build order: criteria 1 → 2 → 3, stop and report; then 5; then 4 only if asked.

## After the build: judge it
This part is for you, after CLAD finishes.

1. **Does it work?** Ask your agent which LEAF tests passed and which done criteria have no test.
2. **Walk around it.** Open the preview in Interactive Preview. Use WASD to move, Q and E to go down and up, and right-drag (or hold Shift) to look around. Clicking acts as a pinch. Stand where a user would and look at the task.
3. **Ask the three questions.**
   - Does it use what I'm looking at?
   - Does it put something in my space, where it belongs?
   - Does it free my hands or let me keep my eyes up?
   - Would it be just as good on a phone? If so, what would make it need the glasses?
4. **Check comfort.**
   - Everything I need is in view while I do the task. Nothing sits at the edges, behind me, or stuck to my face.
   - Every control is within reach of someone standing there.
   - Text reads easily from where I stand. No dark UI disappearing.
   - Things show when needed and get out of the way.
5. **Label what you know.** Write "logic proven" next to anything the tests and preview show working, and "feel unproven" next to anything only real glasses could tell you (comfort over time, real hand tracking, real recognition).
6. **Fix with design notes, not code.** Tell your agent what to change in design terms, for example: "Move the step card 15 cm lower and next to the pan. Make the Next button twice as big. Re-run the tests." If a fix takes under a minute, like nudging a panel, do it yourself in the scene.
7. **Submit.** Record a video under 3 minutes of your Lens in the preview, public on YouTube. Make your repo public with your Lens Studio project and this `devpost/` folder. Details are on the hackathon site: https://learn-specs.devpost.com/resources
