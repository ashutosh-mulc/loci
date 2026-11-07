// Assets/Scripts/PalaceData.ts
// v1 hand-curated sample (scope cut, 2026-11-07): built from the Winning Strategy and Loci Build Plan docs.
// Schema and limits: devpost/data-spec.md. No people's names.

export type Kind = "decision" | "insight" | "question";

export interface Topic {
  id: string;
  name: string;
  spot: string;
}

export interface Thought {
  id: string;
  topic: string;
  label: string;
  text: string;
  kind: Kind;
  date: string;
  source: string;
  prompt: string;
  offset: [number, number, number];
}

export interface Thread {
  from: string;
  to: string;
  why: string;
}

export const PALACE: { topics: Topic[]; thoughts: Thought[]; threads: Thread[] } = {
  topics: [
    { id: "design-rules", name: "Design rules", spot: "shelf" },
    { id: "build-plan", name: "Build plan", spot: "desk" },
    { id: "open-questions", name: "Open questions", spot: "window" },
    { id: "idea-hunt", name: "Idea hunt", spot: "door" },
    { id: "what-snap-wants", name: "What Snap wants", spot: "plant" },
  ],
  thoughts: [
    { id: "d01", topic: "design-rules", label: "Pin it, don't float", kind: "decision",
      text: "A graph in mid-air is a website on your face, so anchor it to a place.",
      date: "2026-10-31", source: "Winning Strategy", prompt: "Why anchor the palace to real places?", offset: [0.0, 0.0, 0.0] },
    { id: "d02", topic: "design-rules", label: "Show only what's faced", kind: "decision",
      text: "Only the spot you face opens; everything else stays a dim dot.",
      date: "2026-10-31", source: "Loci Build Plan", prompt: "What happens to spots you aren't facing?", offset: [13.0, 0.0, 5.0] },
    { id: "d03", topic: "design-rules", label: "Light, never dark panels", kind: "decision",
      text: "The display only adds light, so black shows clear; use light text and glow.",
      date: "2026-10-31", source: "Loci Build Plan", prompt: "Why avoid dark panels on Specs?", offset: [6.5, 9.6, -5.0] },
    { id: "d04", topic: "design-rules", label: "Big forgiving pinch targets", kind: "decision",
      text: "Use two or three large controls instead of many small buttons.",
      date: "2026-10-31", source: "Winning Strategy", prompt: "How many controls should the main view have?", offset: [-6.5, 9.6, 5.0] },
    { id: "d05", topic: "design-rules", label: "Info on its thing", kind: "insight",
      text: "Put each cue on the object it is about, at real size, never a HUD.",
      date: "2026-10-31", source: "Winning Strategy", prompt: "Where should a cue sit?", offset: [-13.0, 0.0, -5.0] },
    { id: "d06", topic: "design-rules", label: "Silence is a feature", kind: "insight",
      text: "Don't show everything at once: one step and one cue at a time.",
      date: "2026-10-31", source: "Winning Strategy", prompt: "How much should show at once?", offset: [-6.5, -9.6, 5.0] },
    { id: "d07", topic: "design-rules", label: "Comfort over spectacle", kind: "insight",
      text: "Keep sessions short, with no neck turns and no arms held up for long.",
      date: "2026-10-31", source: "Winning Strategy", prompt: "What keeps the body comfortable in a session?", offset: [6.5, -9.6, -5.0] },
    { id: "b01", topic: "build-plan", label: "Data first, then CLAD", kind: "decision",
      text: "Build v1 from a hand-written sample so CLAD never waits on the script.",
      date: "2026-10-31", source: "Loci Build Plan", prompt: "Why build v1 from sample data?", offset: [0.0, 0.0, 0.0] },
    { id: "b02", topic: "build-plan", label: "Fix with design notes", kind: "decision",
      text: "Walk the preview and change things with design notes, not code.",
      date: "2026-10-31", source: "Loci Build Plan", prompt: "How do we fix problems after a build?", offset: [12.4, 3.2, 5.0] },
    { id: "b03", topic: "build-plan", label: "Fresh chat per build", kind: "decision",
      text: "Start a fresh chat for each CLAD build, because it works best with clean context.",
      date: "2026-10-31", source: "Loci Build Plan", prompt: "What do we do before each CLAD build?", offset: [2.9, 10.8, -5.0] },
    { id: "b04", topic: "build-plan", label: "A LEAF test each", kind: "decision",
      text: "Every done criterion gets a LEAF test, and the results go in the repo.",
      date: "2026-10-31", source: "Loci Build Plan", prompt: "How is each done criterion proven?", offset: [-9.5, 7.5, 5.0] },
    { id: "b05", topic: "build-plan", label: "Builds take thirty minutes", kind: "insight",
      text: "A full CLAD build can take thirty minutes or more, so budget a few.",
      date: "2026-10-31", source: "Winning Strategy", prompt: "How long can a full CLAD build take?", offset: [-12.4, -3.2, -5.0] },
    { id: "b06", topic: "build-plan", label: "Video gets real time", kind: "decision",
      text: "The video gets about ten hours, because Presentation is a quarter of the score.",
      date: "2026-10-31", source: "Loci Build Plan", prompt: "Why give the video so many hours?", offset: [-2.9, -10.8, 5.0] },
    { id: "b07", topic: "build-plan", label: "Cut scope, stay sparse", kind: "decision",
      text: "When time ran short, we cut the script and Follow instead of thinning the design.",
      date: "2026-11-07", source: "Loci Build Plan", prompt: "What did we cut when time ran short?", offset: [9.5, -7.5, -5.0] },
    { id: "q01", topic: "open-questions", label: "Legible at two metres?", kind: "question",
      text: "Labels must stay readable from where I stand; tune their size in the preview.",
      date: "2026-10-31", source: "Loci Build Plan", prompt: "What must we check about label size?", offset: [0.0, 0.0, 0.0] },
    { id: "q02", topic: "open-questions", label: "Comfortable for long sessions?", kind: "question",
      text: "We can't prove comfort over a long session without wearing the glasses.",
      date: "2026-10-31", source: "Loci Build Plan", prompt: "What can't the preview prove about comfort?", offset: [10.8, 6.2, 5.0] },
    { id: "q03", topic: "open-questions", label: "Head as gaze stand-in", kind: "question",
      text: "Head direction stands in for eye gaze; does the dwell still feel right?",
      date: "2026-10-31", source: "Loci Build Plan", prompt: "What stands in for eye gaze?", offset: [-0.9, 11.0, -5.0] },
    { id: "q04", topic: "open-questions", label: "Can LEAF turn heads?", kind: "question",
      text: "If LEAF can't turn the head, test the gaze logic with simulated angles.",
      date: "2026-10-31", source: "Winning Strategy", prompt: "What's the fallback if LEAF can't drive the head?", offset: [-11.7, 4.8, 5.0] },
    { id: "q05", topic: "open-questions", label: "Too many stars clutter?", kind: "question",
      text: "A topic with more than eight stars may clutter its spot.",
      date: "2026-10-31", source: "Loci Build Plan", prompt: "What's the most stars a topic should have?", offset: [-10.8, -6.2, -5.0] },
    { id: "q06", topic: "open-questions", label: "Will CLAD float panels?", kind: "question",
      text: "If v1 puts a menu in front of your face, move it onto the spot.",
      date: "2026-10-31", source: "Winning Strategy", prompt: "What do we do if CLAD floats a panel?", offset: [0.9, -11.0, 5.0] },
    { id: "q07", topic: "open-questions", label: "Module or JSON data?", kind: "question",
      text: "If Lens Studio can't import the data as a module, load it as JSON text.",
      date: "2026-10-31", source: "Loci Build Plan", prompt: "What's the backup way to load the palace data?", offset: [11.7, -4.8, -5.0] },
    { id: "i01", topic: "idea-hunt", label: "Cooking is crowded", kind: "insight",
      text: "The skill pack's own example is a risotto coach, so many entrants copy it.",
      date: "2026-10-31", source: "Winning Strategy", prompt: "Why avoid a cooking coach?", offset: [0.0, 0.0, 0.0] },
    { id: "i02", topic: "idea-hunt", label: "Step coaches start behind", kind: "insight",
      text: "Anything shaped like 'show me the next step' starts behind on Innovation.",
      date: "2026-10-31", source: "Winning Strategy", prompt: "Which idea shape loses Innovation points?", offset: [8.2, 8.6, 5.0] },
    { id: "i03", topic: "idea-hunt", label: "Rehearsal version dropped", kind: "decision",
      text: "The talk-rehearsal Loci wasn't novel enough, since speech tools already exist on Spectacles.",
      date: "2026-10-31", source: "Loci Build Plan", prompt: "Why drop the talk-rehearsal version?", offset: [-4.7, 10.3, -5.0] },
    { id: "i04", topic: "idea-hunt", label: "Your thinking, your room", kind: "insight",
      text: "Phone apps build palaces from flashcards; Loci places your own conversations in your room.",
      date: "2026-10-31", source: "Loci Build Plan", prompt: "What makes Loci different from phone memory palaces?", offset: [-12.8, 1.7, 5.0] },
    { id: "i05", topic: "idea-hunt", label: "Method of loci", kind: "insight",
      text: "Memory improves when each cue lives in a real place you can walk to.",
      date: "2026-10-31", source: "Winning Strategy", prompt: "Why does placing cues in rooms help memory?", offset: [-8.2, -8.6, -5.0] },
    { id: "i06", topic: "idea-hunt", label: "Headset beat desktop", kind: "insight",
      text: "A study found a headset memory palace gave 8.8% better recall than a desktop one.",
      date: "2026-10-31", source: "Loci Build Plan", prompt: "How much better was headset recall in the study?", offset: [4.7, -10.3, 5.0] },
    { id: "i07", topic: "idea-hunt", label: "Furniture, sunlight rejected", kind: "decision",
      text: "Moving furniture wasn't useful enough, and sunlight planners already exist on phones.",
      date: "2026-10-31", source: "Loci Build Plan", prompt: "Why reject the furniture and sunlight ideas?", offset: [12.8, -1.7, -5.0] },
    { id: "s01", topic: "what-snap-wants", label: "Who is it for?", kind: "insight",
      text: "Critics ask who Specs are for; Lenses people use every week answer them.",
      date: "2026-10-31", source: "Winning Strategy", prompt: "What question do Specs critics ask?", offset: [0.0, 0.0, 0.0] },
    { id: "s02", topic: "what-snap-wants", label: "Weekly use wins", kind: "decision",
      text: "Pick a task people repeat every week, not a demo watched once.",
      date: "2026-10-31", source: "Winning Strategy", prompt: "What kind of task should the Lens serve?", offset: [4.9, 10.2, 5.0] },
    { id: "s03", topic: "what-snap-wants", label: "Taste over code", kind: "insight",
      text: "Once agents write the code, design judgment is what separates entries.",
      date: "2026-10-31", source: "Winning Strategy", prompt: "What separates entries when agents write code?", offset: [-8.0, 8.7, -5.0] },
    { id: "s04", topic: "what-snap-wants", label: "CLAD needs testers", kind: "insight",
      text: "CLAD is in preview, so many strangers building with it is cheap testing.",
      date: "2026-10-31", source: "Winning Strategy", prompt: "Why does Snap want many CLAD builders?", offset: [-12.9, -1.5, 5.0] },
    { id: "s05", topic: "what-snap-wants", label: "Preview-first pipeline", kind: "insight",
      text: "Specs are expensive and new, so developers build in the preview without glasses.",
      date: "2026-10-31", source: "Winning Strategy", prompt: "Why is the hackathon preview-only?", offset: [-4.9, -10.2, -5.0] },
    { id: "s06", topic: "what-snap-wants", label: "Show the process", kind: "insight",
      text: "Devpost wants proof its format works, so the brief and logs must be visible.",
      date: "2026-10-31", source: "Winning Strategy", prompt: "What does Devpost want to see in the repo?", offset: [8.0, -8.7, 5.0] },
    { id: "s07", topic: "what-snap-wants", label: "Ties go to Design", kind: "insight",
      text: "Four criteria weigh equally, and ties go to Design first.",
      date: "2026-10-31", source: "Winning Strategy", prompt: "Which criterion breaks ties?", offset: [12.9, 1.5, -5.0] },
  ],
  threads: [
    { from: "d01", to: "i05", why: "Anchoring to places is the method of loci" },
    { from: "d01", to: "i06", why: "Placement in space aids recall" },
    { from: "d02", to: "q03", why: "Facing depends on head direction" },
    { from: "d03", to: "q01", why: "Light text must still read far away" },
    { from: "d07", to: "q02", why: "Comfort is designed in but unproven" },
    { from: "d06", to: "q05", why: "Sparse spots need few stars" },
    { from: "d05", to: "q06", why: "Cues belong on spots, not panels" },
    { from: "b01", to: "q07", why: "The sample data must load cleanly" },
    { from: "b04", to: "q04", why: "LEAF has to test the gaze" },
    { from: "b07", to: "d06", why: "Cutting scope keeps every spot sparse" },
    { from: "b02", to: "s03", why: "Design notes are where judgment shows" },
    { from: "i02", to: "s02", why: "Repeated tasks, not step-by-step coaches" },
    { from: "s06", to: "b04", why: "LEAF results are process evidence" },
    { from: "s07", to: "d02", why: "Design decides ties, so sparseness matters" },
    { from: "b06", to: "s06", why: "The video carries the process story" },
    { from: "s01", to: "i04", why: "Your own thinking gives weekly use" },
    { from: "b05", to: "s04", why: "Slow builds are part of testing CLAD" },
    { from: "i03", to: "d04", why: "Taking words away became showing less" },
  ],
};
