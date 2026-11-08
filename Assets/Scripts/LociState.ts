// LociState.ts
// Owns: the palace's domain state — mode, which topic is anchored at which spot,
// which spot is open, which card is open, and per-star state (for Recall next).
// Pure logic: no scene access, no timers. LociPalaceController is the only writer.

export type PalaceMode = "place" | "explore" | "recall"
export type StarState = "normal" | "highlight" | "dim"

export class LociState {
  mode: PalaceMode = "place"
  private topicToSpot = new Map<string, string>()
  private spotToTopic = new Map<string, string>()
  openSpot: string | null = null
  openCardId: string | null = null
  private starStates = new Map<string, StarState>()

  constructor(private readonly topicIds: string[], private readonly spotIds: string[]) {}

  /** Anchor a topic at a free spot. Returns false if the topic is placed or the spot is taken. */
  place(topicId: string, spot: string): boolean {
    if (this.topicIds.indexOf(topicId) < 0 || this.spotIds.indexOf(spot) < 0) return false
    if (this.topicToSpot.has(topicId) || this.spotToTopic.has(spot)) return false
    this.topicToSpot.set(topicId, spot)
    this.spotToTopic.set(spot, topicId)
    return true
  }

  spotOf(topicId: string): string | null {
    return this.topicToSpot.get(topicId) ?? null
  }

  topicAt(spot: string): string | null {
    return this.spotToTopic.get(spot) ?? null
  }

  isAnchored(spot: string): boolean {
    return this.spotToTopic.has(spot)
  }

  allPlaced(): boolean {
    return this.topicToSpot.size === this.topicIds.length
  }

  placedCount(): number {
    return this.topicToSpot.size
  }

  freeSpots(): string[] {
    return this.spotIds.filter((s) => !this.spotToTopic.has(s))
  }

  setStarState(thoughtId: string, state: StarState): void {
    this.starStates.set(thoughtId, state)
  }

  starState(thoughtId: string): StarState {
    return this.starStates.get(thoughtId) ?? "normal"
  }

  reset(): void {
    this.mode = "place"
    this.topicToSpot.clear()
    this.spotToTopic.clear()
    this.openSpot = null
    this.openCardId = null
    this.starStates.clear()
  }
}
