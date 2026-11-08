// LeafIndex.ts: registers the Loci LEAF scenarios (done criteria 1, 2, 3 and 5).

import {scenariosIndex} from "Leaf.lspkg/Scenarios/decorator/ScenarioIndexDecorator"
import {ScenarioMetadata} from "Leaf.lspkg/Scenarios/scenario/ScenarioMetadata"
import {LociPlaceScenario} from "./LociPlaceScenario"
import {LociExploreScenario} from "./LociExploreScenario"
import {LociCardScenario} from "./LociCardScenario"
import {LociRecallScenario} from "./LociRecallScenario"
import {LociPoseShot} from "./LociPoseShot"
import {LociDataScenario} from "./LociDataScenario"

@component
export class LeafIndex extends BaseScriptComponent {
  @scenariosIndex
  static scenariosIndex: ScenarioMetadata[] = [
    {id: "loci-1-place", typename: LociPlaceScenario.getTypeName()},
    {id: "loci-2-explore-gaze", typename: LociExploreScenario.getTypeName()},
    {id: "loci-3-star-card", typename: LociCardScenario.getTypeName()},
    {id: "loci-5-recall", typename: LociRecallScenario.getTypeName()},
    {id: "loci-6-any-data", typename: LociDataScenario.getTypeName()},
    {id: "zz-pose-shot", typename: LociPoseShot.getTypeName()},
  ]
}
