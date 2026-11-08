// LociPalaceController.ts
// Owns: the Loci flow in ANY room.
//  Place:   drag a topic orb toward any place in your room and let go. It flies along your
//           line of sight and anchors there. On Specs, World Query snaps it onto the real
//           surface you aimed at; where no surface is found (or in Lens Studio's preview, whose
//           rooms World Query can't see) it anchors `placeDistanceCm` out along that line.
//  Explore: head-gaze dwell opens one topic's cluster at a time (0.6 s in, 2 s out).
//  Cards:   pinch a star to show its one-line card.
// A "spot" is now simply a topic's own anchor, so spot ids are topic ids.
// Holds the single LociState. Reads every topic/thought/thread from the palace data
// (PalaceData.ts by default, or a per-user JSON via setPalace). Never hard-codes content.
// Recall (criterion 5) lives in LociRecall.ts and drives setMode / setStarLabelsVisible /
// setStarState. Visuals: glowing cores + additive halo sprites, twinkle, bloom-open, thread lines.

import {PALACE, Thought, Topic, Thread} from "./PalaceData"
import {LociState, PalaceMode, StarState} from "./LociState"
import {LociLabelsUI} from "./LociLabelsUI"
import {LociCardUI} from "./LociCardUI"
import {linesMesh, ringMesh, sphereMesh, starMesh} from "./LociMeshes"
import {Interactable} from "SpectaclesInteractionKit.lspkg/Components/Interaction/Interactable/Interactable"
import {InteractableManipulation} from "SpectaclesInteractionKit.lspkg/Components/Interaction/InteractableManipulation/InteractableManipulation"
import WorldCameraFinderProvider from "SpectaclesInteractionKit.lspkg/Providers/CameraProvider/WorldCameraFinderProvider"
import Event from "SpectaclesInteractionKit.lspkg/Utils/Event"

export interface PalaceDataShape {
  topics: Topic[]
  thoughts: Thought[]
  threads: Thread[]
}

interface Halo {
  obj: SceneObject
  mat: Material
  size: number
  color: vec4
  phase: number
}

interface AnchorEntry {
  id: string // = topic id
  obj: SceneObject
  dot: SceneObject
  dotHalo: Halo
  cluster: SceneObject | null
  openT: number // bloom animation clock
}

interface StarEntry {
  thought: Thought
  obj: SceneObject
  visual: SceneObject
  mat: Material
  halo: Halo
  baseColor: vec4
  hovered: boolean
}

interface OrbEntry {
  topic: Topic
  obj: SceneObject
  visual: SceneObject
  mat: Material
  halo: Halo
  home: vec3
  flying: boolean
}

interface Flight {
  orb: OrbEntry
  from: vec3
  to: vec3
  t: number
  dur: number
  done: () => void
}

const DEG = Math.PI / 180
const HALO_ALPHA = 0.1 // per layer; five layers overlap toward the centre
const WQ = (() => {
  try { return require("LensStudio:WorldQueryModule") as WorldQueryModule } catch (e) { return null }
})()

/** Height hint (cm above the floor) for a topic's `spot` word, used by suggested placement. */
const SPOT_HEIGHT: Record<string, number> = {desk: 75, shelf: 110, window: 130, door: 100, plant: 90, table: 75, wall: 130}

