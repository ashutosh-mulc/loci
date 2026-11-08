// Review item #3: after a reset or a palace swap, the orbs come back in front of where the user
// is looking now, not where the Lens started.

import {Scenario} from "Leaf.lspkg/Scenarios/scenario/Scenario"
import {expect} from "Leaf.lspkg/Utils/common/Expect"
import {nextFrame, sleep} from "Leaf.lspkg/Utils/common/Utils"
import WorldCameraFinderProvider from "SpectaclesInteractionKit.lspkg/Providers/CameraProvider/WorldCameraFinderProvider"
import {PALACE} from "../Scripts/PalaceData"
import {GazeDriver, getLoci, waitForReady} from "./LociLeafCommon"

const DEG = Math.PI / 180

@component
export class LociResetHereScenario extends Scenario {
  async run(): Promise<void> {
    await sleep(1500)
    const loci = getLoci()
    await waitForReady(loci)
    const cam = WorldCameraFinderProvider.getInstance().getComponent().getTransform()
    const gaze = new GazeDriver(this, loci)

    const worstAngle = (look: vec3): number => {
      gaze.lookAt(look) // re-apply in this frame: tracking may have moved the head since
      const eye = cam.getWorldPosition()
      const f = cam.getWorldRotation().multiplyVec3(new vec3(0, 0, -1))
      const flatF = new vec3(f.x, 0, f.z).normalize()
      let worst = 0
      for (const t of loci.getTopicIds()) {
        const d = loci.getOrbObject(t)!.getTransform().getWorldPosition().sub(eye)
        const flat = new vec3(d.x, 0, d.z).normalize()
        worst = Math.max(worst, Math.acos(Math.max(-1, Math.min(1, flat.dot(flatF)))) / DEG)
      }
      return worst
    }

    // Turn 90 degrees to the right, then reset: the orbs should be in front again.
    const right = cam.getWorldPosition().add(new vec3(200, 0, 0))
    gaze.lookAt(right)
    loci.resetPalace()
    await nextFrame()
    const afterReset = worstAngle(right)
    print(`[LociResetHere] after reset, worst orb is ${afterReset.toFixed(1)} deg off the view direction`)
    expect(afterReset).toBeLessThan(35)

    // Turn 90 degrees to the left and swap palaces: same.
    const left = cam.getWorldPosition().add(new vec3(-200, 0, 0))
    gaze.lookAt(left)
    loci.setPalace(PALACE)
    await nextFrame()
    const afterSwap = worstAngle(left)
    print(`[LociResetHere] after palace swap, worst orb is ${afterSwap.toFixed(1)} deg off`)
    expect(afterSwap).toBeLessThan(35)

    // Back to facing forward for whatever runs next.
    gaze.lookAt(cam.getWorldPosition().add(new vec3(0, 0, -200)))
    loci.resetPalace()
    await nextFrame()
    gaze.lookAt(null)
  }
}
