// LociRecall.ts
// Owns: Recall mode (done criterion 5). Pinch Recall: star labels hide. At each spot you open,
// one star's question (its `prompt`) shows above the cluster and that star is highlighted.
// Reveal shows the answer (the card text). Right dims the star as mastered; Wrong leaves it
// bright. Either way the next star at that spot is asked. Once every placed spot has been
// answered at least once, or when Recall ("Explore") is pinched again, the debrief shows the
// recalled count per topic at the current spot.
// Reads all content from the controller's palace data (PalaceData.ts or a per-user JSON). Drives LociPalaceController's Recall hooks and the
// LociRecallUI view; owns no scene objects itself. No persistence between sessions.

import {Thought} from "./PalaceData"
import {LociPalaceController} from "./LociPalaceController"
import {LociRecallUI} from "./LociRecallUI"
import WorldCameraFinderProvider from "SpectaclesInteractionKit.lspkg/Providers/CameraProvider/WorldCameraFinderProvider"

@component
export class LociRecall extends BaseScriptComponent {
  @ui.label('<span style="color: #60A5FA;">LociRecall – Recall mode (criterion 5)</span>')
  @ui.separator
  @ui.group_start("References")
  @input @hint("The palace controller on 'Loci'.")
  controller: LociPalaceController
  @input @hint("The Recall UI module.")
  recallUI: LociRecallUI
  @ui.group_end
  @ui.separator
  @ui.group_start("Settings")
  @input @hint("Height of the question panel's centre above the cluster centre (cm).")
  @widget(new SliderWidget(10, 50, 1))
  panelLiftCm: number = 20
  @input @hint("Message when every star at a spot is mastered.")
  allDoneMessage: string = "All recalled here"
  @input @hint("After leaving Recall, the debrief floats this far above the Recall button (cm).")
  @widget(new SliderWidget(5, 40, 1))
  debriefAboveButtonCm: number = 17
  @input @hint("Seconds the debrief stays after leaving Recall.")
  @widget(new SliderWidget(3, 30, 1))
  debriefSeconds: number = 10
  @ui.group_end

  private active = false
  private debriefShown = false
  private askedSpots = new Set<string>()
  private mastered = new Set<string>()
  private recalled = new Map<string, number>()
  private cursor = new Map<string, number>()
  private current: Thought | null = null
  private revealed = false
  private panelSpot: string | null = null
  private debriefTimer!: DelayedCallbackEvent

  onAwake(): void {
    if (!this.controller || !this.recallUI) {
      print("LociRecall: controller and recallUI must be wired.")
      return
    }
    this.debriefTimer = this.createEvent("DelayedCallbackEvent")
    this.debriefTimer.bind(() => { if (!this.active && this.recallUI.getPanelMode() === "debrief") this.recallUI.hidePanel() })
    this.createEvent("OnStartEvent").bind(() => this.wire())
  }

  // =================== public API (also used by LEAF) ===================

  isActive(): boolean { return this.active }
  isDebriefShown(): boolean { return this.debriefShown }
  getCurrentThoughtId(): string | null { return this.current ? this.current.id : null }
  isRevealed(): boolean { return this.revealed }
  getRecalledCount(topicId: string): number { return this.recalled.get(topicId) ?? 0 }
  isMastered(thoughtId: string): boolean { return this.mastered.has(thoughtId) }

  /** The Recall / Explore button. */
  toggle(): void {
    if (this.active) this.endRecall()
    else this.startRecall()
  }

  startRecall(): boolean {
    if (this.active || this.controller.getMode() !== "explore") return false
    this.active = true
    this.debriefShown = false
    this.askedSpots.clear()
    this.mastered.clear()
    this.recalled.clear()
    this.cursor.clear()
    this.controller.getPalace().topics.forEach((t) => this.recalled.set(t.id, 0))
    this.current = null
    this.revealed = false
    this.controller.hideCard()
    this.controller.setMode("recall")
    this.controller.setStarLabelsVisible(false)
    this.recallUI.showExploreLabel()
    this.recallUI.hidePanel()
    print("Loci: Recall started.")
    const open = this.controller.getOpenSpot()
    if (open) this.askAt(open)
    return true
  }

  /** Pinching the button again: show the debrief here, then go back to Explore. */
  endRecall(): void {
    if (!this.active) return
    this.showDebrief(true)
    this.active = false
    this.current = null
    this.revealed = false
    this.controller.getPalace().thoughts.forEach((t) => this.controller.setStarState(t.id, "normal"))
    this.controller.setStarLabelsVisible(true)
    this.controller.setMode("explore")
    this.recallUI.showRecallLabel()
    print("Loci: Recall ended.")
  }

  reveal(): boolean {
    if (!this.active || !this.current || this.revealed) return false
    this.revealed = true
    this.recallUI.showAnswer(this.current.text)
    return true
  }

  /** Right = mastered (dims the star); Wrong = stays bright. Then the next star. */
  answer(right: boolean): boolean {
    if (!this.active || !this.current || !this.revealed || !this.panelSpot) return false
    const t = this.current
    const spot = this.panelSpot
    const thoughts = this.thoughtsOf(t.topic)
    if (right) {
      this.mastered.add(t.id)
      this.recalled.set(t.topic, (this.recalled.get(t.topic) ?? 0) + 1)
      this.controller.setStarState(t.id, "dim")
    } else {
      this.controller.setStarState(t.id, "normal")
    }
    this.cursor.set(t.topic, (thoughts.indexOf(t) + 1) % thoughts.length)
    this.askedSpots.add(spot)
    this.current = null
    this.revealed = false
    if (!this.debriefShown && this.allSpotsAsked()) {
      this.showDebrief()
      return true
    }
    this.askAt(spot)
    return true
  }

