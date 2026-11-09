// LociLabelsUI.ts
// Owns: every world-anchored text label in Loci (orb names, closed-spot names, star labels).
// Passive view: the controller tells it what to show; it holds no palace state.
// Labels are parented to the thing they name, so they move/hide with it, and turn
// (yaw only) to face the user each frame. Groups ("orb", "spot", "star") can be hidden
// together — Recall will call setGroupVisible("star", false).
// Header note: these are single in-world labels on 3D objects, not a composed panel,
// so they are raw Component.Text (the UIKit text primitive) without a backplate.

import WorldCameraFinderProvider from "SpectaclesInteractionKit.lspkg/Providers/CameraProvider/WorldCameraFinderProvider"

/** Objektiv cap-height / em ratio; Text.size is em height in cm x 43.886. */
const CAP_TO_EM = 1 / 0.695
const EM_CM_TO_SIZE = 43.886

interface LabelEntry {
  key: string
  group: string
  root: SceneObject
  text: Text
  visible: boolean
}

@component
export class LociLabelsUI extends BaseScriptComponent {
  @ui.label('<span style="color: #60A5FA;">LociLabelsUI – light in-world labels</span>')
  @ui.separator
  @ui.group_start("Settings")
  @input("vec4", "{0.95, 0.97, 1.0, 1.0}")
  @hint("Label colour. Light only: the display is additive, so dark text disappears.")
  @widget(new ColorWidget())
  textColor: vec4 = new vec4(0.95, 0.97, 1.0, 1.0)
  @input
  @hint("Turn labels to face the user each frame (yaw only).")
  faceUser: boolean = true
  @ui.group_end

  private labels = new Map<string, LabelEntry>()
  private groupVisible = new Map<string, boolean>()
  private camT: Transform | null = null

  onAwake(): void {
    this.createEvent("OnStartEvent").bind(() => {
      this.camT = WorldCameraFinderProvider.getInstance().getComponent().getTransform()
    })
    this.createEvent("LateUpdateEvent").bind(() => this.billboard())
  }

  /**
   * Add a label under `parent` at `localOffset` (cm). `capHeightCm` is the capital-letter height.
   * `anchorBottom` puts the text's bottom edge at the offset (text grows upward).
   */
  addLabel(key: string, group: string, parent: SceneObject, label: string, localOffset: vec3,
           capHeightCm: number, anchorBottom: boolean = true, align: "center" | "left" | "right" = "center"): void {
    this.removeLabel(key)
    const root = global.scene.createSceneObject(`Label_${key}`)
    root.setParent(parent)
    root.getTransform().setLocalPosition(localOffset)
    const t = root.createComponent("Component.Text") as Text
    t.depthTest = true
    t.text = label
    const emCm = capHeightCm * CAP_TO_EM
    t.size = Math.round(emCm * EM_CM_TO_SIZE)
    t.textFill.color = this.textColor
    t.horizontalAlignment = align === "left" ? HorizontalAlignment.Left
      : align === "right" ? HorizontalAlignment.Right : HorizontalAlignment.Center
    t.verticalAlignment = anchorBottom ? VerticalAlignment.Bottom : VerticalAlignment.Center
    t.horizontalOverflow = HorizontalOverflow.Overflow
    t.verticalOverflow = VerticalOverflow.Overflow
    const w = emCm * 16
    const left = align === "left" ? 0 : align === "right" ? -w : -w / 2
    t.layoutRect = anchorBottom
      ? Rect.create(left, left + w, 0, emCm * 1.4)
      : Rect.create(left, left + w, -emCm * 0.7, emCm * 0.7)
    const entry: LabelEntry = {key, group, root, text: t, visible: true}
    this.labels.set(key, entry)
    this.apply(entry)
  }

  removeLabel(key: string): void {
    const e = this.labels.get(key)
    if (!e) return
    if (!isNull(e.root)) e.root.destroy()
    this.labels.delete(key)
  }

  setText(key: string, label: string): void {
    const e = this.labels.get(key)
    if (e) e.text.text = label
  }

  getText(key: string): string | null {
    const e = this.labels.get(key)
    return e ? e.text.text : null
  }

  setOffset(key: string, localOffset: vec3): void {
    const e = this.labels.get(key)
    if (e) e.root.getTransform().setLocalPosition(localOffset)
  }

  /** How many labels exist (tests: they must not pile up across palace swaps). */
  count(): number { return this.labels.size }

  /** Uniform scale of one label (1 = its normal size). */
  setScale(key: string, scale: number): void {
    const e = this.labels.get(key)
    if (e && !isNull(e.root)) e.root.getTransform().setLocalScale(vec3.one().uniformScale(scale))
  }

  getScale(key: string): number {
    const e = this.labels.get(key)
    return e && !isNull(e.root) ? e.root.getTransform().getLocalScale().x : 1
  }

  /** Fade one label (1 = its normal colour). */
  setAlpha(key: string, alpha: number): void {
    const e = this.labels.get(key)
    if (!e || isNull(e.root)) return
    const c = this.textColor
    e.text.textFill.color = new vec4(c.r, c.g, c.b, c.a * alpha)
  }

  setVisible(key: string, visible: boolean): void {
    const e = this.labels.get(key)
    if (!e) return
    e.visible = visible
    this.apply(e)
  }

  setGroupVisible(group: string, visible: boolean): void {
    this.groupVisible.set(group, visible)
    this.labels.forEach((e) => { if (e.group === group) this.apply(e) })
  }

  isGroupVisible(group: string): boolean {
    return this.groupVisible.get(group) ?? true
  }

  /** True when the label exists, is switched on, and every parent is enabled. */
  isShowing(key: string): boolean {
    const e = this.labels.get(key)
    if (!e || isNull(e.root)) return false
    return e.root.isEnabledInHierarchy
  }

  getLabelObject(key: string): SceneObject | null {
    const e = this.labels.get(key)
    return e ? e.root : null
  }

  private apply(e: LabelEntry): void {
    if (isNull(e.root)) return
    e.root.enabled = e.visible && this.isGroupVisible(e.group)
  }

  private billboard(): void {
    if (!this.faceUser || !this.camT) return
    const cam = this.camT.getWorldPosition()
    this.labels.forEach((e) => {
      if (isNull(e.root) || !e.root.isEnabledInHierarchy) return
      const tr = e.root.getTransform()
      const p = tr.getWorldPosition()
      const dx = cam.x - p.x
      const dz = cam.z - p.z
      if (dx * dx + dz * dz < 0.0001) return
      tr.setWorldRotation(quat.angleAxis(Math.atan2(dx, dz), vec3.up()))
    })
  }
}
