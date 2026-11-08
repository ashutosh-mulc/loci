// Criterion 2: looking at an anchored spot for 0.6 s opens its cluster; looking away for
// 2 s closes it; only one cluster is open at a time. Drives the head (world camera).

import {Scenario} from "Leaf.lspkg/Scenarios/scenario/Scenario"
import {expect} from "Leaf.lspkg/Utils/common/Expect"
import {sleep} from "Leaf.lspkg/Utils/common/Utils"
import {GazeDriver, ensureExplore, getLoci, topicId, waitForReady} from "./LociLeafCommon"

@component
export class LociExploreScenario extends Scenario {
  async run(): Promise<void> {
    await sleep(1500)
    const loci = getLoci()
    await waitForReady(loci)
    const gaze = new GazeDriver(this, loci)
    gaze.lookAway()
    await ensureExplore(loci)
    await sleep(300)
    expect(loci.getOpenSpot()).toBeNull()

    // Dwell: not open at 0.3 s, open by 0.9 s.
    gaze.lookAt(loci.getClusterCentreWorld(topicId(1)))
    await sleep(300)
    expect(loci.isOpen(topicId(1))).toBe(false)
    await sleep(600)
    expect(loci.isOpen(topicId(1))).toBe(true)
    expect(loci.getStarObject(loci.thoughtsAt(topicId(1))[0].id)!.isEnabledInHierarchy).toBe(true)

    // Turning to another spot opens it and closes the first: one at a time.
    gaze.lookAt(loci.getClusterCentreWorld(topicId(2)))
    await sleep(900)
    expect(loci.isOpen(topicId(2))).toBe(true)
    expect(loci.isOpen(topicId(1))).toBe(false)
    expect(loci.getDotObject(topicId(1))!.isEnabledInHierarchy).toBe(true) // back to a dim dot

    // Look away: still open after 1 s, closed after 2 s.
    gaze.lookAway()
    await sleep(1000)
    expect(loci.isOpen(topicId(2))).toBe(true)
    await sleep(1400)
    expect(loci.getOpenSpot()).toBeNull()

    // Walk all five spots; never more than one cluster visible on any frame.
    for (const spot of loci.getSpotIds()) {
      gaze.lookAt(loci.getClusterCentreWorld(spot))
      await sleep(900)
      expect(loci.getOpenSpot()).toBe(spot)
    }
    expect(gaze.maxOpenSeen).toBe(1)
    gaze.lookAt(null)
  }
}