@component
export class LociPalaceController extends BaseScriptComponent {
  @ui.label('<span style="color: #60A5FA;">LociPalaceController – any-room memory palace</span>')
  @ui.separator
  @ui.group_start("References")
  @input @hint("Authored root of the palace. Its origin is the floor under the user at start.")
  palaceRoot: SceneObject
  @input @hint("Parent for the topic orbs (created from the palace data at start).")
  orbsRoot: SceneObject
  @input @hint("Labels UI module (orb, spot and star labels).")
  labels: LociLabelsUI
  @input @hint("Card UI module (the one-line thought card).")
  card: LociCardUI
  @input @hint("Unlit material cloned for orb, dot and star cores.")
  glowMaterial: Material
  @input @hint("Optional: unused since halos moved to nested spheres; kept so the scene wiring stays valid.")
  @allowUndefined
  haloMaterial: Material
  @input @hint("Soft chime played when a cluster opens. Leave empty for silence.")
  @allowUndefined
  chimeTrack: AudioTrackAsset
  @ui.group_end
  @ui.separator
  @ui.group_start("Room")
  @input @hint("Move the palace so its floor sits under the user's head at start.")
  anchorToCameraAtStart: boolean = true
  @input @hint("Assumed standing eye height in cm (floor = eye - this).")
  @widget(new SliderWidget(120, 200, 1))
  eyeHeightCm: number = 160
  @ui.group_end
  @ui.separator
  @ui.group_start("Place")
  @input @hint("How far an aimed orb flies when no real surface is found (cm). In preview it always uses this.")
  @widget(new SliderWidget(80, 300, 5))
  placeDistanceCm: number = 160
  @input @hint("Use World Query to snap onto the real surface you aimed at (Specs).")
  useWorldQuery: boolean = true
  @input @hint("Topics must be at least this far apart (degrees, as seen from you) so each can be looked at alone.")
  @widget(new SliderWidget(8, 40, 1))
  minSeparationDeg: number = 18
  @input @hint("An orb must be dragged at least this far (cm) before release counts as a placement.")
  @widget(new SliderWidget(2, 30, 1))
  minDragCm: number = 6
  @input @hint("Topic orb diameter (cm).")
  @widget(new SliderWidget(4, 20, 0.5))
  orbDiameterCm: number = 8
  @input @hint("Distance of the orb arc in front of the user (cm).")
  @widget(new SliderWidget(30, 100, 1))
  orbArcRadiusCm: number = 60
  @input @hint("Orb arc height below eye level at start (cm).")
  @widget(new SliderWidget(0, 60, 1))
  orbBelowEyeCm: number = 9
  @input @hint("Total width of the orb arc in degrees.")
  @widget(new SliderWidget(20, 120, 1))
  orbArcSpanDeg: number = 48
  @input("vec4", "{0.7, 0.9, 1.0, 1.0}") @hint("Orb glow colour.")
  @widget(new ColorWidget())
  orbColor: vec4 = new vec4(0.7, 0.9, 1.0, 1.0)
  @ui.group_end
  @ui.separator
  @ui.group_start("Explore")
  @input @hint("Seconds of looking at a topic before its cluster opens.")
  @widget(new SliderWidget(0.1, 3, 0.05))
  openDwellSec: number = 0.6
  @input @hint("Seconds of looking away before the open cluster closes.")
  @widget(new SliderWidget(0.5, 6, 0.1))
  closeAwaySec: number = 2
  @input @hint("Half-angle (deg) of the gaze cone that counts as looking at a closed topic.")
  @widget(new SliderWidget(3, 25, 0.5))
  gazeOpenConeDeg: number = 9
  @input @hint("Half-angle (deg) that still counts as looking at the open cluster.")
  @widget(new SliderWidget(5, 35, 0.5))
  gazeHoldConeDeg: number = 20
  @input @hint("Cluster centre height above the anchor point (cm).")
  @widget(new SliderWidget(0, 40, 1))
  clusterLiftCm: number = 12
  @input @hint("Closed-topic dot diameter (cm).")
  @widget(new SliderWidget(1, 8, 0.5))
  dotDiameterCm: number = 3
  @input("vec4", "{0.75, 0.88, 1.0, 0.8}") @hint("Closed-topic dot colour.")
  @widget(new ColorWidget())
  dotColor: vec4 = new vec4(0.75, 0.88, 1.0, 0.8)
  @input @hint("Seconds for a cluster to bloom open.")
  @widget(new SliderWidget(0.05, 1.5, 0.05))
  bloomSec: number = 0.45
  @ui.group_end
  @ui.separator
  @ui.group_start("Stars and labels")
  @input @hint("Star size across (cm).")
  @widget(new SliderWidget(1, 6, 0.1))
  starSizeCm: number = 3.2
  @input @hint("Halo size around each star (cm).")
  @widget(new SliderWidget(2, 20, 0.5))
  starHaloCm: number = 12
  @input @hint("Pinch target radius around each star (cm). Big and forgiving.")
  @widget(new SliderWidget(1, 6, 0.1))
  starTargetRadiusCm: number = 3
  @input @hint("Star label cap height (cm) for a topic 2.5 m away; nearer topics get proportionally smaller labels.")
  @widget(new SliderWidget(0.5, 6, 0.1))
  starLabelCapCm: number = 1.8
  @input @hint("Topic name cap height above an anchor (cm).")
  @widget(new SliderWidget(0.5, 6, 0.1))
  spotLabelCapCm: number = 2
  @input @hint("Topic name cap height on an orb (cm).")
  @widget(new SliderWidget(0.5, 4, 0.1))
  orbLabelCapCm: number = 1
  @input("vec4", "{1.0, 0.86, 0.5, 1.0}") @hint("Decision star colour (solid star).")
  @widget(new ColorWidget())
  decisionColor: vec4 = new vec4(1.0, 0.86, 0.5, 1.0)
  @input("vec4", "{0.55, 0.95, 1.0, 1.0}") @hint("Insight star colour (ring).")
  @widget(new ColorWidget())
  insightColor: vec4 = new vec4(0.55, 0.95, 1.0, 1.0)
  @input("vec4", "{0.85, 0.72, 1.0, 1.0}") @hint("Question star colour (slow pulse).")
  @widget(new ColorWidget())
  questionColor: vec4 = new vec4(0.85, 0.72, 1.0, 1.0)
  @input @hint("Seconds per slow pulse on question stars.")
  @widget(new SliderWidget(0.5, 6, 0.1))
  pulsePeriodSec: number = 2.4
  @input("vec4", "{0.7, 0.85, 1.0, 0.22}") @hint("Thread line colour; alpha is its strength (links to related ideas in other topics).")
  @widget(new ColorWidget())
  threadColor: vec4 = new vec4(0.7, 0.85, 1.0, 0.22)
  @input @hint("Show faint thread lines from an open cluster to related topics.")
  showThreads: boolean = true
  @ui.group_end
  @ui.separator
  @ui.group_start("Audio")
  @input @hint("Chime volume.")
  @widget(new SliderWidget(0, 1, 0.05))
  chimeVolume: number = 0.5
  @ui.group_end

  // ---- events (UI / Recall / hints / tests subscribe) ----
  readonly onTopicPlaced = new Event<{topicId: string; spot: string}>()
  readonly onPlaceRejected = new Event<{topicId: string; reason: string}>()
  readonly onModeChanged = new Event<PalaceMode>()
  readonly onClusterOpened = new Event<string>()
  readonly onClusterClosed = new Event<string>()
  readonly onCardChanged = new Event<string | null>()
  readonly onPalaceLoaded = new Event<void>()

