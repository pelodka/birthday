import type { SceneAudioConfig } from '../../types';
import { AUDIO_HOOKS } from '../../audio/hooks';

export const ACT_THREE_AUDIO = {
  tracks: {
    karelGott: {
      id: 'act-3-rot-und-schwarz',
      src: '/audio/act-3/music/rot-und-schwarz.mp3',
      loop: true,
      volume: 0.7,
    },
  },
  cues: {
    intro: 'karelGott',
    'checkpoint-one': 'karelGott',
    documents: 'karelGott',
    'checkpoint-two': 'karelGott',
    shootout: 'karelGott',
    victory: 'karelGott',
  },
  voice: {
    intro: 'act-3-voice-intro',
    'checkpoint-one': 'act-3-voice-checkpoint-one',
    documents: 'act-3-voice-documents',
    'checkpoint-two': 'act-3-voice-checkpoint-two',
    shootout: 'act-3-voice-shootout',
    victory: 'act-3-voice-victory',
  },
  sfx: {
    collection: {
      id: 'shared-arcade-bonus',
      src: '/audio/shared/sfx/arcade-bonus.mp3',
      volume: 0.9,
    },
    shot: {
      id: 'act-3-sniper-rifle-impulse-shoot',
      src: '/audio/act-3/sfx/sniper-rifle-impulse-shoot.mp3',
      volume: 0.86,
    },
    hit: {
      id: 'act-3-hit-ack',
      src: '/audio/act-3/sfx/ack.mp3',
      volume: 0.92,
    },
  },
  hooks: {
    [AUDIO_HOOKS.shared.collection]: { sfx: 'collection' },
    [AUDIO_HOOKS.actThree.intro]: { music: 'intro', voice: 'intro' },
    [AUDIO_HOOKS.actThree.checkpointOneStart]: { music: 'checkpoint-one', voice: 'checkpoint-one' },
    [AUDIO_HOOKS.actThree.documentsStart]: { music: 'documents', voice: 'documents' },
    [AUDIO_HOOKS.actThree.checkpointTwoStart]: { music: 'checkpoint-two', voice: 'checkpoint-two' },
    [AUDIO_HOOKS.actThree.shot]: { sfx: 'shot' },
    [AUDIO_HOOKS.actThree.hit]: { sfx: 'hit' },
    [AUDIO_HOOKS.actThree.shootoutStart]: { music: 'shootout', voice: 'shootout' },
    [AUDIO_HOOKS.actThree.shootoutVictory]: { music: 'victory', voice: 'victory' },
  },
} as const satisfies SceneAudioConfig;
