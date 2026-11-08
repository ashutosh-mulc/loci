// TEMPORARY capture helper (not a done-criterion test): leaves the preview in Explore with one
// cluster open and a card showing, so a screenshot can be taken. Delete after capture.
import {Scenario} from "Leaf.lspkg/Scenarios/scenario/Scenario"
import {sleep} from "Leaf.lspkg/Utils/common/Utils"
import {GazeDriver, ensureExplore, getLoci, topicId, waitForReady} from "./LociLeafCommon"

@component
export class LociPoseShot extends Scenario {
  async run(): Promise<void> {
    await sleep(800)
    const loci = getLoci()
    await waitForReady(loci)
    const gaze = new GazeDriver(this, loci)
    gaze.lookAway()
    await ensureExplore(loci)
    gaze.lookAt(loci.getClusterCentreWorld(topicId(3))!.add(new vec3(-30, -5, 0)))
    await sleep(500)
    loci.openSpot(topicId(3))
    await sleep(800)
    loci.toggleCard(loci.thoughtsAt(topicId(3))[1].id)
    await sleep(400)
  }
}