  private data: PalaceDataShape = PALACE
  private state!: LociState
  private anchors = new Map<string, AnchorEntry>()
  private orbs = new Map<string, OrbEntry>()
  private stars = new Map<string, StarEntry>()
  private flights: Flight[] = []
  private threadsObj: SceneObject | null = null
  private threadSegs: [vec3, vec3][] = []
  private camT: Transform | null = null
  private audio: AudioComponent | null = null
  private hitSession: HitTestSession | null = null
  private dwellSpot: string | null = null
  private dwellTime = 0
  private awayTime = 0
  private ready = false
  private started = false

  onAwake(): void {
    if (!this.palaceRoot || !this.orbsRoot || !this.labels || !this.card || !this.glowMaterial) {
      print("LociPalaceController: a required @input is not wired (palaceRoot, orbsRoot, labels, card, glowMaterial).")
      return
    }
    if (this.chimeTrack) {
      this.audio = this.sceneObject.createComponent("Component.AudioComponent") as AudioComponent
      this.audio.audioTrack = this.chimeTrack
      this.audio.volume = this.chimeVolume
    }
    this.createEvent("OnStartEvent").bind(() => this.start())
    this.createEvent("LateUpdateEvent").bind(() => this.update())
  }

  // =================== public API (also used by Recall, hints and LEAF) ===================

  getPalace(): PalaceDataShape { return this.data }
  getMode(): PalaceMode { return this.state ? this.state.mode : "place" }
  isReady(): boolean { return this.ready }
  getTopicIds(): string[] { return this.data.topics.map((t) => t.id) }
  getTopic(topicId: string): Topic | null { return this.data.topics.filter((t) => t.id === topicId)[0] ?? null }
  /** Ids of every possible anchor (one per topic). */
  getSpotIds(): string[] { return this.getTopicIds() }
  getPlacedSpot(topicId: string): string | null { return this.state.spotOf(topicId) }
  getTopicAt(spot: string): string | null { return this.state.topicAt(spot) }
  isAnchored(spot: string): boolean { return this.state.isAnchored(spot) }
  placedCount(): number { return this.state.placedCount() }
  isOpen(spot: string): boolean { return this.state.openSpot === spot }
  getOpenSpot(): string | null { return this.state.openSpot }
  getOpenCardId(): string | null { return this.state.openCardId }
  getOrbObject(topicId: string): SceneObject | null { const o = this.orbs.get(topicId); return o ? o.obj : null }
  getStarObject(thoughtId: string): SceneObject | null { const s = this.stars.get(thoughtId); return s ? s.obj : null }
  getSpotObject(spot: string): SceneObject | null { const a = this.anchors.get(spot); return a ? a.obj : null }
  getDotObject(spot: string): SceneObject | null { const a = this.anchors.get(spot); return a ? a.dot : null }
  thoughtsAt(spot: string): Thought[] {
    const topic = this.state.topicAt(spot)
    return topic ? this.data.thoughts.filter((t) => t.topic === topic) : []
  }
  getThreadLineCount(): number { return this.threadsObj ? this.threadCountShown : 0 }
  /** The drawn thread segments (world start at a star, end at the other topic). For tests. */
  getThreadSegments(): [vec3, vec3][] { return this.threadsObj ? this.threadSegs.slice() : [] }

  /** World point of a topic's anchor (where its dot sits). */
  getSpotPointWorld(spot: string): vec3 | null {
    const a = this.anchors.get(spot)
    return a ? a.obj.getTransform().getWorldPosition() : null
  }

  /** World centre of the topic's cluster (what gaze aims at). */
  getClusterCentreWorld(spot: string): vec3 | null {
    const p = this.getSpotPointWorld(spot)
    return p ? p.add(new vec3(0, this.clusterLiftCm, 0)) : null
  }

  /**
   * Suggested anchor point for a topic: spread across the front of the room (about 150° wide),
   * 1.3 to 2.2 m away, at the height its `spot` word suggests. Used by tests and the demo tour.
   */
  suggestedPoint(topicId: string): vec3 {
    const i = Math.max(0, this.getTopicIds().indexOf(topicId))
    const n = this.data.topics.length
    const yaw = n > 1 ? (-75 + (150 * i) / (n - 1)) * DEG : 0
    const dist = [160, 130, 220, 190, 140][i % 5]
    const topic = this.getTopic(topicId)
    const h = SPOT_HEIGHT[topic ? topic.spot : ""] ?? 100
    const local = new vec3(-Math.sin(yaw) * dist, h, -Math.cos(yaw) * dist)
    return this.palaceRoot.getTransform().getWorldTransform().multiplyPoint(local)
  }

  /** Anchor a topic at a world point now (no flight, no surface snap). */
  placeTopicAt(topicId: string, worldPoint: vec3): boolean {
    if (!this.ready || this.state.mode !== "place") return false
    const reason = this.rejectReason(topicId, worldPoint)
    if (reason) { this.onPlaceRejected.invoke({topicId, reason}); return false }
    if (!this.state.place(topicId, topicId)) return false
    this.anchorVisuals(topicId, worldPoint)
    return true
  }

  /** Anchor a topic at its suggested point (tests, demo tour). */
  placeTopic(topicId: string): boolean {
    return this.placeTopicAt(topicId, this.suggestedPoint(topicId))
  }

  /** Simulate the user's aim-and-release: the orb flies along the line of sight to `aimPoint`'s direction. */
  aimAndRelease(topicId: string, aimPoint: vec3): void {
    const orb = this.orbs.get(topicId)
    if (orb) this.releaseOrb(orb, aimPoint)
  }

