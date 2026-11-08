// LociCardUI.ts
// Owns: the one thought card (sentence + source/date) shown beside a pinched star.
// Passive view: the controller calls showCard / hideCard; the card holds no palace state.
// Surface: UIKit RoundedRectangle with a transparent fill and a thin glowing border
// (the brief bans dark panels on the additive display, so no BackPlate/Frame fill).
// Content: UIKit FlexLayout column with two text rows. Faces the user every frame.

import {RoundedRectangle} from "SpectaclesUIKit.lspkg/Scripts/Visuals/RoundedRectangle/RoundedRectangle"
import {FlexLayout} from "SpectaclesUIKit.lspkg/Scripts/Components/Layout2D/Flex/FlexLayout"
import {FlexItem} from "SpectaclesUIKit.lspkg/Scripts/Components/Layout2D/Flex/FlexItem"
import {FlexAlign, FlexAlignSelf, FlexDirection, FlexJustify} from "SpectaclesUIKit.lspkg/Scripts/Components/Layout2D/Flex/FlexTypes"
import WorldCameraFinderProvider from "SpectaclesInteractionKit.lspkg/Providers/CameraProvider/WorldCameraFinderProvider"

type TextRole = "Subheadline" | "Body" | "Caption"
const TYPE_SCALE: Record<TextRole, {size: number; weight: number}> = {
  Subheadline: {size: 41, weight: 700},
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

@component
export class LociCardUI extends BaseScriptComponent {
  @ui.label('<span style="color: #60A5FA;">LociCardUI – one-line thought card, glowing outline, no dark panel</span>')
  @ui.separator
  @ui.group_start("Settings")
  @input
  @hint("Card width in cm.")
  @widget(new SliderWidget(15, 40, 0.5))
  cardWidthCm: number = 25
  @input
  @hint("Card height in cm.")
  @widget(new SliderWidget(6, 20, 0.5))
  cardHeightCm: number = 10
  @input
  @hint("Gap between the star and the card's near edge, in cm.")
  @widget(new SliderWidget(0, 15, 0.5))
  gapFromStarCm: number = 4
  @input("vec4", "{0.62, 0.86, 1.0, 0.95}")
  @hint("Thin glowing outline colour.")
  @widget(new ColorWidget())
  outlineColor: vec4 = new vec4(0.62, 0.86, 1.0, 0.95)
  @input
  @hint("Outline width in cm.")
  @widget(new SliderWidget(0.05, 1, 0.05))
  outlineWidthCm: number = 0.2
  @input("vec4", "{0.97, 0.98, 1.0, 1.0}")
  @hint("Sentence text colour (light).")
  @widget(new ColorWidget())
  sentenceColor: vec4 = new vec4(0.97, 0.98, 1.0, 1.0)
  @input("vec4", "{0.8, 0.88, 1.0, 0.75}")
  @hint("Source and date text colour (lighter weight, still light).")
  @widget(new ColorWidget())
  metaColor: vec4 = new vec4(0.8, 0.88, 1.0, 0.75)
  @input
  @hint("Text is sized to read from this distance (cm). Cards sit 1.2–2.5 m away.")
  @widget(new SliderWidget(110, 260, 5))
  readingDistanceCm: number = 150
  @ui.group_end

  private body!: SceneObject
  private outline!: RoundedRectangle
  private flex!: FlexLayout
  private sentenceText!: Text
  private metaText!: Text
  private camT: Transform | null = null
  private flexReady = false
  private initApplied = false
  private wantVisible = false
  private anchorWorld = vec3.zero()
  private side = 1

  onAwake(): void {
    this.sceneObject.createComponent("Component.Canvas")

    this.body = global.scene.createSceneObject("CardBody")
    this.body.setParent(this.sceneObject)

    const outlineObj = global.scene.createSceneObject("CardOutline")
    outlineObj.setParent(this.body)
    this.outline = outlineObj.createComponent(RoundedRectangle.getTypeName()) as RoundedRectangle
    this.outline.size = new vec2(this.cardWidthCm, this.cardHeightCm)
    this.outline.cornerRadius = 1.2
    this.outline.backgroundColor = new vec4(0, 0, 0, 0)
    this.outline.border = true
    this.outline.borderSize = this.outlineWidthCm
    this.outline.borderColor = this.outlineColor

    const content = global.scene.createSceneObject("CardContent")
    content.setParent(this.body)
    content.getTransform().setLocalPosition(new vec3(0, 0, CONTENT_Z))
    this.flex = content.createComponent(FlexLayout.getTypeName()) as FlexLayout
    const pad = 1.0
    const innerH = this.cardHeightCm - pad * 2
    this.sentenceText = this.addRow(content, "Body", innerH * 0.72, this.sentenceColor, true)
    this.metaText = this.addRow(content, "Caption", innerH * 0.2, this.metaColor, false)
    this.flex.onInitialized.add(() => {
      this.flex.width = this.cardWidthCm
      this.flex.height = this.cardHeightCm
      this.flex.direction = FlexDirection.Column
      this.flex.alignItems = FlexAlign.Stretch
      this.flex.justifyContent = FlexJustify.Center
      this.flex.rowGap = 0.4
      this.flex.paddingTop = pad
      this.flex.paddingBottom = pad
      this.flex.paddingLeft = pad * 1.2
      this.flex.paddingRight = pad * 1.2
      this.flexReady = true
    })

    this.createEvent("OnStartEvent").bind(() => {
      this.camT = WorldCameraFinderProvider.getInstance().getComponent().getTransform()
    })
    this.createEvent("LateUpdateEvent").bind(() => this.onLateUpdate())
  }

  /** Show the card beside a star at `starWorld`; `side` +1 = user's right, -1 = user's left. */
  showCard(sentence: string, source: string, date: string, starWorld: vec3, side: number = 1): void {
    this.side = side >= 0 ? 1 : -1
    this.sentenceText.text = sentence
    this.metaText.text = `${source}  ·  ${date}`
    this.anchorWorld = starWorld
    this.wantVisible = true
    this.place()
    if (this.initApplied) this.body.enabled = true
  }

  hideCard(): void {
    this.wantVisible = false
    if (this.initApplied) this.body.enabled = false
  }

  isShown(): boolean {
    return this.wantVisible && this.initApplied && this.body.isEnabledInHierarchy
  }

  getSentence(): string {
    return this.sentenceText ? this.sentenceText.text : ""
  }

  getMeta(): string {
    return this.metaText ? this.metaText.text : ""
  }

  private addRow(parent: SceneObject, role: TextRole, h: number, color: vec4, wrap: boolean): Text {
    const so = global.scene.createSceneObject(wrap ? "CardSentence" : "CardMeta")
    so.setParent(parent)
    const t = so.createComponent("Component.Text") as Text
    t.depthTest = true
    applyTextRole(t, role, this.readingDistanceCm)
    t.textFill.color = color
    t.horizontalAlignment = HorizontalAlignment.Center
    t.verticalAlignment = VerticalAlignment.Center
    t.horizontalOverflow = wrap ? HorizontalOverflow.Wrap : HorizontalOverflow.Overflow
    t.verticalOverflow = VerticalOverflow.Overflow
    t.layoutRect = Rect.create(-0.5, 0.5, -0.5, 0.5)
    const item = so.createComponent(FlexItem.getTypeName()) as FlexItem
    item.alignSelf = FlexAlignSelf.Stretch
    item.overrideHeight = h
    return t
  }

  private place(): void {
    if (!this.camT) return
    const cam = this.camT.getWorldPosition()
    const toCam = cam.sub(this.anchorWorld)
    const flat = new vec3(toCam.x, 0, toCam.z)
    if (flat.length < 0.001) return
    const fwd = flat.normalize()
    // Right as seen by the user: up x toCamera.
    const right = vec3.up().cross(fwd).normalize()
    const offset = right.uniformScale(this.side * (this.cardWidthCm / 2 + this.gapFromStarCm))
    const tr = this.sceneObject.getTransform()
    tr.setWorldPosition(this.anchorWorld.add(offset))
    tr.setWorldRotation(quat.lookAt(fwd, vec3.up()))
  }

  private onLateUpdate(): void {
    if (!this.initApplied) {
      // Start hidden only after the UIKit pieces have initialised (never disable before OnStart).
      if (this.outline.initialized && this.flexReady) {
        this.initApplied = true
        this.body.enabled = this.wantVisible
      }
      return
    }
    if (this.wantVisible) this.place()
  }
}
