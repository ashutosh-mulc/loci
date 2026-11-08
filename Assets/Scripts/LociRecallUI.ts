// LociRecallUI.ts
// Owns: every Recall surface. (1) The Recall / Explore button that lazily follows the user
// 50 cm ahead and 35 cm below eye level. (2) The Recall panel above the open cluster:
// the question, the revealed answer, Reveal / Right / Wrong buttons, and the debrief.
// Passive view: LociRecall pushes state in (show*/hide*/set*) and listens to the events.
// Additive display: UIKit buttons use the transparent "Ghost" style plus a thin glowing
// outline; no dark panels anywhere. Text is light.

import {Button} from "SpectaclesUIKit.lspkg/Scripts/Components/Button/Button"
import {RoundedRectangle} from "SpectaclesUIKit.lspkg/Scripts/Visuals/RoundedRectangle/RoundedRectangle"
import {FlexLayout} from "SpectaclesUIKit.lspkg/Scripts/Components/Layout2D/Flex/FlexLayout"
import {FlexItem} from "SpectaclesUIKit.lspkg/Scripts/Components/Layout2D/Flex/FlexItem"
import {FlexAlign, FlexAlignSelf, FlexDirection, FlexJustify} from "SpectaclesUIKit.lspkg/Scripts/Components/Layout2D/Flex/FlexTypes"
import WorldCameraFinderProvider from "SpectaclesInteractionKit.lspkg/Providers/CameraProvider/WorldCameraFinderProvider"
import Event, {PublicApi} from "SpectaclesInteractionKit.lspkg/Utils/Event"

type TextRole = "Headline2" | "Subheadline" | "Button" | "Body" | "Caption"
const TYPE_SCALE: Record<TextRole, {size: number; weight: number}> = {
  Headline2: {size: 48, weight: 700},
  Subheadline: {size: 41, weight: 700},
  Button: {size: 39, weight: 500},
  Body: {size: 39, weight: 500},
  Caption: {size: 38, weight: 500},
}
const FONT_SIZE_SCALE = 1.0
function roleSize(role: TextRole, distanceCm: number = 110): number {
  return TYPE_SCALE[role].size * FONT_SIZE_SCALE * (distanceCm / 110)
}
function applyTextRole(t: Text, role: TextRole, distanceCm: number = 110): void {
  t.size = roleSize(role, distanceCm)
  ;(t as Text & {weight?: number}).weight = TYPE_SCALE[role].weight
}

const CONTENT_Z = 0.6
const BUTTON_LABEL_Z = 0.08

type PanelMode = "hidden" | "question" | "answer" | "message" | "debrief"

interface GlowButton {
  obj: SceneObject
  button: Button
  outline: RoundedRectangle
  label: Text
  item: FlexItem | null
  width: number
}

