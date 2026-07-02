import type { ActTwoAnimationBinding, ActTwoAnimationSlot, ActTwoModelSchema, ActTwoModelSpec } from '../types';

const createPartyBindings = (
  overrides: Partial<Record<ActTwoAnimationSlot, Omit<ActTwoAnimationBinding, 'slot' | 'phase' | 'required'>>> = {},
): ActTwoAnimationBinding[] => [
  {
    slot: 'exploration-idle',
    phase: 'exploration',
    required: true,
    status: 'missing',
    ...overrides['exploration-idle'],
  },
  {
    slot: 'exploration-move',
    phase: 'exploration',
    required: true,
    status: 'missing',
    ...overrides['exploration-move'],
  },
  {
    slot: 'battle-start',
    phase: 'battle',
    required: true,
    status: 'missing',
    ...overrides['battle-start'],
  },
  {
    slot: 'battle-idle',
    phase: 'battle',
    required: true,
    status: 'missing',
    ...overrides['battle-idle'],
  },
  {
    slot: 'battle-guard',
    phase: 'battle',
    required: true,
    status: 'missing',
    ...overrides['battle-guard'],
  },
  {
    slot: 'battle-hit',
    phase: 'battle',
    required: true,
    status: 'missing',
    notes: 'Being-hit cue. Current party actors intentionally reuse their own battle-guard clip here.',
    ...overrides['battle-hit'],
  },
  {
    slot: 'battle-attack',
    phase: 'battle',
    required: true,
    status: 'missing',
    ...overrides['battle-attack'],
  },
  {
    slot: 'battle-skill',
    phase: 'battle',
    required: true,
    status: 'missing',
    ...overrides['battle-skill'],
  },
  {
    slot: 'battle-victory',
    phase: 'battle',
    required: true,
    status: 'missing',
    ...overrides['battle-victory'],
  },
];

const createEnemyBindings = (
  overrides: Partial<Record<ActTwoAnimationSlot, Omit<ActTwoAnimationBinding, 'slot' | 'phase' | 'required'>>> = {},
): ActTwoAnimationBinding[] => [
  {
    slot: 'battle-idle',
    phase: 'battle',
    required: true,
    status: 'missing',
    ...overrides['battle-idle'],
  },
  {
    slot: 'battle-hit',
    phase: 'battle',
    required: true,
    status: 'missing',
    ...overrides['battle-hit'],
  },
  {
    slot: 'battle-defeat',
    phase: 'battle',
    required: true,
    status: 'missing',
    notes: 'One-shot defeat cue. Runtime clamps on the final frame so the enemy remains prone.',
    ...overrides['battle-defeat'],
  },
];

