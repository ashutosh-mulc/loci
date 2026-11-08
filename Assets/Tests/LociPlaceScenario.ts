// Criterion 1 (any room): dragging a topic orb toward a place and letting go anchors it there
// and shows its name. Grabs a real orb with the LEAF SIK interactor, drags it, releases, and
// checks it flew along the user's line of sight and anchored. Also: a topic aimed too close to
// another is refused and flies home; placing every topic starts Explore.

import {Scenario} from "Leaf.lspkg/Scenarios/scenario/Scenario"
import {expect} from "Leaf.lspkg/Utils/common/Expect"
import {nextFrame, sleep} from "Leaf.lspkg/Utils/common/Utils"
import {DefaultLeafInteractor} from "Leaf.lspkg/Interactors/interactor/DefaultLeafInteractor"
import {findInteractableByName} from "Leaf.lspkg/Interactors/InteractableUtils"
import WorldCameraFinderProvider from "SpectaclesInteractionKit.lspkg/Providers/CameraProvider/WorldCameraFinderProvider"
import {PALACE} from "../Scripts/PalaceData"
import {getLoci, waitForReady} from "./LociLeafCommon"

@component
export class LociPlaceScenario extends Scenario {
  async run(): Promise<void> {
    await sleep(1500)
    const loci = getLoci()
    await waitForReady(loci)
    loci.resetPalace()
    await nextFrame()
    expect(loci.getMode()).toBe("place")

    const cam = WorldCameraFinderProvider.getInstance().getComponent().getTransform()
    const topic = PALACE.topics[1]
    const orbObj = loci.getOrbObject(topic.id)!
    const home = orbObj.getTransform().getWorldPosition()
    const orb = findInteractableByName(`Orb_${topic.id}`, undefined, true)
    expect(orb !== undefined).toBe(true)
    const interactor = new DefaultLeafInteractor()

    // Real SIK grab, drag up and to the left, release. Retry with a bigger drag if it was too short.
    let releasePoint = home
    for (let attempt = 0; attempt < 4 && loci.getPlacedSpot(topic.id) === null; attempt++) {
      const k = Math.pow(2, attempt)
      await interactor.drag(orb!, new vec3(-0.4 * k, 0.3 * k, 0), 500)
      releasePoint = orbObj.getTransform().getWorldPosition()
      await sleep(1300) // flight
      print(`[LociPlace] attempt ${attempt}: released ${releasePoint.distance(home).toFixed(1)} cm from home`)
    }

    expect(loci.getPlacedSpot(topic.id)).toBe(topic.id)
    expect(loci.isAnchored(topic.id)).toBe(true)
    expect(orbObj.isEnabledInHierarchy).toBe(false) // the orb became the anchor
    expect(loci.getDotObject(topic.id)!.isEnabledInHierarchy).toBe(true) // glowing dot
    expect(loci.labels.getText(`spot:${topic.id}`)).toBe(topic.name) // its name
    expect(loci.labels.isShowing(`spot:${topic.id}`)).toBe(true)

    // It landed out in the room along the line of sight through the release point.
    const eye = cam.getWorldPosition()
    const anchor = loci.getSpotPointWorld(topic.id)!
    const aimDir = releasePoint.sub(eye).normalize()
    const landDir = anchor.sub(eye).normalize()
    const offAngle = Math.acos(Math.max(-1, Math.min(1, aimDir.dot(landDir)))) * 180 / Math.PI
    print(`[LociPlace] anchor ${anchor.distance(eye).toFixed(0)} cm away, ${offAngle.toFixed(1)} deg off the aim line`)
    expect(anchor.distance(eye)).toBeGreaterThan(100)
    expect(offAngle).toBeLessThan(10)

    // Aiming another topic right next to it is refused, and that orb flies home.
    const other = PALACE.topics[0]
    let rejected = ""
    loci.onPlaceRejected.add((e) => { if (e.topicId === other.id) rejected = e.reason })
    loci.aimAndRelease(other.id, anchor)
    await sleep(1300)
    expect(loci.getPlacedSpot(other.id)).toBeNull()
    expect(rejected.includes(topic.name)).toBe(true)
    expect(loci.getOrbObject(other.id)!.isEnabledInHierarchy).toBe(true)

    // Placing every other topic starts Explore automatically.
    expect(loci.getMode()).toBe("place")
    PALACE.topics.filter((t) => t.id !== topic.id).forEach((t) => {
      expect(loci.placeTopic(t.id)).toBe(true)
    })
    expect(loci.getMode()).toBe("explore")
  }
}