  debriefText(): string {
    const lines = this.controller.getPalace().topics.map((t) => `${t.name}  ${this.recalled.get(t.id) ?? 0}/${this.thoughtsOf(t.id).length}`)
    return `Recalled\n${lines.join("\n")}`
  }

  // =================== flow ===================

  private wire(): void {
    this.controller.onModeChanged.add((m) => {
      if (m === "place") {
        this.active = false
        this.debriefShown = false
        this.recallUI.setRecallButtonVisible(false)
        this.recallUI.showRecallLabel()
        this.recallUI.hidePanel()
        this.panelSpot = null
      } else {
        this.recallUI.setRecallButtonVisible(true) // visible once all topics are placed
      }
    })
    this.controller.onClusterOpened.add((spot) => this.onOpened(spot))
    this.controller.onClusterClosed.add((spot) => this.onClosed(spot))
    this.recallUI.onRecallPressed.add(() => this.toggle())
    this.recallUI.onReveal.add(() => this.reveal())
    this.recallUI.onRight.add(() => this.answer(true))
    this.recallUI.onWrong.add(() => this.answer(false))
  }

  private onOpened(spot: string): void {
    if (!this.active) {
      this.recallUI.hidePanel() // an old debrief goes once you move on
      this.panelSpot = null
      return
    }
    if (this.debriefShown) {
      this.panelSpot = spot
      this.controller.setSpotLabelVisible(spot, false)
      this.recallUI.showDebrief(this.debriefText(), this.panelAnchor(spot))
      return
    }
    this.askAt(spot)
  }

  private onClosed(spot: string): void {
    if (this.panelSpot !== spot) return
    if (this.current && !this.mastered.has(this.current.id)) this.controller.setStarState(this.current.id, "normal")
    this.current = null
    this.revealed = false
    this.panelSpot = null
    this.controller.setSpotLabelVisible(spot, true)
    this.recallUI.hidePanel()
  }

  private askAt(spot: string): void {
    const topic = this.controller.getTopicAt(spot)
    if (!topic) return
    this.panelSpot = spot
    this.controller.setSpotLabelVisible(spot, false) // the panel sits where the name would
    const thoughts = this.thoughtsOf(topic)
    const start = this.cursor.get(topic) ?? 0
    let pick: Thought | null = null
    for (let i = 0; i < thoughts.length; i++) {
      const t = thoughts[(start + i) % thoughts.length]
      if (!this.mastered.has(t.id)) { pick = t; break }
    }
    if (!pick) {
      this.current = null
      this.recallUI.showMessage(this.allDoneMessage, this.panelAnchor(spot))
      return
    }
    this.current = pick
    this.revealed = false
    this.cursor.set(topic, thoughts.indexOf(pick))
    this.controller.setStarState(pick.id, "highlight")
    this.recallUI.showQuestion(pick.prompt, this.panelAnchor(spot))
  }

  /**
   * Show the per-topic debrief. `atButton`: the user just glanced down to pinch Explore, so show it
   * right above the button where they are looking (it stays ~10 s or until another topic opens).
   * Otherwise (every topic asked) show it above the open topic.
   */
  private showDebrief(atButton: boolean = false): void {
    this.debriefShown = true
    const text = this.debriefText()
    if (this.current && !this.mastered.has(this.current.id)) this.controller.setStarState(this.current.id, "normal")
    this.current = null
    this.revealed = false
    const spot = this.controller.getOpenSpot()
    if (atButton) {
      if (this.panelSpot) this.controller.setSpotLabelVisible(this.panelSpot, true)
      this.panelSpot = null
      this.recallUI.showDebrief(text, this.recallUI.getRecallButtonWorldPosition().add(new vec3(0, this.debriefAboveButtonCm, 0)), true)
      this.debriefTimer.reset(this.debriefSeconds) // one timer, restarted each time
    } else if (spot) {
      // Every topic asked: answer() only runs with a topic open, so `spot` is always set here.
      this.panelSpot = spot
      this.controller.setSpotLabelVisible(spot, false)
      this.recallUI.showDebrief(text, this.panelAnchor(spot))
    }
    print(`Loci: debrief ${text.replace(/\n/g, " | ")}`)
  }

  private allSpotsAsked(): boolean {
    const placed = this.controller.getSpotIds().filter((s) => this.controller.isAnchored(s))
    return placed.length > 0 && placed.every((s) => this.askedSpots.has(s))
  }

  /** Above the cluster; the lift grows with distance, as the panel itself does (LociRecallUI). */
  private panelAnchor(spot: string): vec3 {
    const c = this.controller.getClusterCentreWorld(spot)!
    const cam = WorldCameraFinderProvider.getInstance().getComponent().getTransform().getWorldPosition()
    const k = this.recallUI.panelScale * Math.max(1, c.distance(cam) / this.recallUI.readingDistanceCm)
    return c.add(new vec3(0, this.panelLiftCm * k, 0))
  }

  private thoughtsOf(topicId: string): Thought[] {
    return this.controller.getPalace().thoughts.filter((t) => t.topic === topicId)
  }
}