  openSpot(spot: string): boolean {
    if (this.state.mode === "place" || !this.state.isAnchored(spot)) return false
    if (this.state.openSpot === spot) return true
    this.closeCluster()
    const a = this.anchors.get(spot)!
    if (a.cluster) {
      a.cluster.enabled = true
      a.openT = 0
      a.cluster.getTransform().setLocalScale(vec3.one().uniformScale(0.01))
    }
    a.dot.enabled = false
    this.labels.setOffset(`spot:${spot}`, new vec3(0, this.clusterLiftCm + 24, 0))
    this.state.openSpot = spot
    this.awayTime = 0
    this.buildThreads(spot)
    if (this.audio) this.audio.play(1)
    this.onClusterOpened.invoke(spot)
    return true
  }

  closeCluster(): void {
    const spot = this.state.openSpot
    if (!spot) return
    this.hideCard()
    const a = this.anchors.get(spot)!
    if (a.cluster) a.cluster.enabled = false
    a.dot.enabled = true
    this.labels.setOffset(`spot:${spot}`, this.closedLabelOffset())
    this.state.openSpot = null
    this.clearThreads()
    this.onClusterClosed.invoke(spot)
  }

  /** Show a star's card, or hide it if it is already showing. Returns true if a card is now showing. */
  toggleCard(thoughtId: string): boolean {
    const star = this.stars.get(thoughtId)
    if (!star) return false
    if (this.state.mode === "recall") return false // a card would give the answer away
    if (this.state.openCardId === thoughtId) {
      this.hideCard()
      return false
    }
    const spot = this.state.spotOf(star.thought.topic)
    if (!spot || this.state.openSpot !== spot) return false
    if (this.state.openCardId) this.hideCard()
    const t = star.thought
    this.card.showCard(t.text, t.source, t.date, star.obj.getTransform().getWorldPosition(), t.offset[0] >= 0 ? 1 : -1)
    this.labels.setVisible(`star:${thoughtId}`, false)
    this.state.openCardId = thoughtId
    this.onCardChanged.invoke(thoughtId)
    return true
  }

  hideCard(): void {
    if (this.state.openCardId === null) return
    this.labels.setVisible(`star:${this.state.openCardId}`, true)
    this.card.hideCard()
    this.state.openCardId = null
    this.onCardChanged.invoke(null)
  }

  isCardShown(): boolean { return this.card.isShown() }

  // ---- Recall hooks ----
  setMode(mode: PalaceMode): void {
    if (this.state.mode === mode) return
    this.state.mode = mode
    this.onModeChanged.invoke(mode)
  }
  setStarLabelsVisible(visible: boolean): void { this.labels.setGroupVisible("star", visible) }
  areStarLabelsVisible(): boolean { return this.labels.isGroupVisible("star") }
  isStarLabelShowing(thoughtId: string): boolean { return this.labels.isShowing(`star:${thoughtId}`) }
  setSpotLabelVisible(spot: string, visible: boolean): void { this.labels.setVisible(`spot:${spot}`, visible) }
  getStarState(thoughtId: string): StarState { return this.state.starState(thoughtId) }
  getStarColor(thoughtId: string): vec4 | null { const s = this.stars.get(thoughtId); return s ? s.mat.mainPass.baseColor : null }
  setStarState(thoughtId: string, s: StarState): void {
    this.state.setStarState(thoughtId, s)
    const star = this.stars.get(thoughtId)
    if (star) this.applyStarLook(star)
  }

  /** Back to Place: orbs home, anchors removed, clusters closed. */
  resetPalace(): void {
    if (!this.ready) return
    this.closeCluster()
    this.anchors.forEach((a) => {
      this.labels.removeLabel(`spot:${a.id}`)
      a.obj.destroy()
    })
    this.anchors.clear()
    this.stars.clear()
    this.flights = []
    this.orbs.forEach((o) => {
      o.obj.enabled = true
      o.flying = false
      o.obj.getTransform().setWorldPosition(o.home)
    })
    const wasMode = this.state.mode
    this.state.reset()
    this.dwellSpot = null
    this.dwellTime = 0
    if (wasMode !== "place") this.onModeChanged.invoke("place")
  }

  /** Swap in another user's palace (same schema). Rebuilds orbs and returns to Place. */
  setPalace(data: PalaceDataShape): void {
    this.data = data
    if (!this.started) return
    this.resetPalace()
    this.orbs.forEach((o) => { this.labels.removeLabel(`orb:${o.topic.id}`); o.obj.destroy() })
    this.orbs.clear()
    this.state = new LociState(this.getTopicIds(), this.getTopicIds())
    this.buildOrbs()
    this.onPalaceLoaded.invoke()
  }

  // =================== setup ===================

  private start(): void {
    this.started = true
    this.camT = WorldCameraFinderProvider.getInstance().getComponent().getTransform()
    if (this.anchorToCameraAtStart) this.anchorPalaceToUser()
    if (this.useWorldQuery && WQ) {
      try {
        const options = HitTestSessionOptions.create()
        options.filter = true
        this.hitSession = WQ.createHitTestSessionWithOptions(options)
        this.hitSession.start()
      } catch (e) {
        this.hitSession = null
      }
    }
    this.state = new LociState(this.getTopicIds(), this.getTopicIds())
    this.buildOrbs()
    this.ready = true
    print(`Loci ready: ${this.orbs.size} topics, ${this.data.thoughts.length} thoughts, world query ${this.hitSession ? "on" : "off"}.`)
    this.onPalaceLoaded.invoke()
  }

