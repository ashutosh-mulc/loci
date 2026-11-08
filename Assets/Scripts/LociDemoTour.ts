// LociDemoTour.ts
// Owns: a hands-off, repeatable walkthrough of Loci for recording the submission video.
// Tick "Play On Start", reset the Preview, and screen-record (Cmd+Shift+5 on the Preview panel).
// The head (world camera) turns smoothly like a person's would, and every step goes through the
// same controller / Recall / data APIs the real interactions use:
//   1. Place: each topic flies from the arc in front of you to a spot in the room.
//   2. Explore: look at a topic -> it blooms open; a star's card appears.
//   3. Recall: glance down, pinch Recall; questions, Reveal, Right/Wrong; debrief.
//   4. Any user: switch to another user's palace (alternatePalaces[0]) and open one topic.
// Off by default so it never moves your view during normal use or tests.

import {LociPalaceController} from "./LociPalaceController"
import {LociRecall} from "./LociRecall"
import {LociPalaceSource} from "./LociPalaceSource"
import WorldCameraFinderProvider from "SpectaclesInteractionKit.lspkg/Providers/CameraProvider/WorldCameraFinderProvider"

@component
export class LociDemoTour extends BaseScriptComponent {
  @ui.label('<span style="color: #60A5FA;">LociDemoTour – scripted walkthrough for the video</span>')
  @ui.separator
  @ui.group_start("References")
  @input controller: LociPalaceController
  @input recall: LociRecall
  @input @allowUndefined source: LociPalaceSource
  @ui.group_end
  @ui.separator
  @ui.group_start("Settings")
  @input @hint("Play the tour when the Preview starts. Turn off for normal use.")
  playOnStart: boolean = false
  @input @hint("Speed multiplier (1 = natural pace, about 90 s).")
  @widget(new SliderWidget(0.5, 2, 0.05))
  speed: number = 1
  @input @hint("Include step 4: switch to another user's palace.")
  showAnyUser: boolean = true
  @ui.group_end

  private camT!: Transform
  private from = quat.quatIdentity()
  private to = quat.quatIdentity()
  private t = 1
  private dur = 1
  private driving = false
  private playing = false

  onAwake(): void {
    this.createEvent("UpdateEvent").bind(() => this.drive())
    this.createEvent("LateUpdateEvent").bind(() => this.drive())
    this.createEvent("OnStartEvent").bind(() => {
      this.camT = WorldCameraFinderProvider.getInstance().getComponent().getTransform()
      if (this.playOnStart) this.play()
    })
  }

  isPlaying(): boolean { return this.playing }

  play(): void {
    if (this.playing) return
    this.playing = true
    this.run().catch((e) => print(`LociDemoTour error: ${e}`)).then(() => { this.playing = false })
  }

  // =================== the tour ===================

