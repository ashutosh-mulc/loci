// LociPalaceSchema.ts
// Owns: turning any user's palace JSON into safe palace data (schema: devpost/data-spec.md).
// Pure functions, no scene access. Bad entries are dropped or clamped with a warning, never thrown,
// so one typo in a user's file can't break the Lens.
// Limits for the general product: 1–8 topics, at most 8 stars per topic, labels of 4 words or
// fewer, card text of 20 words or fewer, offsets within ±20 cm, threads only between topics.

import {Kind, Thought, Thread, Topic} from "./PalaceData"
import {PalaceDataShape} from "./LociPalaceController"

export const MAX_TOPICS = 8
export const MAX_STARS_PER_TOPIC = 8
export const MAX_LABEL_WORDS = 4
export const MAX_TEXT_WORDS = 20
export const MAX_OFFSET_CM = 20
export const MAX_TOPIC_NAME_WORDS = 3
export const MAX_THREADS_PER_THOUGHT = 2
export const MAX_THREADS = 40
export const MIN_STAR_GAP_CM = 6

export interface ParseResult {
  data: PalaceDataShape | null
  warnings: string[]
}

const KINDS: Kind[] = ["decision", "insight", "question"]

function str(v: unknown): string { return typeof v === "string" ? v.trim() : "" }
function words(s: string): number { return s.split(/\s+/).filter((w) => w.length > 0).length }
function clipWords(s: string, n: number): string { return s.split(/\s+/).filter((w) => w.length > 0).slice(0, n).join(" ") }
function num(v: unknown): number { return typeof v === "number" && isFinite(v) ? v : 0 }

/** Parse a JSON string into palace data. Returns data null only when nothing usable is left. */
export function parsePalaceJson(json: string): ParseResult {
  let raw: any
  try {
    raw = JSON.parse(json)
  } catch (e) {
    return {data: null, warnings: [`Not valid JSON: ${e}`]}
  }
  // Accept either the bare object or {PALACE: {...}}.
  if (raw && raw.PALACE) raw = raw.PALACE
  return validatePalace(raw)
}

export function validatePalace(raw: any): ParseResult {
  const warnings: string[] = []
  if (!raw || typeof raw !== "object") return {data: null, warnings: ["Palace is not an object"]}

  const topics: Topic[] = []
  const seenTopic = new Set<string>()
  for (const t of Array.isArray(raw.topics) ? raw.topics : []) {
    const id = str(t && t.id)
    const name = str(t && t.name)
    if (!id || !name) { warnings.push("Dropped a topic with no id or name"); continue }
    if (seenTopic.has(id)) { warnings.push(`Dropped duplicate topic ${id}`); continue }
    if (topics.length >= MAX_TOPICS) { warnings.push(`Dropped topic ${id}: at most ${MAX_TOPICS} topics`); continue }
    seenTopic.add(id)
    if (words(name) > MAX_TOPIC_NAME_WORDS) warnings.push(`Shortened topic name of ${id} to ${MAX_TOPIC_NAME_WORDS} words`)
    topics.push({id, name: clipWords(name, MAX_TOPIC_NAME_WORDS), spot: str(t.spot) || "wall"})
  }

  const thoughts: Thought[] = []
  const perTopic = new Map<string, number>()
  const seenThought = new Set<string>()
  for (const t of Array.isArray(raw.thoughts) ? raw.thoughts : []) {
    const id = str(t && t.id)
    const topic = str(t && t.topic)
    const label = str(t && t.label)
    const text = str(t && t.text)
    if (!id || !label || !text) { warnings.push("Dropped a thought with no id, label or text"); continue }
    if (seenThought.has(id)) { warnings.push(`Dropped duplicate thought ${id}`); continue }
    if (!seenTopic.has(topic)) { warnings.push(`Dropped thought ${id}: unknown topic ${topic}`); continue }
    const n = perTopic.get(topic) ?? 0
    if (n >= MAX_STARS_PER_TOPIC) { warnings.push(`Dropped thought ${id}: ${topic} already has ${MAX_STARS_PER_TOPIC} stars`); continue }
    perTopic.set(topic, n + 1)
    seenThought.add(id)
    const kind: Kind = KINDS.indexOf(t.kind) >= 0 ? t.kind : "insight"
    const off = Array.isArray(t.offset) ? t.offset : []
    const clamp = (v: number) => Math.max(-MAX_OFFSET_CM, Math.min(MAX_OFFSET_CM, v))
    const offset: [number, number, number] = off.length === 3
      ? [clamp(num(off[0])), clamp(num(off[1])), clamp(num(off[2]))]
      : ringOffset(n) // no offset given: lay stars out in a ring
    if (words(label) > MAX_LABEL_WORDS) warnings.push(`Shortened label of ${id} to ${MAX_LABEL_WORDS} words`)
    if (words(text) > MAX_TEXT_WORDS) warnings.push(`Shortened text of ${id} to ${MAX_TEXT_WORDS} words`)
    const shortLabel = clipWords(label, MAX_LABEL_WORDS)
    thoughts.push({
      id, topic, kind, offset,
      label: shortLabel,
      text: words(text) > MAX_TEXT_WORDS ? clipWords(text, MAX_TEXT_WORDS) + "…" : text,
      date: str(t.date),
      source: clipWords(str(t.source), 6),
      prompt: str(t.prompt) || `What did you conclude about "${shortLabel}"?`,
    })
  }

  const topicOf = new Map<string, string>()
  thoughts.forEach((t) => topicOf.set(t.id, t.topic))
  const threads: Thread[] = []
  const perThought = new Map<string, number>()
  for (const th of Array.isArray(raw.threads) ? raw.threads : []) {
    const from = str(th && th.from)
    const to = str(th && th.to)
    if (!topicOf.has(from) || !topicOf.has(to)) { warnings.push(`Dropped thread ${from}→${to}: unknown thought`); continue }
    if (topicOf.get(from) === topicOf.get(to)) { warnings.push(`Dropped thread ${from}→${to}: same topic`); continue }
    if ((perThought.get(from) ?? 0) >= MAX_THREADS_PER_THOUGHT || (perThought.get(to) ?? 0) >= MAX_THREADS_PER_THOUGHT) {
      warnings.push(`Dropped thread ${from}→${to}: at most ${MAX_THREADS_PER_THOUGHT} threads per thought`); continue
    }
    if (threads.length >= MAX_THREADS) { warnings.push(`Dropped thread ${from}→${to}: at most ${MAX_THREADS} threads`); continue }
    perThought.set(from, (perThought.get(from) ?? 0) + 1)
    perThought.set(to, (perThought.get(to) ?? 0) + 1)
    threads.push({from, to, why: clipWords(str(th.why), 8)})
  }
  spreadStars(thoughts, warnings)

  // A topic with no stars has nothing to open; drop it.
  const used = topics.filter((t) => (perTopic.get(t.id) ?? 0) > 0)
  if (used.length < topics.length) warnings.push(`Dropped ${topics.length - used.length} topic(s) with no thoughts`)
  if (used.length === 0) return {data: null, warnings: warnings.concat(["No topic has any thoughts"])}
  return {data: {topics: used, thoughts, threads}, warnings}
}

