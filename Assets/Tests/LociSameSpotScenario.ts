// Review item A: two topics released toward the same place before either lands.
// Exactly one anchors; the other must fly back home, never hang in mid-air.

import {Scenario} from "Leaf.lspkg/Scenarios/scenario/Scenario"
import {expect} from "Leaf.lspkg/Utils/common/Expect"
import {nextFrame, sleep} from "Leaf.lspkg/Utils/common/Utils"
import {PALACE} from "../Scripts/PalaceData"
import {getLoci, waitForReady} from "./LociLeafCommon"

@component
export class LociSameSpotScenario extends Scenario {
  async run(): Promise<void> {
    await sleep(1500)
    const loci = getLoci()
    await waitForReady(loci)
    loci.resetPalace()
    await nextFrame()
    expect(loci.getMode()).toBe("place")

    const a = PALACE.topics[0].id
    const b = PALACE.topics[2].id
    const homeA = loci.getOrbObject(a)!.getTransform().getWorldPosition()
    const homeB = loci.getOrbObject(b)!.getTransform().getWorldPosition()
    const aim = loci.suggestedPoint(a)

    // Same frame, same place: both are released before either lands.
    loci.aimAndRelease(a, aim)
    loci.aimAndRelease(b, aim)
    await sleep(2500) // timeout + flight there + flight home

    const placedA = loci.getPlacedSpot(a) !== null
    const placedB = loci.getPlacedSpot(b) !== null
    print(`[LociSameSpot] placed a=${placedA} b=${placedB}`)
    expect(loci.placedCount()).toBe(1)
    const loser = placedA ? b : a
    const loserHome = placedA ? homeB : homeA
    const d = loci.getOrbObject(loser)!.getTransform().getWorldPosition().distance(loserHome)
    print(`[LociSameSpot] refused orb is ${d.toFixed(1)} cm from home`)
    expect(d).toBeLessThan(2)

    loci.resetPalace()
    await nextFrame()
  }
}
