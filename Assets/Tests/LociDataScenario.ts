// Any data (new criterion 6): the palace comes from each user's data, not from code.
// (a) The validator keeps good entries and drops or repairs bad ones without throwing.
// (b) Loading another user's palace rebuilds orbs, stars, cards and Recall prompts from it.
// Restores the default palace (PalaceData.ts) at the end.

import {Scenario} from "Leaf.lspkg/Scenarios/scenario/Scenario"
import {expect} from "Leaf.lspkg/Utils/common/Expect"
import {findSceneObjectByName, nextFrame, sleep} from "Leaf.lspkg/Utils/common/Utils"
import {PALACE} from "../Scripts/PalaceData"
import {parsePalaceJson, validatePalace} from "../Scripts/LociPalaceSchema"
import {GazeDriver, getLoci, waitForReady} from "./LociLeafCommon"

const OTHER_USER = {
  topics: [
    {id: "kitchen", name: "Kitchen basics", spot: "desk"},
    {id: "spices", name: "Spice rules", spot: "shelf"},
    {id: "plans", name: "Meal plans", spot: "window"},
    {id: "dup", name: "Duplicate", spot: "desk"},
    {id: "dup", name: "Duplicate again", spot: "desk"},
    {id: "empty", name: "No thoughts", spot: "door"},
  ],
  thoughts: [
    {id: "k1", topic: "kitchen", label: "Sharp knife is safer", text: "A sharp knife slips less than a dull one.", kind: "insight", date: "2026-11-01", source: "Cooking notes", prompt: "Why keep knives sharp?", offset: [0, 0, 0]},
    {id: "k2", topic: "kitchen", label: "Mise en place always", text: "Prepare every ingredient before the pan heats.", kind: "decision", date: "2026-11-02", source: "Cooking notes", prompt: "What happens before the pan heats?", offset: [13, 0, 5]},
    {id: "s1", topic: "spices", label: "Toast whole spices first before grinding", text: "Toasting releases oils.", kind: "decision", date: "2026-11-03", source: "Cooking notes", prompt: "", offset: [99, 0, 0]},
    {id: "p1", topic: "plans", label: "Batch cook Sundays", text: "Cook grains and beans once for the week.", kind: "question", date: "2026-11-04", source: "Cooking notes", prompt: "When does batch cooking happen?"},
    {id: "x1", topic: "nowhere", label: "Orphan", text: "Unknown topic.", kind: "insight"},
    {id: "k1", topic: "kitchen", label: "Duplicate id", text: "Dropped.", kind: "insight"},
  ],
  threads: [
    {from: "k2", to: "p1", why: "Prep makes batch cooking quick"},
    {from: "k1", to: "k2", why: "Same topic, dropped"},
    {from: "k1", to: "zzz", why: "Unknown, dropped"},
  ],
}

@component
export class LociDataScenario extends Scenario {
  async run(): Promise<void> {
    await sleep(1500)
    const loci = getLoci()
    await waitForReady(loci)

    // (a) Validation.
    expect(parsePalaceJson("{not json").data).toBeNull()
    const {data, warnings} = validatePalace(OTHER_USER)
    expect(data !== null).toBe(true)
    expect(data!.topics.map((t) => t.id).join(",")).toBe("kitchen,spices,plans") // dup + empty dropped
    expect(data!.thoughts.length).toBe(4) // orphan + duplicate dropped
    const s1 = data!.thoughts.filter((t) => t.id === "s1")[0]
    expect(s1.label.split(" ").length).toBe(4) // clipped to 4 words
    expect(s1.offset[0]).toBe(20) // clamped to ±20 cm
    expect(s1.prompt.length > 0).toBe(true) // a prompt is filled in
    expect(data!.thoughts.filter((t) => t.id === "p1")[0].offset.length).toBe(3) // default layout
    expect(data!.threads.length).toBe(1) // same-topic + unknown dropped
    expect(warnings.length).toBeGreaterThan(4)

    // (b) Load it: the palace rebuilds from this user's data.
    const gaze = new GazeDriver(this, loci)
    gaze.lookAway()
    loci.setPalace(data!)
    await nextFrame()
    expect(loci.getMode()).toBe("place")
    expect(loci.getTopicIds().join(",")).toBe("kitchen,spices,plans")
    expect(findSceneObjectByName("Orb_kitchen") !== null).toBe(true)
    expect(loci.getOrbObject(PALACE.topics[0].id) === null).toBe(true) // old orbs gone
    for (const t of data!.topics) expect(loci.placeTopic(t.id)).toBe(true)
    expect(loci.getMode()).toBe("explore")
    gaze.lookAt(loci.getClusterCentreWorld("kitchen"))
    await sleep(900)
    expect(loci.isOpen("kitchen")).toBe(true)
    expect(loci.thoughtsAt("kitchen").length).toBe(2)
    expect(loci.toggleCard("k2")).toBe(true)
    expect(loci.card.getSentence()).toBe("Prepare every ingredient before the pan heats.")
    expect(loci.getThreadLineCount()).toBe(1) // k2 -> p1 thread drawn to the Meal plans topic

    // Back to the default palace for anything that runs next.
    gaze.lookAway()
    await sleep(2400)
    gaze.lookAt(null)
    loci.setPalace(PALACE)
    await nextFrame()
    expect(loci.getTopicIds().length).toBe(PALACE.topics.length)
  }
}