/**
 * Keep stars in a topic at least MIN_STAR_GAP_CM apart (a mixed file can put a ring-layout star
 * on top of an explicit one). Pushes close pairs apart a little at a time, inside ±MAX_OFFSET_CM.
 */
function spreadStars(thoughts: Thought[], warnings: string[]): void {
  const clamp = (v: number) => Math.max(-MAX_OFFSET_CM, Math.min(MAX_OFFSET_CM, v))
  const byTopic = new Map<string, Thought[]>()
  thoughts.forEach((t) => byTopic.set(t.topic, (byTopic.get(t.topic) ?? []).concat([t])))
  byTopic.forEach((list, topic) => {
    let moved = false
    for (let iter = 0; iter < 40; iter++) {
      let any = false
      for (let i = 0; i < list.length; i++) {
        for (let j = i + 1; j < list.length; j++) {
          const a = list[i].offset
          const b = list[j].offset
          let dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2]
          let d = Math.hypot(dx, dy, dz)
          if (d >= MIN_STAR_GAP_CM) continue
          if (d < 0.01) { dx = 1; dy = 0.3; dz = 0; d = Math.hypot(dx, dy) } // same point: pick a side
          const push = (MIN_STAR_GAP_CM - d) / 2 + 0.05
          const ux = dx / d, uy = dy / d, uz = dz / d
          list[i].offset = [clamp(a[0] - ux * push), clamp(a[1] - uy * push), clamp(a[2] - uz * push)]
          list[j].offset = [clamp(b[0] + ux * push), clamp(b[1] + uy * push), clamp(b[2] + uz * push)]
          any = moved = true
        }
      }
      if (!any) break
    }
    if (moved) warnings.push(`Spread out stars in ${topic} that were closer than ${MIN_STAR_GAP_CM} cm`)
  })
}

/** Default layout for the n-th star when the file gives no offset: a ring 13 cm across, alternating depth. */
function ringOffset(n: number): [number, number, number] {
  if (n === 0) return [0, 0, 0]
  const a = ((n - 1) / 7) * Math.PI * 2
  return [Math.round(Math.cos(a) * 13 * 10) / 10, Math.round(Math.sin(a) * 10 * 10) / 10, n % 2 ? 5 : -5]
}