@component
export class LociRecallUI extends BaseScriptComponent {
  @ui.label('<span style="color: #60A5FA;">LociRecallUI – Recall button, question panel and debrief</span>')
  @ui.separator
  @ui.group_start("Recall button")
  @input @hint("Recall button width (cm). The brief asks for one large 12 cm button.")
  @widget(new SliderWidget(6, 20, 0.5))
  recallButtonWidthCm: number = 12
  @input @hint("Recall button height (cm).")
  @widget(new SliderWidget(4, 10, 0.5))
  recallButtonHeightCm: number = 5
  @input @hint("How far ahead of the user the button rests (cm).")
  @widget(new SliderWidget(30, 100, 1))
  followAheadCm: number = 50
  @input @hint("How far below eye level the button rests (cm).")
  @widget(new SliderWidget(0, 60, 1))
  followBelowEyeCm: number = 35
  @input @hint("Lazy-follow speed: higher catches up faster.")
  @widget(new SliderWidget(0.5, 8, 0.1))
  followSpeed: number = 2
  @input @hint("Label while in Explore.")
  recallLabel: string = "Recall"
  @input @hint("Label while in Recall.")
  exploreLabel: string = "Explore"
  @ui.group_end
  @ui.separator
  @ui.group_start("Panel")
  @input @hint("Panel width (cm).")
  @widget(new SliderWidget(20, 45, 0.5))
  panelWidthCm: number = 30
  @input @hint("Reveal / Right / Wrong button width (cm). At least 6 cm.")
  @widget(new SliderWidget(6, 12, 0.5))
  actionButtonWidthCm: number = 8.5
  @input @hint("Reveal / Right / Wrong button height (cm).")
  @widget(new SliderWidget(4, 8, 0.5))
  actionButtonHeightCm: number = 4.5
  @input @hint("Panel is authored for this distance (cm); farther spots scale it up so it reads the same size everywhere.")
  @widget(new SliderWidget(80, 200, 5))
  readingDistanceCm: number = 110
  @ui.group_end
  @ui.separator
  @ui.group_start("Colours")
  @input("vec4", "{0.62, 0.86, 1.0, 0.95}") @hint("Button outline glow.")
  @widget(new ColorWidget())
  glowColor: vec4 = new vec4(0.62, 0.86, 1.0, 0.95)
  @input("vec4", "{1.0, 1.0, 1.0, 1.0}") @hint("Button outline glow when aimed at.")
  @widget(new ColorWidget())
  glowHoverColor: vec4 = new vec4(1.0, 1.0, 1.0, 1.0)
  @input("vec4", "{0.97, 0.98, 1.0, 1.0}") @hint("Question and label text (light).")
  @widget(new ColorWidget())
  textColor: vec4 = new vec4(0.97, 0.98, 1.0, 1.0)
  @input("vec4", "{1.0, 0.9, 0.6, 1.0}") @hint("Answer text (warm light accent).")
  @widget(new ColorWidget())
  answerColor: vec4 = new vec4(1.0, 0.9, 0.6, 1.0)
  @input("vec4", "{0.55, 0.95, 0.65, 1.0}") @hint("Right button glow.")
  @widget(new ColorWidget())
  rightColor: vec4 = new vec4(0.55, 0.95, 0.65, 1.0)
  @input("vec4", "{1.0, 0.6, 0.6, 1.0}") @hint("Wrong button glow.")
  @widget(new ColorWidget())
  wrongColor: vec4 = new vec4(1.0, 0.6, 0.6, 1.0)
  @ui.group_end

  private _onRecallPressed = new Event<void>()
  private _onReveal = new Event<void>()
  private _onRight = new Event<void>()
  private _onWrong = new Event<void>()
  get onRecallPressed(): PublicApi<void> { return this._onRecallPressed.publicApi() }
  get onReveal(): PublicApi<void> { return this._onReveal.publicApi() }
  get onRight(): PublicApi<void> { return this._onRight.publicApi() }
  get onWrong(): PublicApi<void> { return this._onWrong.publicApi() }

  private camT: Transform | null = null
  private buttonRoot!: SceneObject
  private recallBtn!: GlowButton
  private panelRoot!: SceneObject
  private content!: SceneObject
  private flex!: FlexLayout
  private rowFlex!: FlexLayout
  private questionText!: Text
  private answerText!: Text
  private debriefText!: Text
  private revealBtn!: GlowButton
  private rightBtn!: GlowButton
  private wrongBtn!: GlowButton
  private flexReady = false
  private rowReady = false
  private initApplied = false

  private wantButton = false
  private buttonPlaced = false
  private mode: PanelMode = "hidden"
  private anchorWorld = vec3.zero()

  onAwake(): void {
    this.buildRecallButton()
    this.buildPanel()
    this.createEvent("OnStartEvent").bind(() => {
      this.camT = WorldCameraFinderProvider.getInstance().getComponent().getTransform()
    })
    this.createEvent("LateUpdateEvent").bind(() => this.onLateUpdate())
  }

  // =================== API ===================

  setRecallButtonVisible(visible: boolean): void {
    if (visible && !this.wantButton) this.buttonPlaced = false
    this.wantButton = visible
    this.apply()
  }

  isRecallButtonVisible(): boolean {
    return this.initApplied && this.buttonRoot.isEnabledInHierarchy
  }

  setRecallButtonLabel(label: string): void { this.recallBtn.label.text = label }
  getRecallButtonLabel(): string { return this.recallBtn.label.text }
  showRecallLabel(): void { this.setRecallButtonLabel(this.recallLabel) }
  showExploreLabel(): void { this.setRecallButtonLabel(this.exploreLabel) }

