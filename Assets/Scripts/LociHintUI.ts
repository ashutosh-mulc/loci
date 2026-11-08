// LociHintUI.ts
// Owns: the one-line onboarding hint that tells the user the next step, then gets out of the way.
//   Place:   "Drag a topic toward any spot in your room · N left" (and "Too close to X" on a refusal)
//   Explore: "Look at a topic to open it" -> "Pinch a star to read it" -> "Pinch Recall below to test yourself"
//   Recall:  "Answer at each topic · pinch Explore to finish"
// Lazily follows the user near the top of the view, fades in and out. Light text only.
// Listens to LociPalaceController events; holds no palace state of its own.

import {LociPalaceController} from "./LociPalaceController"
import WorldCameraFinderProvider from "SpectaclesInteractionKit.lspkg/Providers/CameraProvider/WorldCameraFinderProvider"

@component
export class LociHintUI extends BaseScriptComponent {
  @ui.label('<span style="color: #60A5FA;">LociHintUI – one-line onboarding hint</span>')
  @ui.separator
  @ui.group_start("References")
  @input @hint("The palace controller on 'Loci'.")
  controller: LociPalaceController
  @ui.group_end
  @ui.separator
  @ui.group_start("Settings")
  @input @hint("How far ahead the hint floats (cm).")
  @widget(new SliderWidget(40, 150, 1))
  aheadCm: number = 75
  @input @hint("Height above eye level (cm). Positive keeps it above the topic orbs.")
  @widget(new SliderWidget(-30, 30, 1))
  aboveEyeCm: number = 11
  @input @hint("Seconds a 'done' hint (Recall nudge, refusals) stays before fading.")
  @widget(new SliderWidget(1, 15, 0.5))
  linger: number = 6
  @input("vec4", "{0.92, 0.96, 1.0, 0.9}") @hint("Hint colour (light: the display is additive).")
  @widget(new ColorWidget())
  textColor: vec4 = new vec4(0.92, 0.96, 1.0, 0.9)
  @ui.group_end

  private root!: SceneObject
  private text!: Text
  private camT: Transform | null = null
  private alpha = 0
  private placed = false
  private message = ""
  private expireAt = -1
  private seenOpen = false
  private seenCard = false
  private override: string | null = null
  private overrideUntil = -1

  onAwake(): void {
    this.root = global.scene.createSceneObject("HintText")
    this.root.setParent(this.sceneObject)
    this.text = this.root.createComponent("Component.Text") as Text
    this.text.depthTest = true
    this.text.size = Math.round(52 * (this.aheadCm / 110)) // a touch above Subheadline: one line, read at a glance
    this.text.horizontalAlignment = HorizontalAlignment.Center
    this.text.verticalAlignment = VerticalAlignment.Center
    this.text.horizontalOverflow = HorizontalOverflow.Overflow
    this.text.verticalOverflow = VerticalOverflow.Overflow
    this.text.layoutRect = Rect.create(-40, 40, -3, 3)
    this.text.textFill.color = new vec4(this.textColor.x, this.textColor.y, this.textColor.z, 0)
    this.createEvent("OnStartEvent").bind(() => this.wire())
    this.createEvent("LateUpdateEvent").bind(() => this.tick())
  }

  /** Current hint text ("" when hidden). For tests and the demo tour. */
  getHint(): string { return this.currentTarget() }

  private wire(): void {
    this.camT = WorldCameraFinderProvider.getInstance().getComponent().getTransform()
    if (!this.controller) return
    const c = this.controller
    c.onTopicPlaced.add(() => this.refresh())
    c.onPalaceLoaded.add(() => { this.seenOpen = false; this.seenCard = false; this.refresh() })
    c.onPlaceRejected.add((e) => this.flash(`${e.reason}. Pick a spot further away`, 3))
    c.onClusterOpened.add(() => { this.seenOpen = true; this.refresh() })
    c.onCardChanged.add((id) => {
      if (id && !this.seenCard) { this.seenCard = true; this.refresh(); this.expireAt = getTime() + this.linger }
    })
    c.onModeChanged.add((m) => {
      if (m === "place") { this.seenOpen = false; this.seenCard = false }
      this.refresh()
      if (m === "recall") this.expireAt = getTime() + this.linger
      if (m === "explore" && this.seenCard) this.expireAt = getTime() // back from Recall: stay quiet
    })
    this.refresh()
  }

  private refresh(): void {
    const c = this.controller
    if (!c || !c.isReady()) { this.message = ""; return }
    this.expireAt = -1
    const mode = c.getMode()
    if (mode === "place") {
      const left = c.getTopicIds().length - c.placedCount()
      this.message = `Drag a topic toward any spot in your room  ·  ${left} left`
    } else if (mode === "recall") {
      this.message = "Answer at each topic  ·  pinch Explore to finish"
    } else if (!this.seenOpen) {
      this.message = "Look at a topic to open it"
    } else if (!this.seenCard) {
      this.message = "Pinch a star to read it"
    } else {
      this.message = "Pinch Recall below to test yourself"
    }
  }

  private flash(msg: string, sec: number): void {
    this.override = msg
    this.overrideUntil = getTime() + sec
  }

  private currentTarget(): string {
    const now = getTime()
    if (this.override && now < this.overrideUntil) return this.override
    if (this.expireAt >= 0 && now > this.expireAt) return ""
    return this.message
  }

  private tick(): void {
    if (!this.camT) return
    if (this.controller && this.controller.isReady() && this.message === "" && this.controller.getMode() === "place") this.refresh()
    const target = this.currentTarget()
    if (target !== "" && target !== this.text.text) {
      if (this.alpha < 0.05) this.text.text = target
      else this.alpha = Math.max(0, this.alpha - getDeltaTime() * 4) // fade out, then swap
    }
    const want = target !== "" && target === this.text.text ? 1 : 0
    this.alpha += (want - this.alpha) * Math.min(1, getDeltaTime() * 5)
    const c = this.textColor
    this.text.textFill.color = new vec4(c.x, c.y, c.z, c.w * this.alpha)

    // Lazy follow near the top of the view (flat heading), facing the user.
    const cam = this.camT.getWorldPosition()
    const fwd = this.camT.getWorldRotation().multiplyVec3(new vec3(0, 0, -1))
    const flat = new vec3(fwd.x, 0, fwd.z)
    if (flat.length < 0.001) return
    const goal = cam.add(flat.normalize().uniformScale(this.aheadCm)).add(new vec3(0, this.aboveEyeCm, 0))
    const tr = this.root.getTransform()
    const k = this.placed ? 1 - Math.exp(-getDeltaTime() * 3) : 1
    this.placed = true
    const p = vec3.lerp(tr.getWorldPosition(), goal, k)
    tr.setWorldPosition(p)
    tr.setWorldRotation(quat.angleAxis(Math.atan2(cam.x - p.x, cam.z - p.z), vec3.up()))
  }
}
