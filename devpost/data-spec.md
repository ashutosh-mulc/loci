# Loci data spec

The Lens reads one generated file, `Assets/Scripts/PalaceData.ts`. Claude Code and CLAD both build against this spec. `tools/palace-builder` generates the file from chats in `exports/curated/`, and v1 uses a hand-written sample that follows the same spec.

## Schema

```ts
// Assets/Scripts/PalaceData.ts (generated after v1; don't hand-edit)
export type Kind = "decision" | "insight" | "question";

export interface Topic {
  id: string;        // "design-rules"
  name: string;      // 3 words or fewer, e.g. "Design rules"
  spot: string;      // "shelf" | "desk" | "window" | "door" | "plant"
}

export interface Thought {
  id: string;        // "t07"
  topic: string;     // a Topic.id
  label: string;     // 4 words or fewer, shown beside the star
  text: string;      // one sentence, 20 words or fewer, shown on the card
  kind: Kind;        // decision = solid star, insight = ring, question = slow pulse
  date: string;      // "2026-10-31"
  source: string;    // chat title, 6 words or fewer
  prompt: string;    // Recall question, 12 words or fewer
  offset: [number, number, number]; // cm from the spot centre, each within ±20
}

export interface Thread {
  from: string;      // a Thought.id
  to: string;        // a Thought.id in a different topic
  why: string;       // 8 words or fewer
}

export const PALACE: { topics: Topic[]; thoughts: Thought[]; threads: Thread[] } = { /* ... */ };
```

## Limits

Five topics; 6 to 8 thoughts each (35 to 40 in total); at most 2 threads per thought and 40 overall, and every thread links two different topics.
