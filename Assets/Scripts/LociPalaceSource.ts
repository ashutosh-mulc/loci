// LociPalaceSource.ts
// Owns: choosing whose palace this Lens shows. Drop a user's palace JSON (schema in
// devpost/data-spec.md) into "Palace Json" and the whole palace — orbs, stars, cards, Recall
// questions, threads — comes from that file. Leave it empty to use PalaceData.ts.
// Validates with LociPalaceSchema and prints any warnings; never throws on a bad file.

import {LociPalaceController} from "./LociPalaceController"
import {parsePalaceJson} from "./LociPalaceSchema"

@component
export class LociPalaceSource extends BaseScriptComponent {
  @ui.label('<span style="color: #60A5FA;">LociPalaceSource – whose palace to show</span>')
  @ui.separator
  @ui.group_start("References")
  @input @hint("The palace controller on 'Loci'.")
  controller: LociPalaceController
  @ui.group_end
  @ui.separator
  @ui.group_start("Data")
  @input @hint("A user's palace as JSON (same schema as PalaceData.ts). Empty = PalaceData.ts.")
  @allowUndefined
  palaceJson: JsonAsset
  @input @hint("Other users' palaces the demo tour can switch to (loadAlternate).")
  @allowUndefined
  alternatePalaces: JsonAsset[] = []
  @ui.group_end

  onAwake(): void {
    // Runs before the controller's OnStart, so the palace is built from this data.
    if (this.controller && this.palaceJson) this.load(this.palaceJson)
  }

  /** Switch to alternatePalaces[i] now (rebuilds the palace, back to Place). */
  loadAlternate(i: number): boolean {
    const a = this.alternatePalaces ? this.alternatePalaces[i] : null
    return a ? this.load(a) : false
  }

  private load(asset: JsonAsset): boolean {
    const {data, warnings} = parsePalaceJson(asset.getString())
    warnings.forEach((w) => print(`Loci data: ${w}`))
    if (!data) {
      print(`Loci data: ${asset.name} had nothing usable; keeping the current palace.`)
      return false
    }
    this.controller.setPalace(data)
    print(`Loci data: loaded ${data.topics.length} topics, ${data.thoughts.length} thoughts from ${asset.name}.`)
    return true
  }
}