export const actTwoModelSchema: ActTwoModelSchema = {
  version: 7,
  conventions: [
    'Party actors need exploration-idle, exploration-move, battle-start, battle-idle, battle-guard, battle-hit, battle-attack, battle-skill, and battle-victory.',
    'Party battle-hit intentionally points at each actor’s own battle-guard clip for the current production.',
    'Enemies are battle-only in the current Act 2 runtime and need battle-idle, battle-hit, and battle-defeat. The runtime keeps battle-idle looping during normal battle.',
    'Enemy battle-hit plays near the party attack impact window. Enemy battle-defeat plays once and clamps on its final prone frame.',
    'Use one shared rig per actor. Either deliver one GLB with multiple clips or separate GLBs that reuse the same skeleton.',
    'The current runtime already supports per-clip GLBs with a shared rig, which matches the current Meshy exports.',
  ],
  actorSpecs: [
    {
      actorId: 'boss-prime',
      label: 'Boss Prime',
      role: 'hero',
      packaging: 'per-clip-glb-shared-rig',
      rootDirectory: '/models/act-2/player',
      bindings: createPartyBindings({
        'exploration-idle': {
          status: 'ready',
          file: '/models/act-2/player/boss-prime-pc-idle.glb',
          notes: 'Dedicated idle clip shared between field and battle neutral stance.',
        },
        'exploration-move': {
          status: 'ready',
          file: '/models/act-2/player/boss-prime-pc-walk.glb',
          notes: 'Dedicated exploration locomotion clip.',
        },
        'battle-start': {
          status: 'ready',
          file: '/models/act-2/player/boss-prime-pc-battle-start.glb',
          notes: 'One-shot battle entrance cue played when combat begins.',
        },
        'battle-idle': {
          status: 'ready',
          file: '/models/act-2/player/boss-prime-pc-idle.glb',
          notes: 'Current battle loop reuses the dedicated idle clip until a combat-specific idle exists.',
        },
        'battle-guard': {
          status: 'ready',
          file: '/models/act-2/player/boss-prime-pc-battle-guard.glb',
          notes: 'Dedicated guard / block cue.',
        },
        'battle-hit': {
          status: 'ready',
          file: '/models/act-2/player/boss-prime-pc-battle-guard.glb',
          notes: 'Being-hit reaction intentionally reuses Boss Prime’s own guard cue.',
        },
        'battle-attack': {
          status: 'ready',
          file: '/models/act-2/player/boss-prime-pc-battle-attack.glb',
          notes: 'Dedicated one-shot battle attack cue.',
        },
        'battle-skill': {
          status: 'ready',
          file: '/models/act-2/player/boss-prime-pc-battle-skill.glb',
          notes: 'Dedicated one-shot battle skill cue for ability actions.',
        },
        'battle-victory': {
          status: 'ready',
          file: '/models/act-2/player/boss-prime-pc-battle-victory.glb',
          notes: 'Dedicated victory cue used on encounter win.',
        },
      }),
    },
    {
      actorId: 'planner-mage',
      label: 'Planner Mage',
      role: 'partner',
      packaging: 'per-clip-glb-shared-rig',
      rootDirectory: '/models/act-2/party/planner-mage',
      bindings: createPartyBindings({
        'exploration-idle': {
          status: 'ready',
          file: '/models/act-2/party/planner-mage/exploration-idle.glb',
          notes: 'Meshy idle loop used for field neutral stance.',
        },
        'exploration-move': {
          status: 'ready',
          file: '/models/act-2/party/planner-mage/exploration-move.glb',
          notes: 'Funky walk clip used during field follow movement.',
        },
        'battle-start': {
          status: 'ready',
          file: '/models/act-2/party/planner-mage/battle-start.glb',
          notes: 'Cheer / pre-match entrance cue used when battle opens.',
        },
        'battle-idle': {
          status: 'ready',
          file: '/models/act-2/party/planner-mage/battle-idle.glb',
          notes: 'Relax arms then strike battle pose loop used as the partner combat idle.',
        },
        'battle-guard': {
          status: 'ready',
          file: '/models/act-2/party/planner-mage/battle-guard.glb',
          notes: 'Dedicated defensive block cue.',
        },
        'battle-hit': {
          status: 'ready',
          file: '/models/act-2/party/planner-mage/battle-guard.glb',
          notes: 'Being-hit reaction intentionally reuses Planner Mage’s own guard cue.',
        },
        'battle-attack': {
          status: 'ready',
          file: '/models/act-2/party/planner-mage/battle-attack.glb',
          notes: 'Long kung-fu punch cue used for the dedicated attack action.',
        },
        'battle-skill': {
          status: 'ready',
          file: '/models/act-2/party/planner-mage/battle-skill.glb',
          notes: 'Charged spell cast cue used for ability actions.',
        },
        'battle-victory': {
          status: 'ready',
          file: '/models/act-2/party/planner-mage/partner-victory.glb',
          notes: 'Dedicated Aloha pose victory cue used on encounter win.',
        },
      }),
    },
    {
      actorId: 'taxi-migrant',
      label: 'Таксист Мигран',
      role: 'enemy-standard',
      packaging: 'per-clip-glb-shared-rig',
      rootDirectory: '/models/act-2/enemies/taxi-migrant',
      bindings: createEnemyBindings({
        'battle-idle': {
          status: 'ready',
          file: '/models/act-2/enemies/taxi-migrant/battle-idle.glb',
          notes: 'Looped normal battle animation.',
        },
        'battle-hit': {
          status: 'ready',
          file: '/models/act-2/enemies/taxi-migrant/battle-hit.glb',
          notes: 'One-shot hit reaction after party attacks.',
        },
        'battle-defeat': {
          status: 'ready',
          file: '/models/act-2/enemies/taxi-migrant/battle-defeat.glb',
          notes: 'One-shot death animation that ends prone.',
        },
      }),
    },
    {
      actorId: 'anton-distorton',
      label: 'Антоха Гвоздодер',
      role: 'enemy-standard',
      packaging: 'per-clip-glb-shared-rig',
      rootDirectory: '/models/act-2/enemies/anton-distorton',
      bindings: createEnemyBindings({
        'battle-idle': {
          status: 'ready',
          file: '/models/act-2/enemies/anton-distorton/battle-idle.glb',
          notes: 'Looped normal battle animation.',
        },
        'battle-hit': {
          status: 'ready',
          file: '/models/act-2/enemies/anton-distorton/battle-hit.glb',
          notes: 'One-shot hit reaction after party attacks.',
        },
        'battle-defeat': {
          status: 'ready',
          file: '/models/act-2/enemies/anton-distorton/battle-defeat.glb',
          notes: 'One-shot death animation that ends prone.',
        },
      }),
    },
    {
      actorId: 'vadim-heavydim',
      label: 'Вадимус Хэвиметал',
      role: 'enemy-standard',
      packaging: 'per-clip-glb-shared-rig',
      rootDirectory: '/models/act-2/enemies/vadim-heavydim',
      bindings: createEnemyBindings({
        'battle-idle': {
          status: 'ready',
          file: '/models/act-2/enemies/vadim-heavydim/battle-idle.glb',
          notes: 'Looped normal battle animation.',
        },
        'battle-hit': {
          status: 'ready',
          file: '/models/act-2/enemies/vadim-heavydim/battle-hit.glb',
          notes: 'One-shot hit reaction after party attacks.',
        },
        'battle-defeat': {
          status: 'ready',
          file: '/models/act-2/enemies/vadim-heavydim/battle-defeat.glb',
          notes: 'One-shot death animation that ends prone.',
        },
      }),
    },
    {
      actorId: 'giant-khinkali',
      label: 'Гигантский Хинкали',
      role: 'enemy-boss',
      packaging: 'per-clip-glb-shared-rig',
      rootDirectory: '/models/act-2/enemies/giant-khinkali',
      bindings: createEnemyBindings({
        'battle-idle': {
          status: 'ready',
          file: '/models/act-2/enemies/giant-khinkali/battle-idle.glb',
          notes: 'Looped normal battle animation.',
        },
        'battle-hit': {
          status: 'ready',
          file: '/models/act-2/enemies/giant-khinkali/battle-hit.glb',
          notes: 'One-shot hit reaction after party attacks.',
        },
        'battle-defeat': {
          status: 'ready',
          file: '/models/act-2/enemies/giant-khinkali/battle-defeat.glb',
          notes: 'One-shot death animation that ends prone.',
        },
      }),
    },
  ],
};

export function getActTwoModelSpec(actorId: string): ActTwoModelSpec | undefined {
  return actTwoModelSchema.actorSpecs.find((spec) => spec.actorId === actorId);
}

export function getActTwoAnimationBinding(
  actorId: string,
  slot: ActTwoAnimationSlot,
): ActTwoAnimationBinding | undefined {
  return getActTwoModelSpec(actorId)?.bindings.find((binding) => binding.slot === slot);
}

export function getActTwoAnimationFile(actorId: string, slot: ActTwoAnimationSlot): string | null {
  return getActTwoAnimationBinding(actorId, slot)?.file ?? null;
}
