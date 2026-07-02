import type { RelicDefinition, SceneDefinition } from '../../types';

import { ACT_TWO_AUDIO } from './audio';
import { ACT_TWO_ABILITIES, ACT_TWO_CHARACTERS, ACT_TWO_ENCOUNTERS, ACT_TWO_SCENE, ACT_TWO_STATUS } from './config';
import { ACT_TWO_DIALOGUE } from './dialogue';
import {
  ACT_TWO_DIALOGUE_PORTRAITS,
  ACT_TWO_ENEMY_DIALOGUE_PORTRAITS,
  ACT_TWO_PARTNER_DIALOGUE_PORTRAITS,
} from './portraits';
import { ACT_TWO_UI } from './ui';

export { ACT_TWO_AUDIO } from './audio';
export { ACT_TWO_ABILITIES, ACT_TWO_CHARACTERS, ACT_TWO_ENCOUNTERS, ACT_TWO_SCENE, ACT_TWO_STATUS } from './config';
export { ACT_TWO_DIALOGUE } from './dialogue';
export {
  ACT_TWO_DIALOGUE_PORTRAITS,
  ACT_TWO_ENEMY_DIALOGUE_PORTRAITS,
  ACT_TWO_PARTNER_DIALOGUE_PORTRAITS,
} from './portraits';
export { ACT_TWO_UI } from './ui';

export const ACT_TWO_COPY = {
  characters: ACT_TWO_CHARACTERS,
  ui: ACT_TWO_UI,
  abilities: ACT_TWO_ABILITIES,
  encounters: ACT_TWO_ENCOUNTERS,
  dialogue: ACT_TWO_DIALOGUE,
  portraits: {
    playerDialogue: ACT_TWO_DIALOGUE_PORTRAITS,
    partnerDialogue: ACT_TWO_PARTNER_DIALOGUE_PORTRAITS,
    enemyDialogue: ACT_TWO_ENEMY_DIALOGUE_PORTRAITS,
  },
  status: ACT_TWO_STATUS,
  scene: ACT_TWO_SCENE,
  audio: ACT_TWO_AUDIO,
} as const;

export function createActTwoScene(relicReward: RelicDefinition): SceneDefinition {
  return {
    id: 'act-2-catchphrase',
    actNumber: 2,
    title: ACT_TWO_COPY.scene.title,
    subtitle: ACT_TWO_COPY.scene.subtitle,
    homage: ACT_TWO_COPY.scene.homage,
    visualEra: 'ps1-low-poly',
    runtime: 'three',
    objective: ACT_TWO_COPY.scene.objective,
    controls: ACT_TWO_COPY.scene.controls,
    intro: ACT_TWO_COPY.scene.intro,
    outro: ACT_TWO_COPY.scene.outro,
    mechanicsHighlights: [...ACT_TWO_COPY.scene.mechanicsHighlights],
    partyRoster: [...ACT_TWO_COPY.scene.partyRoster],
    enemyRoster: [...ACT_TWO_COPY.scene.enemyRoster],
    backgroundImage: '/backgrounds/act-2/field-yerevan-2022.png',
    backgroundImagePosition: 'center center',
    audio: ACT_TWO_AUDIO,
    palette: {
      background: '#09111d',
      accent: '#ff6d8d',
      ui: '#ffe6f0',
    },
    bossEncounter: {
      ...ACT_TWO_COPY.scene.bossEncounter,
      tauntLines: [...ACT_TWO_COPY.scene.bossEncounter.tauntLines],
    },
    relicReward,
  };
}