  private async run(): Promise<void> {
    const c = this.controller
    while (!c.isReady()) await this.wait(0.1)
    const eye = this.camT.getWorldPosition()
    const ahead = eye.add(this.flatForward().uniformScale(200))
    this.hold(ahead)
    await this.wait(1)
    print("LociDemoTour: 1 Place")

    // 1. Place: look where each topic should go, release it there, watch it fly.
    await this.look(eye.add(this.flatForward().uniformScale(60)).add(new vec3(0, -12, 0)), 1.2) // the orbs
    await this.wait(2.5)
    for (const id of c.getTopicIds()) {
      const p = c.suggestedPoint(id).add(new vec3(0, 12, 0))
      await this.look(p, 1.1)
      c.aimAndRelease(id, p)
      await this.wait(1.4)
      await this.until(() => c.isAnchored(id), 3, `${id} anchored`)
    }
    print("LociDemoTour: 2 Explore")

    // 2. Explore: look at a topic, it blooms; read a star.
    const ids = c.getTopicIds()
    const first = ids[Math.min(1, ids.length - 1)]
    const second = ids[Math.min(2, ids.length - 1)]
    await this.look(c.getClusterCentreWorld(ids[0])!, 1.6)
    await this.wait(2.2)
    await this.look(c.getClusterCentreWorld(first)!, 1.4)
    await this.wait(2)
    await this.until(() => c.getOpenSpot() === first, 3, `${first} open`)
    const star = c.thoughtsAt(first)[2] ?? c.thoughtsAt(first)[0]
    c.toggleCard(star.id)
    await this.wait(3.5)
    c.toggleCard(star.id)
    await this.wait(0.6)
    print("LociDemoTour: 3 Recall")

    // 3. Recall: glance down to the button, pinch it, answer at two topics, finish.
    await this.pressRecall()
    await this.look(c.getClusterCentreWorld(first)!.add(new vec3(0, 14, 0)), 1.2)
    await this.wait(2.5)
    await this.untilAsked(first)
    this.recall.reveal()
    await this.wait(2.8)
    this.recall.answer(true)
    await this.wait(2)
    await this.untilAsked(first)
    this.recall.reveal()
    await this.wait(2)
    this.recall.answer(false)
    await this.wait(1.5)
    await this.look(c.getClusterCentreWorld(second)!.add(new vec3(0, 14, 0)), 1.6)
    await this.wait(2.4)
    await this.untilAsked(second)
    this.recall.reveal()
    await this.wait(2.4)
    this.recall.answer(true)
    await this.wait(1.2)
    await this.pressRecall() // "Explore": the debrief appears right above the button
    await this.look(this.recall.recallUI.getRecallButtonWorldPosition().add(new vec3(0, 14, 0)), 0.8)
    await this.wait(4.5)

    // 4. Any user: the same Lens, another person's palace.
    if (this.showAnyUser && this.source && this.source.loadAlternate(0)) {
      print("LociDemoTour: 4 Any user")
      await this.look(eye.add(this.flatForward().uniformScale(60)).add(new vec3(0, -12, 0)), 1.4)
      await this.wait(2.5)
      for (const id of c.getTopicIds()) {
        const p = c.suggestedPoint(id).add(new vec3(0, 12, 0))
        await this.look(p, 0.8)
        c.aimAndRelease(id, p)
        await this.wait(1)
        await this.until(() => c.isAnchored(id), 3, `${id} anchored`)
      }
      const g = c.getTopicIds()[0]
      await this.look(c.getClusterCentreWorld(g)!, 1.4)
      await this.wait(2)
      await this.until(() => c.getOpenSpot() === g, 3, `${g} open`)
      const gs = c.thoughtsAt(g)[1] ?? c.thoughtsAt(g)[0]
      c.toggleCard(gs.id)
      await this.wait(3.5)
    }
    await this.look(ahead, 1.6)
    await this.wait(1)
    this.driving = false
    print("LociDemoTour: done")
  }

  /** Fixed timers alone drift if the preview drops frames (gaze dwell needs frames); wait for the real state. */
  private async until(cond: () => boolean, maxSec: number, what: string): Promise<void> {
    for (let t = 0; t < maxSec && !cond(); t += 0.1) await this.wait(0.1 * this.speed)
    if (!cond()) print(`LociDemoTour: gave up waiting for ${what}`)
  }

  private untilAsked(spot: string): Promise<void> {
    return this.until(() => this.controller.getOpenSpot() === spot && this.recall.getCurrentThoughtId() !== null, 3, `a question at ${spot}`)
  }

  private async pressRecall(): Promise<void> {
    await this.look(this.recall.recallUI.getRecallButtonWorldPosition(), 1.1)
    await this.wait(0.8)
    this.recall.toggle()
    await this.wait(0.7)
  }

  // =================== smooth head ===================

  private flatForward(): vec3 {
    const f = this.camT.getWorldRotation().multiplyVec3(new vec3(0, 0, -1))
    const flat = new vec3(f.x, 0, f.z)
    return flat.length > 0.001 ? flat.normalize() : new vec3(0, 0, -1)
  }

  private rotTo(p: vec3): quat {
    const dir = p.sub(this.camT.getWorldPosition()).normalize()
    return quat.lookAt(dir.uniformScale(-1), vec3.up()) // the camera looks down -Z
  }

  private hold(p: vec3): void {
    this.to = this.rotTo(p)
    this.from = this.to
    this.t = this.dur = 1
    this.driving = true
  }

  /** Turn the head to look at `p` over `sec` (ease in-out), then keep looking there. */
  private async look(p: vec3, sec: number): Promise<void> {
    this.from = this.camT.getWorldRotation()
    this.to = this.rotTo(p)
    this.t = 0
    this.dur = Math.max(0.05, sec / this.speed)
    this.driving = true
    await this.wait(sec)
  }

  private drive(): void {
    if (!this.driving || !this.camT) return
    this.t = Math.min(this.dur, this.t + getDeltaTime() / 2) // Update + LateUpdate both tick
    const k = this.t / this.dur
    const e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2
    this.camT.setWorldRotation(quat.slerp(this.from, this.to, e))
  }

  private wait(sec: number): Promise<void> {
    return new Promise((resolve) => {
      const ev = this.createEvent("DelayedCallbackEvent")
      ev.bind(() => resolve())
      ev.reset(sec / this.speed)
    })
  }
}