  /** Ask a question above `anchor`: shows the prompt and the Reveal button. */
  showQuestion(prompt: string, anchor: vec3): void {
    this.questionText.text = prompt
    this.answerText.text = ""
    this.anchorWorld = anchor
    this.mode = "question"
    this.apply()
  }

  /** Show the answer under the question, and swap Reveal for Right / Wrong. */
  showAnswer(answer: string): void {
    this.answerText.text = answer
    this.mode = "answer"
    this.apply()
  }

  /** A short line with no buttons (e.g. every star here is recalled). */
  showMessage(message: string, anchor: vec3): void {
    this.questionText.text = message
    this.answerText.text = ""
    this.anchorWorld = anchor
    this.mode = "message"
    this.apply()
  }

  showDebrief(text: string, anchor: vec3): void {
    this.debriefText.text = text
    this.anchorWorld = anchor
    this.mode = "debrief"
    this.apply()
  }

  hidePanel(): void {
    this.mode = "hidden"
    this.apply()
  }

  getRecallButtonWorldPosition(): vec3 { return this.buttonRoot.getTransform().getWorldPosition() }
  getPanelMode(): PanelMode { return this.mode }
  isPanelShown(): boolean { return this.initApplied && this.mode !== "hidden" && this.panelRoot.isEnabledInHierarchy }
  getQuestionText(): string { return this.questionText.text }
  getAnswerText(): string { return this.answerText.text }
  getDebriefText(): string { return this.debriefText.text }
  getPanelWorldPosition(): vec3 { return this.panelRoot.getTransform().getWorldPosition() }
  isRevealShown(): boolean { return this.initApplied && this.revealBtn.obj.isEnabledInHierarchy }
  isRightWrongShown(): boolean { return this.initApplied && this.rightBtn.obj.isEnabledInHierarchy && this.wrongBtn.obj.isEnabledInHierarchy }

  // =================== build ===================

  private buildRecallButton(): void {
    this.buttonRoot = global.scene.createSceneObject("RecallButtonRoot")
    this.buttonRoot.setParent(this.sceneObject)
    this.buttonRoot.createComponent("Component.Canvas")
    this.recallBtn = this.makeButton(this.buttonRoot, "RecallButton", this.recallLabel,
      this.recallButtonWidthCm, this.recallButtonHeightCm, this.glowColor, "Subheadline", false)
    this.recallBtn.button.onTriggerUp.add(() => this._onRecallPressed.invoke())
  }

