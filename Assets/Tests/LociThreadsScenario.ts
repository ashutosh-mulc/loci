// Review item #1: a thread must start at its star (where the star sits once the cluster has
// bloomed), not at the cluster centre.

import {Scenario} from "Leaf.lspkg/Scenarios/scenario/Scenario"
import {expect} from "Leaf.lspkg/Utils/common/Expect"
import {sleep} from "Leaf.lspkg/Utils/common/Utils"
import {PALACE} from "../Scripts/PalaceData"
import {GazeDriver, ensureExplore, getLoci, waitForReady} from "./LociLeafCommon"

@component
export class LociThreadsScenario extends Scenario {
  async run(): Promise<void> {
    await sleep(1500)
    const loci = getLoci()
    await waitForReady(loci)
    const gaze = new GazeDriver(this, loci)
    gaze.lookAway()
    await ensureExplore(loci)

    // A topic that owns a thread end.
    const ids = new Set<string>()
    PALACE.threads.forEach((th) => { ids.add(th.from); ids.add(th.to) })
    const topic = PALACE.thoughts.filter((t) => ids.has(t.id))[0].topic
    gaze.lookAt(loci.getClusterCentreWorld(topic))
    await sleep(1600) // dwell + full bloom
    expect(loci.isOpen(topic)).toBe(true)
    const segs = loci.getThreadSegments()
    expect(segs.length).toBeGreaterThan(0)

    // Same order as the controller builds them: each thread of this topic, from its own star.
    const mine: string[] = []
    for (const th of PALACE.threads) {
      const from = PALACE.thoughts.filter((t) => t.id === th.from)[0]
      const to = PALACE.thoughts.filter((t) => t.id === th.to)[0]
      if (from.topic === topic) mine.push(from.id)
      else if (to.topic === topic) mine.push(to.id)
    }
    expect(segs.length).toBe(mine.length)
    let worst = 0
    segs.forEach(([start], i) => {
      const star = loci.getStarObject(mine[i])!.getTransform().getWorldPosition()
      worst = Math.max(worst, star.distance(start))
    })
    print(`[LociThreads] ${segs.length} threads, worst start-to-star distance ${worst.toFixed(2)} cm`)
    expect(worst).toBeLessThan(1)

    gaze.lookAway()
    await sleep(2400)
    gaze.lookAt(null)
  }
}
