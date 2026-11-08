// LeafIndex.ts: registers the Loci LEAF scenarios (done criteria 1, 2, 3, 5, any data, and review fixes).

import {scenariosIndex} from "Leaf.lspkg/Scenarios/decorator/ScenarioIndexDecorator"
import {ScenarioMetadata} from "Leaf.lspkg/Scenarios/scenario/ScenarioMetadata"
import {LociPlaceScenario} from "./LociPlaceScenario"
import {LociExploreScenario} from "./LociExploreScenario"
import {LociCardScenario} from "./LociCardScenario"
import {LociRecallScenario} from "./LociRecallScenario"
import {LociDataScenario} from "./LociDataScenario"
import {LociSameSpotScenario} from "./LociSameSpotScenario"
import {LociThreadsScenario} from "./LociThreadsScenario"
import {LociResetHereScenario} from "./LociResetHereScenario"
import {LociAimedLabelScenario} from "./LociAimedLabelScenario"

@component
export class LeafIndex extends BaseScriptComponent {
  @scenariosIndex
  static scenariosIndex: ScenarioMetadata[] = [
    {id: "loci-1-place", typename: LociPlaceScenario.getTypeName()},
    {id: "loci-2-explore-gaze", typename: LociExploreScenario.getTypeName()},
    {id: "loci-3-star-card", typename: LociCardScenario.getTypeName()},
    {id: "loci-5-recall", typename: LociRecallScenario.getTypeName()},
    {id: "loci-6-any-data", typename: LociDataScenario.getTypeName()},
    {id: "loci-7-same-spot", typename: LociSameSpotScenario.getTypeName()},
    {id: "loci-8-threads", typename: LociThreadsScenario.getTypeName()},
    {id: "loci-9-reset-here", typename: LociResetHereScenario.getTypeName()},
    {id: "loci-10-aimed-label", typename: LociAimedLabelScenario.getTypeName()},
  ]
}
