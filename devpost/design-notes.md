# Loci design notes

What we saw, what changed, and why.

## Sat Nov 7: scope cut

- **Before:** five done criteria, plus a chats-to-stars script (tools/palace-builder) to generate the data, aiming to submit Sun Nov 8.
- **After:** Place, Explore, cards and a simple Recall (criteria 1, 2, 3 and 5), with hand-curated data. Follow (criterion 4) becomes a stretch goal, and the target moves to the hard deadline (Tue Nov 10, 3:30 AM IST).
- **Why:** setup started late. A few sparse spots that work well score higher on Design than every feature half-built.

## Sat Nov 7: design brief approved

- Ran plan-lens. The brief was drafted from the README, the data spec and the scope cut, then approved as written.
- Build details that weren't decided before are marked `(default)` in the brief: spot heights, a lazy-follow Recall button below eye level, Wrong moves on to the next star, the debrief appears after every spot has been asked, Explore starts automatically once all five are placed, and cards are glowing outlines with no dark backplate.

## Sun Nov 8: CLAD build, criteria 1 to 3

- **Star labels:** the brief's 4 cm cap height made neighbouring labels pile on top of each other (stars are about 13 cm apart). Labels are now sized to look like a 1.8 cm cap at 2.5 m (nearer spots get proportionally smaller text) and point away from the cluster centre: right-side stars label to the right, left-side to the left, centre stars above. Set Star Label Cap back to 4 on `Loci` to return to the brief value.
- **Orb arc:** the 60 cm arc now sits 14 cm below eye level instead of 25 cm, and spans 48°. At 25 cm the orbs were about 23° down, below the roughly 16° vertical half-view, so only their labels showed at start. Orb names are 1 cm cap so they don't overlap.
- **Card side:** the card opens on the outward side of the cluster, and the pinched star's own label hides while its card shows (the card carries the full thought).
- **Drop rule:** a drop also counts if the line of sight to the dropped orb passes within 30 cm of a free spot ("ray-snap assist", on by default), so mouse drags in Interactive Preview can reach a spot 1.3 to 2.5 m away. A drop that misses leaves the orb where it fell, so you can grab it again.
- **Any free spot:** you can drop a topic on any free spot; the `spot` in PalaceData is only used by the tests.
- **Spot layout:** shelf 1.6 m at 75° left, desk 1.3 m at 37.5° left, window 2.5 m straight ahead, door 2.0 m at 37.5° right, plant 1.4 m at 75° right. Each Spot_<id> object in the scene can be moved by hand.

## Sun Nov 8: Recall

- **Recall panel:** sits above the open cluster: question, then the answer in warm light text, then Reveal or Right/Wrong. Its size grows with distance (authored at 1.1 m), so it reads the same at the desk (1.3 m) and the window (2.5 m); its lift above the cluster grows with it so it never covers the stars. The spot's name hides while the panel shows.
- **Buttons:** UI Kit Ghost buttons (transparent face) with a thin glowing outline: blue for Recall/Reveal, green for Right, red for Wrong. They brighten when aimed at. Reveal/Right/Wrong are 8.5 x 4.5 cm; Recall is 12 x 5 cm.
- **Recall button:** lazily follows 50 cm ahead and 35 cm below eye level, as in the brief. That is about 35° down, below the narrow view, so you glance down to find it. Feel unproven; the Follow Below Eye field on RecallUI changes it.
- **Flow choices (defaults):** cards don't open in Recall (they would give the answer away). Right or Wrong both move on to the next unmastered star at that spot; "All recalled here" when none are left. Leaving Recall shows the debrief, then puts labels back and clears the dimming. If no spot is open, the debrief shows 1 m ahead.
- **Orbs:** now 8 cm across and 9 cm below eye level (were 10 cm and 14 cm), so the middle three sit fully in view at start.

## Sun Nov 8 (later): any room, any data, new look (approved scope change)

- **Why:** in the preview the build looked like a debug view (grey void, wireframe furniture, flat dots), and five fixed stand-in spots only fit one imagined room. Approved: make it general.
- **Any room:** the five wireframe stand-ins are gone. Drag a topic orb toward any place and let go: it flies along your line of sight and anchors there. On Specs, World Query snaps it onto the real surface you aimed at. In Lens Studio's preview World Query only sees a fake wall 5 m ahead (probed), so it anchors 1.6 m out. Topics must be 18° apart as seen from you, so each can be looked at alone; too close is refused with a hint and the orb flies home.
- **Any data:** a user's palace is a JSON file (same schema as PalaceData.ts), dropped into Palace Json on `Loci`. A validator drops or repairs bad entries (unknown topics, duplicates, same-topic threads, long labels, offsets beyond ±20 cm) instead of failing. Sample second user: `Assets/Data/guitar-palace.json`. PalaceData.ts stays the default.
- **Look:** preview environment set to Evening Room. Stars, dots and orbs have soft glows (five nested translucent spheres; additive glows vanish in the preview, which composites by alpha), stars twinkle, clusters bloom open, faint thread lines link related ideas across topics.
- **Clear flow:** a one-line hint near the top of the view gives the next step and goes quiet once done.

## Sun Nov 8 (later): video tour and fixes it exposed

- **Demo tour:** `DemoTour` object (LociDemoTour). Tick Play On Start, reset the preview, record. The head turns smoothly through Place, Explore, a card, a Recall round, the debrief, then switches to another user's palace. Off by default. Recording steps, shot list and voiceover: `devpost/video-script.md`.
- **Debrief moved:** pressing Recall/Explore means glancing ~35° down, which counts as looking away, so the open topic closed and took the debrief with it. After leaving Recall the debrief now appears just above the button, where you are looking, for 10 s or until you open another topic. The automatic debrief (every topic asked) still shows above the topic.
- **Bigger Recall panel:** question, answer and buttons are 1.4x (Panel Scale on RecallUI).
- **Quieter hints:** the "Pinch Recall below" nudge shows once; no hint during Recall (it sat under the buttons).

## Nov 9: review v2 fixes
- **Orb arc fits the Specs view.** The start arc is 22° wide (was 48°), with the topics in staggered height rows so each name stays readable and inside the ~32° display. Halos are smaller so neighbouring orbs don't merge.
- **Reset and palace switch start where you are.** The orbs come back in front of where you're facing now, not where the Lens started.
- **Threads start at their star.** A thread line now leaves from the exact star it belongs to.
- **Same-spot drops.** If two topics are aimed at the same place, the second is refused straight away and flies home.
- **Recall rounds.** One question per topic makes a round. When every topic has been asked, "Round done" shows the recalled count per topic with a **Go again** button; Go again starts the next round where you are (recalled stars stay dimmed). Pinching Explore any time ends Recall and shows the counts above the button.
- **One big label at a time.** The star you aim at (hand ray, or gaze within 4°) shows its label at the brief's ~4 cm size; the other labels in the cluster fade back to 30%. Eight full-size labels in a ±20 cm cluster would overlap.