  private anchorPalaceToUser(): void {
    const cam = this.camT!.getWorldPosition()
    const fwd = this.camT!.getWorldRotation().multiplyVec3(new vec3(0, 0, -1))
    const yaw = Math.atan2(-fwd.x, -fwd.z)
    const t = this.palaceRoot.getTransform()
    t.setWorldPosition(new vec3(cam.x, cam.y - this.eyeHeightCm, cam.z))
    t.setWorldRotation(quat.angleAxis(yaw, vec3.up()))
    this.orbsRoot.getTransform().setLocalPosition(new vec3(0, this.eyeHeightCm - this.orbBelowEyeCm, 0))
  }

  private buildOrbs(): void {
    const n = this.data.topics.length
    const r = this.orbDiameterCm / 2
    const span = Math.min(this.orbArcSpanDeg, 12 * Math.max(1, n - 1))
    this.data.topics.forEach((topic, i) => {
      const a = n > 1 ? (-span / 2 + (i * span) / (n - 1)) * DEG : 0
      const obj = global.scene.createSceneObject(`Orb_${topic.id}`)
      obj.setParent(this.orbsRoot)
      obj.getTransform().setLocalPosition(new vec3(Math.sin(a) * this.orbArcRadiusCm, 0, -Math.cos(a) * this.orbArcRadiusCm))
      const visual = global.scene.createSceneObject("Visual")
      visual.setParent(obj)
      const mat = this.makeMat(this.orbColor)
      this.addMesh(visual, sphereMesh(r * 0.5, 24, 16), mat)
      const halo = this.makeHalo(obj, r * 2.6, this.orbColor)
      this.addSphereCollider(obj, r * 1.2)
      const interactable = obj.createComponent(Interactable.getTypeName()) as Interactable
      const manip = obj.createComponent(InteractableManipulation.getTypeName()) as InteractableManipulation
      manip.setCanRotate(false)
      manip.setCanScale(false)
      const entry: OrbEntry = {topic, obj, visual, mat, halo, home: obj.getTransform().getWorldPosition(), flying: false}
      this.orbs.set(topic.id, entry)
      this.labels.addLabel(`orb:${topic.id}`, "orb", obj, topic.name, new vec3(0, r + 1.2, 0), this.orbLabelCapCm)
      interactable.onHoverEnter.add(() => this.setHover(visual, mat, this.orbColor, true))
      interactable.onHoverExit.add(() => this.setHover(visual, mat, this.orbColor, false))
      manip.onManipulationEnd.add(() => this.onOrbDropped(entry))
    })
  }

  // =================== Place ===================

  private onOrbDropped(orb: OrbEntry): void {
    if (this.state.mode !== "place" || this.state.spotOf(orb.topic.id) || orb.flying) return
    const p = orb.obj.getTransform().getWorldPosition()
    if (p.distance(orb.home) < this.minDragCm) { this.flyHome(orb); return }
    this.releaseOrb(orb, p)
  }

  /** Aim-and-release: find where the line of sight through `through` meets the room, then fly there. */
  private releaseOrb(orb: OrbEntry, through: vec3): void {
    if (this.state.mode !== "place" || this.state.spotOf(orb.topic.id) || orb.flying) return
    orb.flying = true // busy until it lands or flies home (every path below ends in fly())
    const cam = this.camT!.getWorldPosition()
    const dir = through.sub(cam).normalize()
    const fallback = this.clampToRoom(cam.add(dir.uniformScale(this.placeDistanceCm)))
    const land = (target: vec3) => {
      if (this.orbs.get(orb.topic.id) !== orb) return // the palace was swapped meanwhile
      const reason = this.rejectReason(orb.topic.id, target)
      if (reason) {
        print(`Loci: ${orb.topic.id} not placed: ${reason}.`)
        this.onPlaceRejected.invoke({topicId: orb.topic.id, reason})
        this.flyHome(orb)
        return
      }
      // Another orb may have taken this place while we flew: never leave it hanging, send it home.
      this.fly(orb, target, () => { if (!this.placeTopicAt(orb.topic.id, target)) this.flyHome(orb) })
    }
    if (!this.hitSession) { land(fallback); return }
    let answered = false
    // World Query answers at ~5 Hz and may not answer at all; never leave the orb hanging.
    const timeout = this.createEvent("DelayedCallbackEvent")
    timeout.bind(() => {
      if (answered) return
      answered = true
      land(fallback)
    })
    timeout.reset(0.4)
    this.hitSession.hitTest(cam, cam.add(dir.uniformScale(400)), (r) => {
      if (answered) return
      answered = true
      const d = r ? r.position.distance(cam) : 0
      // A real surface 50–400 cm away: sit just in front of it. Otherwise use the fallback distance.
      land(r && d > 50 && d < 400 ? this.clampToRoom(r.position.add(r.normal.uniformScale(3))) : fallback)
    })
  }

  /** Why a topic can't anchor at `p`, or null if it can. */
  private rejectReason(topicId: string, p: vec3): string | null {
    if (this.state.spotOf(topicId)) return "already placed"
    const cam = this.camT ? this.camT.getWorldPosition() : vec3.zero()
    const dir = p.sub(cam).normalize()
    let reason: string | null = null
    this.anchors.forEach((a) => {
      if (reason) return
      const other = this.getClusterCentreWorld(a.id)!.sub(cam).normalize()
      const ang = Math.acos(Math.max(-1, Math.min(1, dir.dot(other)))) / DEG
      if (ang < this.minSeparationDeg) {
        const t = this.getTopic(a.id)
        reason = `Too close to ${t ? t.name : a.id}`
      }
    })
    // Orbs still flying to a place count too, so two quick releases can't pick the same spot.
    this.flights.forEach((f) => {
      if (reason || f.orb.topic.id === topicId || f.to.distance(f.orb.home) < 0.01) return
      const ang = Math.acos(Math.max(-1, Math.min(1, dir.dot(f.to.sub(cam).normalize())))) / DEG
      if (ang < this.minSeparationDeg) reason = `Too close to ${f.orb.topic.name}`
    })
    return reason
  }

