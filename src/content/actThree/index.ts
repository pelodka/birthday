import type { RelicDefinition, SceneDefinition } from '../../types';

import { ACT_THREE_AUDIO } from './audio';
import {
  ACT_THREE_CHECKPOINT_REQUIRED_HITS,
  ACT_THREE_DOCUMENTS_PICKUP,
  ACT_THREE_GUARDS,
  ACT_THREE_MISSION,
  ACT_THREE_PROGRESS_LABELS,
  ACT_THREE_SCENE,
  ACT_THREE_SHOOTOUT,
  createActThreeScene,
} from './config';
import { ACT_THREE_PROMPTS } from './dialogue';
import { ACT_THREE_WORLD_VISUALS } from './visuals';

export { ACT_THREE_AUDIO } from './audio';
export {
  ACT_THREE_CHECKPOINT_REQUIRED_HITS,
  ACT_THREE_DOCUMENTS_PICKUP,
  ACT_THREE_GUARDS,
  ACT_THREE_MISSION,
  ACT_THREE_PROGRESS_LABELS,
  ACT_THREE_SCENE,
  ACT_THREE_SHOOTOUT,
  createActThreeScene,
} from './config';
export { ACT_THREE_PROMPTS } from './dialogue';
export { ACT_THREE_LANE_POSITIONS, ACT_THREE_WORLD_VISUALS } from './visuals';
export type { ActThreeMissionObjectiveDefinition, ActThreeMissionObjectiveId, ActThreePhaseId } from './config';
export type {
  ActThreeActorModelClips,
  ActThreeBossVisualDefinition,
  ActThreeCameraVisualConfig,
  ActThreeCrosshairVisualConfig,
  ActThreeCorridorVisualConfig,
  ActThreeDocumentsVisualDefinition,
  ActThreeDustConfig,
  ActThreeGuardVisualDefinition,
  ActThreeHandsVisualConfig,
  ActThreeLaserVisualConfig,
  ActThreeWorldVisualConfig,
} from './visuals';

export const ACT_THREE_COPY = {
  scene: ACT_THREE_SCENE,
  checkpointRequiredHits: ACT_THREE_CHECKPOINT_REQUIRED_HITS,
  guards: ACT_THREE_GUARDS,
  mission: ACT_THREE_MISSION,
  progress: ACT_THREE_PROGRESS_LABELS,
  prompts: ACT_THREE_PROMPTS,
  shootout: ACT_THREE_SHOOTOUT,
  documents: ACT_THREE_DOCUMENTS_PICKUP,
  world: ACT_THREE_WORLD_VISUALS,
  audio: ACT_THREE_AUDIO,
} as const;

export function buildActThreeScene(relicReward: RelicDefinition): SceneDefinition {
  return createActThreeScene(relicReward);
}