  private buildPanel(): void {
    this.panelRoot = global.scene.createSceneObject("RecallPanel")
    this.panelRoot.setParent(this.sceneObject)
    this.panelRoot.createComponent("Component.Canvas")

    // Debrief: one multi-line block, shown on its own (the flex content hides).
    const debriefObj = global.scene.createSceneObject("RecallDebrief")
    debriefObj.setParent(this.panelRoot)
    debriefObj.getTransform().setLocalPosition(new vec3(0, 0, CONTENT_Z))
    this.debriefText = debriefObj.createComponent("Component.Text") as Text
    this.styleText(this.debriefText, "Body", this.textColor, true)
    this.debriefText.verticalAlignment = VerticalAlignment.Bottom
    this.debriefText.layoutRect = Rect.create(-this.panelWidthCm / 2, this.panelWidthCm / 2, -6, 6)

    // Question / answer / buttons: one FlexLayout column.
    this.content = global.scene.createSceneObject("RecallContent")
    this.content.setParent(this.panelRoot)
    this.content.getTransform().setLocalPosition(new vec3(0, 0, CONTENT_Z))
    this.flex = this.content.createComponent(FlexLayout.getTypeName()) as FlexLayout
    const qH = 4.5
    const aH = 5
    const bH = this.actionButtonHeightCm + 0.6
    const panelH = qH + aH + bH + 1.6
    this.questionText = this.addRow(this.content, "RecallQuestion", "Subheadline", qH, this.textColor)
    this.answerText = this.addRow(this.content, "RecallAnswer", "Body", aH, this.answerColor)

    const row = global.scene.createSceneObject("RecallButtons")
    row.setParent(this.content)
    const rowItem = row.createComponent(FlexItem.getTypeName()) as FlexItem
    rowItem.alignSelf = FlexAlignSelf.Stretch
    rowItem.overrideHeight = bH
    this.rowFlex = row.createComponent(FlexLayout.getTypeName()) as FlexLayout
    const w = this.actionButtonWidthCm
    const h = this.actionButtonHeightCm
    this.revealBtn = this.makeButton(row, "RevealButton", "Reveal", w, h, this.glowColor, "Button", true)
    this.rightBtn = this.makeButton(row, "RightButton", "Right", w, h, this.rightColor, "Button", true)
    this.wrongBtn = this.makeButton(row, "WrongButton", "Wrong", w, h, this.wrongColor, "Button", true)
    this.revealBtn.button.onTriggerUp.add(() => { if (this.mode === "question") this._onReveal.invoke() })
    this.rightBtn.button.onTriggerUp.add(() => { if (this.mode === "answer") this._onRight.invoke() })
    this.wrongBtn.button.onTriggerUp.add(() => { if (this.mode === "answer") this._onWrong.invoke() })

    this.rowFlex.onInitialized.add(() => {
      this.rowFlex.width = this.panelWidthCm
      this.rowFlex.height = bH
      this.rowFlex.direction = FlexDirection.Row
      this.rowFlex.justifyContent = FlexJustify.Center
      this.rowFlex.alignItems = FlexAlign.Center
      this.rowFlex.columnGap = 0 // spacing comes from margins so hidden buttons take no room
      this.rowReady = true
    })
    this.flex.onInitialized.add(() => {
      this.flex.width = this.panelWidthCm
      this.flex.height = panelH
      this.flex.direction = FlexDirection.Column
      this.flex.alignItems = FlexAlign.Stretch
      this.flex.justifyContent = FlexJustify.Center
      this.flex.rowGap = 0.4
      this.flexReady = true
    })
  }

  private makeButton(parent: SceneObject, name: string, label: string, w: number, h: number,
                     glow: vec4, role: TextRole, flexChild: boolean): GlowButton {
    const obj = global.scene.createSceneObject(name)
    obj.setParent(parent)
    const button = obj.createComponent(Button.getTypeName()) as Button
    button.setTheme("SnapOS2", "Ghost") // transparent face: nothing dark on an additive display
    button.size = new vec3(w, h, 1)

    // Thin glowing outline (the Ghost style draws no visible border of its own).
    const outlineObj = global.scene.createSceneObject(`${name}Glow`)
    outlineObj.setParent(obj)
    outlineObj.getTransform().setLocalPosition(new vec3(0, 0, 0.04))
    const outline = outlineObj.createComponent(RoundedRectangle.getTypeName()) as RoundedRectangle
    outline.size = new vec2(w, h)
    outline.cornerRadius = Math.min(h / 2, 1.2)
    outline.backgroundColor = new vec4(0, 0, 0, 0) // transparent: only the glowing outline shows
    outline.border = true
    outline.borderSize = 0.2
    outline.borderColor = glow

    const labelObj = global.scene.createSceneObject(`${name}Label`)
    labelObj.setParent(obj)
    labelObj.getTransform().setLocalPosition(new vec3(0, 0, BUTTON_LABEL_Z))
    const text = labelObj.createComponent("Component.Text") as Text
    text.text = label
    this.styleText(text, role, this.textColor, false)
    text.layoutRect = Rect.create(-(w - 0.5) / 2, (w - 0.5) / 2, -h / 2, h / 2)

    let item: FlexItem | null = null
    if (flexChild) {
      item = obj.createComponent(FlexItem.getTypeName()) as FlexItem
      item.overrideWidth = w
      item.overrideHeight = h
    }
    // Highlight when aimed at: brighter, thicker outline.
    button.onHoverEnter.add(() => { outline.borderColor = this.glowHoverColor; outline.borderSize = 0.35 })
    button.onHoverExit.add(() => { outline.borderColor = glow; outline.borderSize = 0.2 })
    return {obj, button, outline, label: text, item, width: w}
  }