  /** Keep anchors above the floor and below the ceiling of a normal room. */
  private clampToRoom(p: vec3): vec3 {
    const floor = this.palaceRoot.getTransform().getWorldPosition().y
    return new vec3(p.x, Math.max(floor + 30, Math.min(floor + 220, p.y)), p.z)
  }

  private fly(orb: OrbEntry, to: vec3, done: () => void): void {
    orb.flying = true
    const from = orb.obj.getTransform().getWorldPosition()
    this.flights.push({orb, from, to, t: 0, dur: Math.min(0.9, 0.25 + from.distance(to) / 400), done})
  }

  private flyHome(orb: OrbEntry): void {
    this.fly(orb, orb.home, () => { orb.flying = false })
  }

  private updateFlights(dt: number): void {
    if (this.flights.length === 0) return
    const still: Flight[] = []
    const landed: Flight[] = []
    for (const f of this.flights) {
      f.t += dt
      const k = Math.min(1, f.t / f.dur)
      const e = 1 - Math.pow(1 - k, 3)
      const p = vec3.lerp(f.from, f.to, e).add(new vec3(0, Math.sin(Math.PI * k) * f.from.distance(f.to) * 0.12, 0))
      f.orb.obj.getTransform().setWorldPosition(p)
      if (k < 1) still.push(f)
      else landed.push(f)
    }
    this.flights = still
    // After the list is replaced, so a done() that starts a new flight (fly home) keeps it.
    landed.forEach((f) => { f.orb.flying = false; f.done() })
  }

  private anchorVisuals(topicId: string, point: vec3): void {
    const orb = this.orbs.get(topicId)!
    orb.obj.enabled = false
    orb.flying = false
    const obj = global.scene.createSceneObject(`Spot_${topicId}`)
    obj.setParent(this.palaceRoot)
    obj.getTransform().setWorldPosition(point)
    const cam = this.camT ? this.camT.getWorldPosition() : vec3.zero()
    const yaw = Math.atan2(cam.x - point.x, cam.z - point.z)
    obj.getTransform().setWorldRotation(quat.angleAxis(yaw, vec3.up()))

    const dot = global.scene.createSceneObject(`Dot_${topicId}`)
    dot.setParent(obj)
    dot.getTransform().setLocalPosition(new vec3(0, this.clusterLiftCm, 0))
    this.addMesh(dot, sphereMesh(this.dotDiameterCm / 2, 12, 8), this.makeMat(this.dotColor))
    const dotHalo = this.makeHalo(dot, this.dotDiameterCm * 4, this.dotColor)

    const anchor: AnchorEntry = {id: topicId, obj, dot, dotHalo, cluster: null, openT: 1}
    this.anchors.set(topicId, anchor)
    const topic = orb.topic
    this.labels.addLabel(`spot:${topicId}`, "spot", obj, topic.name, this.closedLabelOffset(), this.spotLabelCapCm)
    anchor.cluster = this.buildCluster(topic, anchor)
    anchor.cluster.enabled = false
    this.onTopicPlaced.invoke({topicId, spot: topicId})
    print(`Loci: placed ${topicId} (${this.state.placedCount()}/${this.data.topics.length}).`)
    if (this.state.allPlaced()) this.setMode("explore")
  }

  private closedLabelOffset(): vec3 {
    return new vec3(0, this.clusterLiftCm + this.dotDiameterCm / 2 + 2, 0)
  }

  private buildCluster(topic: Topic, a: AnchorEntry): SceneObject {
    const cluster = global.scene.createSceneObject(`Cluster_${a.id}`)
    cluster.setParent(a.obj)
    cluster.getTransform().setLocalPosition(new vec3(0, this.clusterLiftCm, 0))
    const r = this.starSizeCm / 2
    const cam = this.camT ? this.camT.getWorldPosition() : vec3.zero()
    const distM = a.obj.getTransform().getWorldPosition().distance(cam) / 100
    const labelCap = this.starLabelCapCm * Math.min(1, distM / 2.5)
    for (const thought of this.data.thoughts.filter((t) => t.topic === topic.id)) {
      const obj = global.scene.createSceneObject(`Star_${thought.id}`)
      obj.setParent(cluster)
      obj.getTransform().setLocalPosition(new vec3(thought.offset[0], thought.offset[1], thought.offset[2]))
      const visual = global.scene.createSceneObject("Visual")
      visual.setParent(obj)
      const color = this.kindColor(thought.kind)
      const mat = this.makeMat(color)
      const mesh = thought.kind === "decision" ? starMesh(r, 0.6)
        : thought.kind === "insight" ? ringMesh(r, r * 0.6, 0.5)
          : sphereMesh(r * 0.7, 14, 10)
      this.addMesh(visual, mesh, mat)
      const halo = this.makeHalo(obj, this.starHaloCm, color)
      this.addSphereCollider(obj, this.starTargetRadiusCm)
      const interactable = obj.createComponent(Interactable.getTypeName()) as Interactable
      const star: StarEntry = {thought, obj, visual, mat, halo, baseColor: color, hovered: false}
      this.stars.set(thought.id, star)
      const side = thought.offset[0] > 3 ? "left" : thought.offset[0] < -3 ? "right" : "center"
      const labelPos = side === "left" ? new vec3(r + 1.2, 0, 0) : side === "right" ? new vec3(-(r + 1.2), 0, 0) : new vec3(0, r + 1, 0)
      this.labels.addLabel(`star:${thought.id}`, "star", obj, thought.label, labelPos, labelCap, side === "center", side)
      interactable.onHoverEnter.add(() => { star.hovered = true; this.applyStarLook(star) })
      interactable.onHoverExit.add(() => { star.hovered = false; this.applyStarLook(star) })
      interactable.onTriggerEnd.add(() => this.toggleCard(thought.id))
    }
    return cluster
  }

