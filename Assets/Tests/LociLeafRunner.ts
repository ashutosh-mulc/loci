// LociLeafRunner.ts: runs every registered LEAF scenario in order when the preview starts,
// and prints one summary line. Turn "Auto Run" on in the Inspector to test; leave it off
// for normal use so the tests don't move your head or reset your palace.

import {DefaultScenarioManager} from "Leaf.lspkg/Scenarios/scenario/manager/DefaultLeafScenarioManager"
import {sleep} from "Leaf.lspkg/Utils/common/Utils"

@component
export class LociLeafRunner extends BaseScriptComponent {
  @ui.label('<span style="color: #60A5FA;">LociLeafRunner – runs the Loci LEAF scenarios in preview</span>')
  @ui.separator
  @ui.group_start("Settings")
  @input
  @hint("Run all scenarios when the preview starts. Leave off for normal use.")
  autoRun: boolean = false
  @ui.group_end

  onAwake(): void {
    if (!this.autoRun) return
    this.createEvent("OnStartEvent").bind(() => {
      this.runAll().catch((e) => print(`[LociLEAF] runner error ${e}`))
    })
  }

  private async runAll(): Promise<void> {
    const manager = DefaultScenarioManager.getInstance()
    const results: string[] = []
    await sleep(500)
    for (const id of manager.listScenarioIds()) {
      try {
        await manager.startScenario(id)
        results.push(`${id}=PASS`)
      } catch (e) {
        results.push(`${id}=FAIL`)
        print(`[LociLEAF] ${id} failed: ${e}`)
      }
      await sleep(500)
    }
    print(`[LociLEAF] SUMMARY ${results.join(" ")}`)
  }
}
