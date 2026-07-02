export type ActOneCardType = 'attack' | 'block' | 'skill' | 'special';

export interface ActOneCardDefinition {
  id: string;
  name: string;
  cost: number;
  description: string;
  type: ActOneCardType;
  damage?: number;
  block?: number;
  bossDamageRatio?: number;
  persistent?: boolean;
  singleUse?: boolean;
}

export const ACT_ONE_CARD_ART = {
  'calendar-jab': { image: '/sprites/act-1/cards/act1-card-wfh-protocol-front-v001.png' },
  'reply-all': { image: '/sprites/act-1/cards/act1-card-group-chat-spiral-front-v001.png' },
  'inbox-guard': { image: '/sprites/act-1/cards/act1-card-mask-on-front-v001.png' },
  'agenda-armor': { image: '/sprites/act-1/cards/act1-card-sanitizer-shield-front-v001.png' },
  'hard-stop': { image: '/sprites/act-1/cards/act1-card-curfew-notice-front-v001.png' },
  'opening-gambit': { image: '/sprites/act-1/cards/act1-card-lockdown-decree-front-v002.png' },
  'second-wind-sigil': { image: '/sprites/act-1/cards/act1-card-pcr-of-destiny-front-v001.png' },
} as const satisfies Record<string, { image: string }>;

export const ACT_ONE_DECK_TEMPLATES: readonly ActOneCardDefinition[] = [
  {
    id: 'calendar-jab',
    name: 'Протокол удалёнки',
    cost: 1,
    description: 'Наносит 6 урона и переводит спор на кухню.',
    type: 'attack',
    damage: 6,
  },
  {
    id: 'reply-all',
    name: 'Спираль домового чата',
    cost: 2,
    description: 'Наносит 11 урона всем, кто зачем-то прочитал до конца.',
    type: 'attack',
    damage: 11,
  },
  {
    id: 'inbox-guard',
    name: 'Маску надел',
    cost: 1,
    description: 'Даёт 6 защиты и право смотреть строго глазами.',
    type: 'block',
    block: 6,
  },
  {
    id: 'agenda-armor',
    name: 'Санитайзерный щит',
    cost: 1,
    description: 'Даёт 4 защиты и наносит 4 урона запахом победы над микробами.',
    type: 'skill',
    block: 4,
    damage: 4,
  },
  {
    id: 'hard-stop',
    name: 'Уведомление о комендантском часу',
    cost: 1,
    description: 'Наносит 7 урона тоном официальной рассылки.',
    type: 'attack',
    damage: 7,
  },
] as const;

export const ACT_ONE_REWARD_CARD_LIBRARY = {
  'opening-gambit': {
    id: 'opening-gambit',
    name: 'Указ о локдауне',
    cost: 0,
    description: 'Только против босса. Один лист бумаги, и проходная уже делает вид, что всё поняла.',
    type: 'special',
    bossDamageRatio: 0.5,
    persistent: true,
    singleUse: true,
  },
  'second-wind-sigil': {
    id: 'second-wind-sigil',
    name: 'ПЦР судьбы',
    cost: 0,
    description: 'Только против босса. PDF такой серьёзный, что хаос сам ищет бахилы.',
    type: 'special',
    bossDamageRatio: 0.5,
    persistent: true,
    singleUse: true,
  },
} as const satisfies Record<string, ActOneCardDefinition>;
