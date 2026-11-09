// Criterion 1 (any room), now automatic: the palace arranges itself. After a reset, no hand
// placement: a force-directed simulation (LociForceLayout, a d3-force port) lays the topics out
// in front of the user, the orbs fly there along the simulation, and Explore starts. Topics joined
// by threads end up closer than unrelated ones; every topic stays far enough from the others to be
// looked at alone; the layout is the same every time; and placing by code (tests, older flows)
// cancels the layout cleanly.

import {Scenario} from "Leaf.lspkg/Scenarios/scenario/Scenario"
import {expect} from "Leaf.lspkg/Utils/common/Expect"
import {nextFrame, sleep} from "Leaf.lspkg/Utils/common/Utils"
import WorldCameraFinderProvider from "SpectaclesInteractionKit.lspkg/Providers/CameraProvider/WorldCameraFinderProvider"
import {PALACE} from "../Scripts/PalaceData"
import {getLoci, waitForReady} from "./LociLeafCommon"

const DEG = 180 / Math.PI

@component
export class LociPlaceScenario extends Scenario {
  async run(): Promise<void> {
    await sleep(1500)
    const loci = getLoci()
    await waitForReady(loci)
    const eye = () => WorldCameraFinderProvider.getInstance().getComponent().getTransform().getWorldPosition()

    const settle = async (): Promise<number> => {
      const t0 = getTime()
      for (let i = 0; i < 600 && loci.getMode() !== "explore"; i++) await nextFrame()
      return getTime() - t0
    }

    loci.resetPalace()
    await nextFrame()
    expect(loci.getMode()).toBe("place")
    expect(loci.isLayingOut()).toBe(true) // arranging, no hands needed
    // The flight is Lens Studio physics: one dynamic rigid body (sphere collider) per orb.
    let maxBodies = 0
    const t0 = getTime()
    for (let i = 0; i < 600 && loci.getMode() !== "explore"; i++) {
      maxBodies = Math.max(maxBodies, loci.getLayoutBodyCount())
      await nextFrame()
    }
    const took = getTime() - t0 + (await settle())
    print(`[LociPlace] ${maxBodies} physics bodies in flight, ${loci.getLayoutBodyCount()} after settling`)
    expect(maxBodies).toBe(PALACE.topics.length)
    expect(loci.hasLayoutWorld()).toBe(true) // own zero-gravity world, isolated from the room's colliders
    expect(loci.getLayoutBodyCount()).toBe(0) // removed once anchored
    print(`[LociPlace] auto layout settled in ${took.toFixed(1)} s, ${loci.getLayoutTicks()} physics ticks`)
    expect(loci.getMode()).toBe("explore")
    expect(loci.placedCount()).toBe(PALACE.topics.length)
    expect(loci.getLayoutTicks()).toBeGreaterThan(100)
    expect(took).toBeLessThan(6)

    // Each topic: anchored, named, out in the room in front of the user.
    const e = eye()
    const centre = new Map<string, vec3>()
    for (const t of PALACE.topics) {
      expect(loci.isAnchored(t.id)).toBe(true)
      expect(loci.labels.getText(`spot:${t.id}`)).toBe(t.name)
      const c = loci.getClusterCentreWorld(t.id)!
      centre.set(t.id, c)
      const flat = new vec3(c.x - e.x, 0, c.z - e.z)
      expect(flat.length).toBeGreaterThan(120)
      expect(flat.length).toBeLessThan(240)
    }

    // Far enough apart to look at one alone; the more threads join two topics, the closer they sit.
    const angle = (a: string, b: string) =>
      Math.acos(Math.max(-1, Math.min(1, centre.get(a)!.sub(e).normalize().dot(centre.get(b)!.sub(e).normalize())))) * DEG
    const topicOf = new Map<string, string>()
    PALACE.thoughts.forEach((t) => topicOf.set(t.id, t.topic))
    const weight = new Map<string, number>()
    PALACE.threads.forEach((th) => {
      const a = topicOf.get(th.from)!, b = topicOf.get(th.to)!
      if (a !== b) { const k = a < b ? `${a}|${b}` : `${b}|${a}`; weight.set(k, (weight.get(k) ?? 0) + 1) }
    })
    const ids = PALACE.topics.map((t) => t.id)
    const pairs: [number, number][] = [] // [threads, angle]
    let minSep = 999
    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        const a = angle(ids[i], ids[j])
        minSep = Math.min(minSep, a)
        pairs.push([weight.get(ids[i] < ids[j] ? `${ids[i]}|${ids[j]}` : `${ids[j]}|${ids[i]}`) ?? 0, a])
      }
    }
    const mw = pairs.reduce((s, p) => s + p[0], 0) / pairs.length
    const ma = pairs.reduce((s, p) => s + p[1], 0) / pairs.length
    let cov = 0, vw = 0, va = 0
    pairs.forEach(([w, a]) => { cov += (w - mw) * (a - ma); vw += (w - mw) * (w - mw); va += (a - ma) * (a - ma) })
    const corr = vw > 0 && va > 0 ? cov / Math.sqrt(vw * va) : 0
    const strongest = pairs.reduce((b, p) => (p[0] > b[0] ? p : b), pairs[0])
    print(`[LociPlace] closest pair ${minSep.toFixed(1)} deg; threads-vs-angle correlation ${corr.toFixed(2)}; ` +
      `strongest link (${strongest[0]} threads) ${strongest[1].toFixed(1)} deg vs average ${ma.toFixed(1)} deg`)
    expect(minSep).toBeGreaterThan(loci.minSeparationDeg - 0.5)
    if (vw > 0) {
      expect(corr).toBeLessThan(0) // more threads → closer (the exact strength depends on the data and the view box)
      expect(strongest[1]).toBeLessThan(ma)
    }

    // No dragging any more: orbs are not grabbable.
    expect(loci.isOrbGrabbable(ids[0])).toBe(false)

    // Deterministic: a second reset lands every topic in the same place.
    const before = new Map<string, vec3>()
    ids.forEach((id) => before.set(id, loci.getSpotPointWorld(id)!))
    loci.resetPalace()
    await settle()
    let drift = 0
    ids.forEach((id) => { drift = Math.max(drift, loci.getSpotPointWorld(id)!.distance(before.get(id)!)) })
    print(`[LociPlace] re-layout drift ${drift.toFixed(2)} cm`)
    expect(drift).toBeLessThan(1)

    // Placing by code cancels the layout; nothing moves afterwards.
    loci.resetPalace()
    await nextFrame()
    ids.forEach((id) => expect(loci.placeTopic(id)).toBe(true))
    expect(loci.isLayingOut()).toBe(false)
    const placed = new Map<string, vec3>()
    ids.forEach((id) => placed.set(id, loci.getSpotPointWorld(id)!))
    await sleep(3500)
    expect(loci.getMode()).toBe("explore")
    ids.forEach((id) => expect(loci.getSpotPointWorld(id)!.distance(placed.get(id)!)).toBeLessThan(0.01))

    // Grab and throw: every topic can be grabbed; a thrown topic glides on and stops; a linked
    // topic follows part of the way; an unlinked one stays put.
    ids.forEach((id) => expect(loci.isTopicGrabbable(id)).toBe(true))
    const wOf = (a: string, b: string) => weight.get(a < b ? `${a}|${b}` : `${b}|${a}`) ?? 0
    let lead = ids[0], mate = ids[1], best = -1
    for (const a of ids) for (const b of ids) if (a !== b && wOf(a, b) > best) { best = wOf(a, b); lead = a; mate = b }
    const loner = ids.find((c) => c !== lead && c !== mate && wOf(lead, c) === 0) ?? null
    const h0 = new Map<string, vec3>()
    ids.forEach((id) => h0.set(id, loci.getTopicHome(id)!))
    const right = WorldCameraFinderProvider.getInstance().getComponent().getTransform().getWorldRotation().multiplyVec3(new vec3(1, 0, 0))
    expect(loci.throwTopic(lead, h0.get(lead)!.add(right.uniformScale(30)), right.uniformScale(80))).toBe(true)
    await nextFrame()
    expect(loci.isPalaceMoving()).toBe(true)
    for (let i = 0; i < 600 && loci.isPalaceMoving(); i++) await nextFrame()
    expect(loci.isPalaceMoving()).toBe(false)
    const moved = (id: string) => loci.getTopicHome(id)!.distance(h0.get(id)!)
    print(`[LociPlace] thrown ${lead} moved ${moved(lead).toFixed(1)} cm; linked ${mate} (${best} threads) ${moved(mate).toFixed(1)} cm` +
      (loner ? `; unlinked ${loner} ${moved(loner).toFixed(2)} cm` : ""))
    expect(moved(lead)).toBeGreaterThan(30) // the throw carried it past where it was let go
    if (best > 0) {
      expect(moved(mate)).toBeGreaterThan(1)
      expect(moved(mate)).toBeLessThan(moved(lead))
    }
    if (loner) expect(moved(loner)).toBeLessThan(0.5)
    // The topic really sits at its new home.
    expect(loci.getSpotPointWorld(lead)!.distance(loci.getTopicHome(lead)!)).toBeLessThan(0.5)
  }
}
