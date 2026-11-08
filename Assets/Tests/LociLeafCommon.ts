// LociLeafCommon.ts
// Shared helpers for the Loci LEAF scenarios: find the controller, drive head gaze,
// and put the palace into Explore. Test-only; the Lens never imports this.

import {findSceneObjectByName, nextFrame, sleep} from "Leaf.lspkg/Utils/common/Utils"
import WorldCameraFinderProvider from "SpectaclesInteractionKit.lspkg/Providers/CameraProvider/WorldCameraFinderProvider"
import {PALACE} from "../Scripts/PalaceData"
import {LociPalaceController} from "../Scripts/LociPalaceController"

export function getLoci(): LociPalaceController {
  const obj = findSceneObjectByName("Loci")
  if (!obj) throw new Error("Scene object 'Loci' not found")
  const loci = obj.getComponent(LociPalaceController.getTypeName()) as LociPalaceController
  if (!loci) throw new Error("LociPalaceController not found on 'Loci'")
  return loci
}

export async function waitForReady(loci: LociPalaceController): Promise<void> {
  for (let i = 0; i < 300 && !loci.isReady(); i++) await nextFrame()
  if (!loci.isReady()) throw new Error("Loci never became ready")
}

/** Reset, then anchor every topic at its data spot so Explore starts. */
export async function ensureExplore(loci: LociPalaceController): Promise<void> {
  loci.resetPalace()
  await nextFrame()
  for (const t of PALACE.topics) {
    if (!loci.placeTopic(t.id)) throw new Error(`placeTopic(${t.id}) failed`)
  }
  await nextFrame()
  if (loci.getMode() !== "explore") throw new Error(`Expected explore, got ${loci.getMode()}`)
}

/** Topic ids in data order; topics[1] is the desk-height topic used by most scenarios. */
export function topicId(i: number): string { return PALACE.topics[i].id }

/** Count Cluster_* objects visible in the scene right now. */
export function countOpenClusters(loci: LociPalaceController): number {
  let n = 0
  for (const spot of loci.getSpotIds()) {
    const s = loci.getSpotObject(spot)
    if (!s) continue
    for (let i = 0; i < s.getChildrenCount(); i++) {
      const c = s.getChild(i)
      if (c.name.indexOf("Cluster_") === 0 && c.isEnabledInHierarchy) n++
    }
  }
  return n
}

/**
 * Drives head direction (the world camera) the way the user's head would, every frame,
 * and records the most clusters seen open on any single frame.
 */
export class GazeDriver {
  private target: vec3 | null = null
  private camT: Transform
  maxOpenSeen = 0

  constructor(owner: BaseScriptComponent, private loci: LociPalaceController) {
    this.camT = WorldCameraFinderProvider.getInstance().getComponent().getTransform()
    owner.createEvent("UpdateEvent").bind(() => this.tick())
    owner.createEvent("LateUpdateEvent").bind(() => this.tick())
  }

  lookAt(p: vec3 | null): void {
    this.target = p
    this.tick()
  }

  /** A point straight above the user: away from every spot. */
  lookAway(): void {
    this.lookAt(this.camT.getWorldPosition().add(new vec3(0, 400, -20)))
  }

  private tick(): void {
    this.maxOpenSeen = Math.max(this.maxOpenSeen, countOpenClusters(this.loci))
    if (!this.target) return
    const dir = this.target.sub(this.camT.getWorldPosition()).normalize()
    this.camT.setWorldRotation(quat.lookAt(dir.uniformScale(-1), vec3.up()))
  }
}

export async function waitSec(s: number): Promise<void> {
  await sleep(s * 1000)
}
