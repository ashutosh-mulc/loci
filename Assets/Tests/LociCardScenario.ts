// Criterion 3: pinching a star shows its one-line card beside it; pinching again hides it.
// Also checks one card at a time and that the card closes with its cluster.

import {Scenario} from "Leaf.lspkg/Scenarios/scenario/Scenario"
import {expect} from "Leaf.lspkg/Utils/common/Expect"
import {sleep} from "Leaf.lspkg/Utils/common/Utils"
import {DefaultLeafInteractor} from "Leaf.lspkg/Interactors/interactor/DefaultLeafInteractor"
import {findInteractableByName} from "Leaf.lspkg/Interactors/InteractableUtils"
import {GazeDriver, ensureExplore, getLoci, topicId, waitForReady} from "./LociLeafCommon"

@component
export class LociCardScenario extends Scenario {
  async run(): Promise<void> {
    await sleep(1500)
    const loci = getLoci()
    await waitForReady(loci)
    const gaze = new GazeDriver(this, loci)
    gaze.lookAway()
    await ensureExplore(loci)

    gaze.lookAt(loci.getClusterCentreWorld(topicId(1)))
    await sleep(900)
    expect(loci.isOpen(topicId(1))).toBe(true)

    const [a, b] = loci.thoughtsAt(topicId(1))
    const interactor = new DefaultLeafInteractor()
    const starA = findInteractableByName(`Star_${a.id}`, undefined, true)
    const starB = findInteractableByName(`Star_${b.id}`, undefined, true)
    expect(starA !== undefined && starB !== undefined).toBe(true)

    // Pinch A: its card shows, with its sentence and source/date, beside the star.
    await interactor.trigger(starA!)
    await sleep(300)
    expect(loci.getOpenCardId()).toBe(a.id)
    expect(loci.isCardShown()).toBe(true)
    expect(loci.card.getSentence()).toBe(a.text)
    expect(loci.card.getMeta().includes(a.source)).toBe(true)
    expect(loci.card.getMeta().includes(a.date)).toBe(true)
    const starPos = loci.getStarObject(a.id)!.getTransform().getWorldPosition()
    const cardPos = loci.card.getSceneObject().getTransform().getWorldPosition()
    expect(starPos.distance(cardPos)).toBeLessThan(25)

    // Pinch A again: hidden.
    await interactor.trigger(starA!)
    await sleep(300)
    expect(loci.getOpenCardId()).toBeNull()
    expect(loci.isCardShown()).toBe(false)

    // One card at a time: A then B leaves only B.
    await interactor.trigger(starA!)
    await sleep(200)
    await interactor.trigger(starB!)
    await sleep(300)
    expect(loci.getOpenCardId()).toBe(b.id)
    expect(loci.card.getSentence()).toBe(b.text)

    // The card closes with its cluster.
    gaze.lookAway()
    await sleep(2400)
    expect(loci.getOpenSpot()).toBeNull()
    expect(loci.isCardShown()).toBe(false)
    gaze.lookAt(null)
  }
}