  private addRow(parent: SceneObject, name: string, role: TextRole, h: number, color: vec4): Text {
    const so = global.scene.createSceneObject(name)
    so.setParent(parent)
    const t = so.createComponent("Component.Text") as Text
    this.styleText(t, role, color, true)
    t.layoutRect = Rect.create(-0.5, 0.5, -0.5, 0.5)
    const item = so.createComponent(FlexItem.getTypeName()) as FlexItem
    item.alignSelf = FlexAlignSelf.Stretch
    item.overrideHeight = h
    return t
  }

  private styleText(t: Text, role: TextRole, color: vec4, wrap: boolean): void {
    t.depthTest = true
    applyTextRole(t, role, this.readingDistanceCm)
    t.textFill.color = color
    t.horizontalAlignment = HorizontalAlignment.Center
    t.verticalAlignment = VerticalAlignment.Center
    t.horizontalOverflow = wrap ? HorizontalOverflow.Wrap : HorizontalOverflow.Overflow
    t.verticalOverflow = VerticalOverflow.Overflow
  }

  // =================== visibility + placement ===================

  private allInitialized(): boolean {
    const btns = [this.recallBtn, this.revealBtn, this.rightBtn, this.wrongBtn]
    for (const b of btns) if (!b.button.initialized || !b.outline.initialized) return false
    return this.flexReady && this.rowReady
  }

  private apply(): void {
    // Never disable UIKit pieces before they have initialised (OnStart), or they never will.
    if (!this.initApplied) return
    this.buttonRoot.enabled = this.wantButton
    const m = this.mode
    this.panelRoot.enabled = m !== "hidden"
    this.content.enabled = m === "question" || m === "answer" || m === "message"
    this.debriefText.getSceneObject().enabled = m === "debrief"
    this.answerText.getSceneObject().enabled = m === "answer"
    this.setSlot(this.revealBtn, m === "question")
    this.setSlot(this.rightBtn, m === "answer")
    this.setSlot(this.wrongBtn, m === "answer")
    if (m !== "hidden") this.placePanel()
  }

  /** Show or hide a row button; a hidden one collapses to zero width so the row stays centred. */
  private setSlot(b: GlowButton, visible: boolean): void {
    b.obj.enabled = visible
    if (!b.item) return
    b.item.overrideWidth = visible ? b.width : 0
    b.item.marginLeft = visible ? 0.75 : 0
    b.item.marginRight = visible ? 0.75 : 0
  }

  private onLateUpdate(): void {
    if (!this.initApplied) {
      if (this.allInitialized()) {
        this.initApplied = true
        this.apply()
      }
      return
    }
    if (this.wantButton) this.followUser()
    if (this.mode !== "hidden") this.placePanel()
  }

  /** Lazily follow: rest 50 cm ahead (flat heading) and 35 cm below eye, easing toward it. */
  private followUser(): void {
    if (!this.camT) return
    const cam = this.camT.getWorldPosition()
    const fwd = this.camT.getWorldRotation().multiplyVec3(new vec3(0, 0, -1))
    const flat = new vec3(fwd.x, 0, fwd.z)
    if (flat.length < 0.001) return
    const dir = flat.normalize()
    const target = cam.add(dir.uniformScale(this.followAheadCm)).add(new vec3(0, -this.followBelowEyeCm, 0))
    const tr = this.buttonRoot.getTransform()
    const k = this.buttonPlaced ? 1 - Math.exp(-getDeltaTime() * this.followSpeed) : 1
    this.buttonPlaced = true
    const p = vec3.lerp(tr.getWorldPosition(), target, k)
    tr.setWorldPosition(p)
    this.faceUser(tr, p, cam)
  }

  private placePanel(): void {
    if (!this.camT) return
    const tr = this.panelRoot.getTransform()
    const cam = this.camT.getWorldPosition()
    tr.setWorldPosition(this.anchorWorld)
    // Keep the same angular size at every spot (1.2 to 2.5 m away).
    tr.setLocalScale(vec3.one().uniformScale(Math.max(1, this.anchorWorld.distance(cam) / this.readingDistanceCm)))
    this.faceUser(tr, this.anchorWorld, cam)
  }

  private faceUser(tr: Transform, p: vec3, cam: vec3): void {
    const dx = cam.x - p.x
    const dz = cam.z - p.z
    if (dx * dx + dz * dz < 0.0001) return
    tr.setWorldRotation(quat.angleAxis(Math.atan2(dx, dz), vec3.up()))
  }
}
