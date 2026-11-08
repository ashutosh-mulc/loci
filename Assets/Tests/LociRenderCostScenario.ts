// Review #9 and #10 (performance): halos must be cheap (a few hundred triangles, not five
// nested 1000-triangle spheres each), and solid star/orb meshes must not draw their hidden
// inside faces (single-sided).

import {Scenario} from "Leaf.lspkg/Scenarios/scenario/Scenario"
import {expect} from "Leaf.lspkg/Utils/common/Expect"
import {sleep} from "Leaf.lspkg/Utils/common/Utils"
import {GazeDriver, ensureExplore, getLoci, topicId, waitForReady} from "./LociLeafCommon"

@component
export class LociRenderCostScenario extends Scenario {
  async run(): Promise<void> {
    await sleep(1500)
    const loci = getLoci()
    await waitForReady(loci)
    const gaze = new GazeDriver(this, loci)
    gaze.lookAway()
    await ensureExplore(loci)
    gaze.lookAt(loci.getClusterCentreWorld(topicId(1)))
    await sleep(1200)
    expect(loci.isOpen(topicId(1))).toBe(true)

    const tris = loci.getHaloTrianglesEach()
    const star = loci.thoughtsAt(topicId(1))[0].id
    print(`[LociRenderCost] halo triangles each: ${tris.toFixed(0)}, star two-sided: ${loci.isStarTwoSided(star)}`)
    expect(tris).toBeLessThan(400)
    expect(loci.isStarTwoSided(star)).toBe(false)

    gaze.lookAway()
    await sleep(2400)
    gaze.lookAt(null)
  }
}