  // =================== threads ===================

  private threadCountShown = 0

  /** Faint glowing lines from the open topic's stars to the related topics' anchors. */
  private buildThreads(spot: string): void {
    this.clearThreads()
    if (!this.showThreads) return
    const topic = this.state.topicAt(spot)
    const segs: [vec3, vec3][] = []
    // The cluster is still tiny (it blooms from 1%), so read star positions at full size.
    const cluster = this.anchors.get(spot)?.cluster ?? null
    const ct = cluster ? cluster.getTransform() : null
    const bloomScale = ct ? ct.getLocalScale() : null
    if (ct) ct.setLocalScale(vec3.one())
    for (const th of this.data.threads) {
      const from = this.data.thoughts.filter((t) => t.id === th.from)[0]
      const to = this.data.thoughts.filter((t) => t.id === th.to)[0]
      if (!from || !to) continue
      let mine: Thought | null = null
      let other: Thought | null = null
      if (from.topic === topic) { mine = from; other = to } else if (to.topic === topic) { mine = to; other = from }
      if (!mine || !other || !this.state.spotOf(other.topic)) continue
      const star = this.stars.get(mine.id)
      const end = this.getClusterCentreWorld(other.topic)
      if (!star || !end) continue
      segs.push([star.obj.getTransform().getWorldPosition(), end])
    }
    if (ct && bloomScale) ct.setLocalScale(bloomScale)
    this.threadCountShown = segs.length
    this.threadSegs = segs
    if (segs.length === 0) return
    const obj = global.scene.createSceneObject("Threads")
    obj.setParent(this.palaceRoot)
    // Lines are built in world space under a root with identity world transform.
    obj.getTransform().setWorldPosition(vec3.zero())
    obj.getTransform().setWorldRotation(quat.quatIdentity())
    obj.getTransform().setWorldScale(vec3.one())
    const mat = this.glowMaterial.clone()
    // Normal alpha blend (not Add): the preview composites by alpha, and Add writes none.
    mat.mainPass.baseColor = this.threadColor
    mat.mainPass.blendMode = BlendMode.Normal
    mat.mainPass.depthWrite = false
    mat.mainPass.twoSided = true
    this.addMesh(obj, linesMesh(segs, 0.1), mat)
    this.threadsObj = obj
  }

  private clearThreads(): void {
    if (this.threadsObj && !isNull(this.threadsObj)) this.threadsObj.destroy()
    this.threadsObj = null
    this.threadCountShown = 0
  }

  // =================== per frame ===================

  private update(): void {
    if (!this.ready || !this.camT) return
    const dt = getDeltaTime()
    this.updateFlights(dt)
    this.animate(dt)
    if (this.state.mode === "place") return // gaze opens topics in Explore and Recall
    const cam = this.camT.getWorldPosition()
    const gaze = this.camT.getWorldRotation().multiplyVec3(new vec3(0, 0, -1))

    let candidate: string | null = null
    let candAngle = Number.MAX_VALUE
    let openAngle = Number.MAX_VALUE
    this.anchors.forEach((a) => {
      const c = this.getClusterCentreWorld(a.id)!
      const ang = Math.acos(Math.max(-1, Math.min(1, gaze.dot(c.sub(cam).normalize())))) / DEG
      if (a.id === this.state.openSpot) openAngle = ang
      if (ang < this.gazeOpenConeDeg && ang < candAngle) { candAngle = ang; candidate = a.id }
    })

    if (candidate !== null && candidate !== this.state.openSpot) {
      if (this.dwellSpot !== candidate) { this.dwellSpot = candidate; this.dwellTime = 0 }
      this.dwellTime += dt
      if (this.dwellTime >= this.openDwellSec) {
        this.dwellSpot = null
        this.dwellTime = 0
        this.openSpot(candidate)
        return
      }
    } else {
      this.dwellSpot = null
      this.dwellTime = 0
    }

    if (this.state.openSpot !== null) {
      if (openAngle < this.gazeHoldConeDeg) this.awayTime = 0
      else {
        this.awayTime += dt
        if (this.awayTime >= this.closeAwaySec) this.closeCluster()
      }
    }
  }

