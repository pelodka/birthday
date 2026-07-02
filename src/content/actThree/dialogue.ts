export interface ActThreePromptDefinition {
  title: string;
  body: string;
  progress: string;
}

function createShootoutProgress(shotsLanded: number): string {
  void shotsLanded;
  return '';
}

const FIRE_PROMPT: ActThreePromptDefinition = {
  title: 'Fire (R2)',
  body: '',
  progress: '',
};

export const ACT_THREE_PROMPTS = {
  checkpointOne: {
    intro: {
      ...FIRE_PROMPT,
    },
    travel: {
      ...FIRE_PROMPT,
    },
    locked: {
      ...FIRE_PROMPT,
    },
    ready: {
      ...FIRE_PROMPT,
    },
    failed: {
      ...FIRE_PROMPT,
    },
    directHit: (shotsLanded: number): ActThreePromptDefinition => {
      void shotsLanded;
      return {
        ...FIRE_PROMPT,
      };
    },
  },
  checkpointOneReward: {
    ...FIRE_PROMPT,
  },
  checkpointTwo: {
    intro: {
      ...FIRE_PROMPT,
    },
    travel: {
      ...FIRE_PROMPT,
    },
    locked: {
      ...FIRE_PROMPT,
    },
    ready: {
      ...FIRE_PROMPT,
    },
    failed: {
      ...FIRE_PROMPT,
    },
    directHit: (shotsLanded: number): ActThreePromptDefinition => {
      void shotsLanded;
      return {
        ...FIRE_PROMPT,
      };
    },
  },
  checkpointTwoReward: {
    ...FIRE_PROMPT,
  },
  shootout: {
    intro: (): ActThreePromptDefinition => ({
      ...FIRE_PROMPT,
    }),
    waitForLockOn: (shotsLanded: number): ActThreePromptDefinition => ({
      title: 'Fire (R2)',
      body: '',
      progress: createShootoutProgress(shotsLanded),
    }),
    vulnerable: (shotsLanded: number): ActThreePromptDefinition => ({
      title: 'Fire (R2)',
      body: '',
      progress: createShootoutProgress(shotsLanded),
    }),
    missedShot: (shotsLanded: number): ActThreePromptDefinition => ({
      title: 'Fire (R2)',
      body: '',
      progress: createShootoutProgress(shotsLanded),
    }),
    directHit: (shotsLanded: number): ActThreePromptDefinition => ({
      title: 'Fire (R2)',
      body: '',
      progress: createShootoutProgress(shotsLanded),
    }),
    laserHit: (shotsLanded: number): ActThreePromptDefinition => ({
      title: 'Fire (R2)',
      body: '',
      progress: createShootoutProgress(shotsLanded),
    }),
    bossDown: (_outro: string): ActThreePromptDefinition => FIRE_PROMPT,
  },
} as const;
