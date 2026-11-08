// Review item #6: the brief plans star labels at ~4 cm cap height (readable from 2.5 m), but
// eight of those would overlap in a ±20 cm cluster. So the star you aim at (gaze or hand hover)
// shows its label at the planned size; the others stay small.

import {Scenario} from "Leaf.lspkg/Scenarios/scenario/Scenario"
import {expect} from "Leaf.lspkg/Utils/common/Expect"
import {sleep} from "Leaf.lspkg/Utils/common/Utils"
import {GazeDriver, ensureExplore, getLoci, topicId, waitForReady} from "./LociLeafCommon"

@component
export class LociAimedLabelScenario extends Scenario {
  async run(): Promise<void> {
    await sleep(1500)
    const loci = getLoci()
    await waitForReady(loci)
    const gaze = new GazeDriver(this, loci)
    gaze.lookAway()
    await ensureExplore(loci)

    const topic = topicId(1)
    gaze.lookAt(loci.getClusterCentreWorld(topic))
    await sleep(1400)
    expect(loci.isOpen(topic)).toBe(true)

    // Aim at the star furthest from the centre (clearly not the default one).
    const stars = loci.thoughtsAt(topic)
    const far = stars.slice().sort((x, y) =>
      Math.hypot(y.offset[0], y.offset[1]) - Math.hypot(x.offset[0], x.offset[1]))[0]
    const other = stars.filter((t) => t.id !== far.id)[0]
    gaze.lookAt(loci.getStarObject(far.id)!.getTransform().getWorldPosition())
    await sleep(800)
    expect(loci.isOpen(topic)).toBe(true)
    print(`[LociAimedLabel] aimed=${loci.getAimedStar()} scale=${loci.getStarLabelScale(far.id).toFixed(2)} other=${loci.getStarLabelScale(other.id).toFixed(2)}`)
    expect(loci.getAimedStar()).toBe(far.id)
    expect(loci.getStarLabelScale(far.id)).toBeGreaterThan(2)
    expect(loci.getStarLabelScale(other.id)).toBeLessThan(1.1)

    // Aim back at the centre star's neighbour: the first label shrinks back.
    gaze.lookAt(loci.getStarObject(other.id)!.getTransform().getWorldPosition())
    await sleep(800)
    expect(loci.getStarLabelScale(far.id)).toBeLessThan(1.1)

    gaze.lookAway()
    await sleep(2400)
    gaze.lookAt(null)
  }
}