  /** Halos face the user and breathe; stars twinkle; clusters bloom; orbs bob; dwell brightens a dot. */
  private animate(dt: number): void {
    const t = getTime()
    const cam = this.camT!.getWorldPosition()
    this.orbs.forEach((o) => {
      if (!o.obj.enabled) return
      o.visual.getTransform().setLocalPosition(new vec3(0, Math.sin(t * 1.6 + o.halo.phase) * 0.8, 0))
      this.faceHalo(o.halo, cam, 1 + 0.06 * Math.sin(t * 1.6 + o.halo.phase))
    })
    this.anchors.forEach((a) => {
      if (a.dot.enabled) {
        const dwell = this.dwellSpot === a.id ? Math.min(1, this.dwellTime / this.openDwellSec) : 0
        this.faceHalo(a.dotHalo, cam, (1 + 0.15 * Math.sin(t * 1.2 + a.dotHalo.phase)) * (1 + dwell * 1.2))
      }
      if (a.cluster && a.cluster.enabled && a.openT < 1) {
        a.openT = Math.min(1, a.openT + dt / this.bloomSec)
        const k = a.openT
        const s = 1 + 2.2 * Math.pow(k - 1, 3) + 1.2 * Math.pow(k - 1, 2) // ease-out-back
        a.cluster.getTransform().setLocalScale(vec3.one().uniformScale(Math.max(0.01, s)))
      }
    })
    const open = this.state.openSpot
    if (!open) return
    this.stars.forEach((star) => {
      if (this.state.spotOf(star.thought.topic) !== open) return
      const st = this.state.starState(star.thought.id)
      const tw = 1 + 0.12 * Math.sin(t * 2.3 + star.halo.phase) + 0.05 * Math.sin(t * 5.1 + star.halo.phase * 2)
      const hk = st === "highlight" ? 1.8 : st === "dim" ? 0.55 : 1
      this.faceHalo(star.halo, cam, tw * hk * (star.hovered ? 1.3 : 1))
      if (star.thought.kind === "question") {
        const s = 1 + 0.25 * Math.sin((2 * Math.PI * t) / this.pulsePeriodSec)
        star.visual.getTransform().setLocalScale(vec3.one().uniformScale(s * (star.hovered ? 1.3 : 1) * this.highlightScale(star)))
      }
    })
  }

  private faceHalo(h: Halo, cam: vec3, scale: number): void {
    const tr = h.obj.getTransform()
    const p = tr.getWorldPosition()
    const to = cam.sub(p)
    if (to.length < 0.001) return
    tr.setWorldRotation(quat.lookAt(to.normalize(), vec3.up()))
    tr.setLocalScale(vec3.one().uniformScale(scale))
  }

  // =================== looks ===================

  private applyStarLook(star: StarEntry): void {
    const st = this.state.starState(star.thought.id)
    const k = st === "dim" ? 0.35 : st === "highlight" ? 1.25 : 1
    const hover = star.hovered ? 1.2 : 1
    const c = star.baseColor
    star.mat.mainPass.baseColor = new vec4(Math.min(1, c.x * k * hover), Math.min(1, c.y * k * hover), Math.min(1, c.z * k * hover), c.w * (st === "dim" ? 0.6 : 1))
    const hc = star.halo.color
    const ha = st === "dim" ? 0.3 : st === "highlight" ? 1 : 0.75
    star.halo.mat.mainPass.baseColor = new vec4(hc.x, hc.y, hc.z, HALO_ALPHA * ha / 0.75)
    if (star.thought.kind !== "question") star.visual.getTransform().setLocalScale(vec3.one().uniformScale((star.hovered ? 1.3 : 1) * this.highlightScale(star)))
  }

  /** The star being asked in Recall grows so it stands out from its neighbours. */
  private highlightScale(star: StarEntry): number {
    return this.state.starState(star.thought.id) === "highlight" ? 1.7 : 1
  }

  private setHover(visual: SceneObject, mat: Material, base: vec4, on: boolean): void {
    visual.getTransform().setLocalScale(vec3.one().uniformScale(on ? 1.25 : 1))
    const k = on ? 1.25 : 1
    mat.mainPass.baseColor = new vec4(Math.min(1, base.x * k), Math.min(1, base.y * k), Math.min(1, base.z * k), base.w)
  }

  private kindColor(kind: string): vec4 {
    return kind === "decision" ? this.decisionColor : kind === "insight" ? this.insightColor : this.questionColor
  }

  private makeMat(color: vec4): Material {
    const m = this.glowMaterial.clone()
    m.mainPass.baseColor = color
    m.mainPass.blendMode = BlendMode.Normal
    m.mainPass.twoSided = true
    return m
  }

  /**
   * A soft glow around `parent`: five nested translucent spheres sharing one material, so the
   * overlap fades from a bright centre to a faint edge. Alpha-blended (not additive), so it shows
   * in Lens Studio's preview, which composites by alpha, as well as on Specs.
   */
  private makeHalo(parent: SceneObject, size: number, color: vec4): Halo {
    const obj = global.scene.createSceneObject("Halo")
    obj.setParent(parent)
    const mat = this.glowMaterial.clone()
    mat.mainPass.baseColor = new vec4(color.x, color.y, color.z, HALO_ALPHA)
    mat.mainPass.blendMode = BlendMode.Normal
    mat.mainPass.depthWrite = false
    for (const k of [0.13, 0.19, 0.27, 0.37, 0.5]) {
      const layer = global.scene.createSceneObject("HaloLayer")
      layer.setParent(obj)
      this.addMesh(layer, sphereMesh(size * k, 28, 18), mat)
    }
    return {obj, mat, size, color, phase: Math.random() * Math.PI * 2}
  }

  private addMesh(obj: SceneObject, mesh: RenderMesh, mat: Material): void {
    const rmv = obj.createComponent("Component.RenderMeshVisual") as RenderMeshVisual
    rmv.mesh = mesh
    rmv.mainMaterial = mat
  }

  private addSphereCollider(obj: SceneObject, radius: number): void {
    const col = obj.createComponent("Physics.ColliderComponent") as ColliderComponent
    const shape = Shape.createSphereShape()
    shape.radius = radius
    col.shape = shape
    col.fitVisual = false
  }
}
