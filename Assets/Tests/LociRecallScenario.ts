// Criterion 5: in Recall, labels hide. Reveal shows the answer, marking it right dims that star,
// and the debrief shows the recalled count per topic.
// Drives the real UIKit buttons (Recall, Reveal, Right, Wrong) through SIK with LEAF's interactor,
// and head gaze through the world camera. Covers both debrief triggers: pinching Recall again,
// and every spot having been asked once ("Round done" + Go again).

import {Scenario} from "Leaf.lspkg/Scenarios/scenario/Scenario"
import {expect} from "Leaf.lspkg/Utils/common/Expect"
import {findSceneObjectByName, sleep} from "Leaf.lspkg/Utils/common/Utils"
import {DefaultLeafInteractor} from "Leaf.lspkg/Interactors/interactor/DefaultLeafInteractor"
import {findInteractableByName} from "Leaf.lspkg/Interactors/InteractableUtils"
import {PALACE} from "../Scripts/PalaceData"
import {LociRecall} from "../Scripts/LociRecall"
import {GazeDriver, ensureExplore, getLoci, topicId, waitForReady} from "./LociLeafCommon"

function getRecall(): LociRecall {
  const obj = findSceneObjectByName("Loci")
  const r = obj ? (obj.getComponent(LociRecall.getTypeName()) as LociRecall) : null
  if (!r) throw new Error("LociRecall not found on 'Loci'")
  return r
}

@component
export class LociRecallScenario extends Scenario {
  async run(): Promise<void> {
    await sleep(1500)
    const loci = getLoci()
    await waitForReady(loci)
    const recall = getRecall()
    const ui = recall.recallUI
    const gaze = new GazeDriver(this, loci)
    gaze.lookAway()
    await ensureExplore(loci)
    await sleep(300)

    const interactor = new DefaultLeafInteractor()
    const press = async (name: string) => {
      const it = findInteractableByName(name, undefined, true)
      if (!it) throw new Error(`Interactable ${name} not found`)
      await interactor.trigger(it)
      await sleep(300)
    }

    // The Recall button shows once everything is placed.
    expect(ui.isRecallButtonVisible()).toBe(true)
    expect(ui.getRecallButtonLabel()).toBe("Recall")

    // Pinch Recall: mode switches, star labels hide, button reads Explore.
    await press("RecallButton")
    expect(recall.isActive()).toBe(true)
    expect(loci.getMode()).toBe("recall")
    expect(loci.areStarLabelsVisible()).toBe(false)
    expect(ui.getRecallButtonLabel()).toBe("Explore")

    // Face the desk: it opens and asks one star's prompt, highlighting that star.
    gaze.lookAt(loci.getClusterCentreWorld(topicId(1)))
    await sleep(900)
    expect(loci.isOpen(topicId(1))).toBe(true)
    const desk = loci.thoughtsAt(topicId(1))
    const first = recall.getCurrentThoughtId()
    expect(first !== null).toBe(true)
    const q1 = desk.filter((t) => t.id === first)[0]
    expect(ui.getPanelMode()).toBe("question")
    expect(ui.getQuestionText()).toBe(q1.prompt)
    expect(loci.getStarState(q1.id)).toBe("highlight")
    expect(loci.isStarLabelShowing(q1.id)).toBe(false)
    expect(ui.isRevealShown()).toBe(true)
    // Cards stay shut in Recall (they would give the answer away).
    expect(loci.toggleCard(q1.id)).toBe(false)

    // Reveal shows the answer (the card text).
    await press("RevealButton")
    expect(recall.isRevealed()).toBe(true)
    expect(ui.getAnswerText()).toBe(q1.text)
    expect(ui.isRightWrongShown()).toBe(true)

    // Right dims that star as mastered, and the next star is asked.
    await press("RightButton")
    expect(loci.getStarState(q1.id)).toBe("dim")
    expect(recall.isMastered(q1.id)).toBe(true)
    expect(recall.getRecalledCount(q1.topic)).toBe(1)
    const second = recall.getCurrentThoughtId()
    expect(second !== null && second !== q1.id).toBe(true)

    // Wrong leaves it bright and moves on.
    await press("RevealButton")
    await press("WrongButton")
    expect(loci.getStarState(second!)).toBe("normal")
    expect(recall.getRecalledCount(q1.topic)).toBe(1)
    expect(recall.getCurrentThoughtId() !== second).toBe(true)

    // Pinch Recall ("Explore") again: debrief at this spot with the count per topic.
    await press("RecallButton")
    expect(recall.isDebriefShown()).toBe(true)
    expect(ui.getPanelMode()).toBe("debrief")
    // It shows right above the button, where the user is looking after pinching it.
    expect(ui.getPanelWorldPosition().distance(ui.getRecallButtonWorldPosition())).toBeLessThan(30)
    expect(ui.isPanelShown()).toBe(true)
    const deskTopic = PALACE.topics.filter((t) => t.id === q1.topic)[0]
    const debrief = ui.getDebriefText()
    for (const t of PALACE.topics) expect(debrief.includes(t.name)).toBe(true)
    expect(debrief.includes(`${deskTopic.name}  1/${desk.length}`)).toBe(true)
    expect(loci.getMode()).toBe("explore")
    expect(loci.areStarLabelsVisible()).toBe(true)
    expect(ui.getRecallButtonLabel()).toBe("Recall")

    // Second walk: answer Right once at every spot -> debrief appears by itself.
    await press("RecallButton")
    expect(recall.isActive()).toBe(true)
    expect(recall.isDebriefShown()).toBe(false)
    const spots = loci.getSpotIds()
    for (let i = 0; i < spots.length; i++) {
      gaze.lookAt(loci.getClusterCentreWorld(spots[i]))
      await sleep(900)
      expect(loci.isOpen(spots[i])).toBe(true)
      expect(loci.getOpenSpot()).toBe(spots[i])
      expect(ui.getPanelMode()).toBe("question")
      await press("RevealButton")
      await press("RightButton")
      if (i < spots.length - 1) expect(recall.isDebriefShown()).toBe(false)
    }
    // One round per topic (design decision, review #4): the round ends clearly, with "Round done",
    // the counts, and a Go again button that starts the next round right here.
    expect(recall.isDebriefShown()).toBe(true)
    expect(ui.getPanelMode()).toBe("roundDone")
    expect(ui.isGoAgainShown()).toBe(true)
    const full = ui.getDebriefText()
    expect(full.indexOf("Round done")).toBe(0)
    for (const t of PALACE.topics) {
      const n = PALACE.thoughts.filter((x) => x.topic === t.id).length
      expect(full.includes(`${t.name}  1/${n}`)).toBe(true)
    }
    // Go again: a new round, a fresh (not yet recalled) question at the open topic.
    await press("GoAgainButton")
    expect(recall.isActive()).toBe(true)
    expect(recall.isDebriefShown()).toBe(false)
    expect(ui.getPanelMode()).toBe("question")
    const next = recall.getCurrentThoughtId()
    expect(next !== null && !recall.isMastered(next!)).toBe(true)

    // Leave Recall so the palace is back in Explore for anything that runs after.
    await press("RecallButton")
    expect(loci.getMode()).toBe("explore")
    gaze.lookAway()
    await sleep(2400)
    gaze.lookAt(null)
  }
}
