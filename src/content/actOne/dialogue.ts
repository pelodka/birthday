import type { SceneDefinition, WorldDialogueSequenceDefinition } from '../../types';
import { ACT_ONE_REWARD_CARD_LIBRARY, type ActOneCardDefinition } from './cards';
import type { ActOneEncounterActorId } from './visuals';

export interface ActOneEncounterTemplate {
  id: ActOneEncounterActorId;
  name: string;
  battleName: string;
  hp: number;
  maxHp: number;
  damage: number;
  intent: string;
  battleIntro: string;
  dialogue: WorldDialogueSequenceDefinition;
  dialogueSequence?: WorldDialogueSequenceDefinition[];
  responseDialogue?: WorldDialogueSequenceDefinition;
  rewardCard?: ActOneCardDefinition;
  rewardCopy?: string;
  boss?: boolean;
}

export const ACT_ONE_INTRO_DIALOGUE: WorldDialogueSequenceDefinition = {
  speakerId: 'boss-prime',
  speakerLabel: 'Александр',
  lines: [
    'Петербург, 2020. Единственный дресс-код, который принимают за деловой - FPP-маска. Костюм теперь просто для галочки.',
    'Офис то открывают, то закрывают, то «мы уточним» — это не расписание, это генератор случайных правил.',
    'Ладно. Квест без ТЗ? Будем играть по правилам, которые ещё не признали незаконными.',
  ],
  anchor: 'player',
};

export const ACT_ONE_INTRO_DIALOGUE_SEQUENCE: WorldDialogueSequenceDefinition[] = [
  {
    ...ACT_ONE_INTRO_DIALOGUE,
    lines: ACT_ONE_INTRO_DIALOGUE.lines.slice(0, 2),
  },
  {
    ...ACT_ONE_INTRO_DIALOGUE,
    lines: ACT_ONE_INTRO_DIALOGUE.lines.slice(2),
  },
];

export function createActOneEncounterTemplates(scene: SceneDefinition): ActOneEncounterTemplate[] {
  const podgornyName = scene.bossEncounter?.name ?? 'Подгорный';
  const podgornyDialogueSequence: WorldDialogueSequenceDefinition[] = [
    {
      speakerId: 'meeting-minotaur',
      speakerLabel: podgornyName,
      lines: ['Стоп. Вход запрещён.'],
      anchor: 'enemy',
    },
    {
      speakerId: 'boss-prime',
      speakerLabel: 'Александр',
      lines: ['Я по вызову.'],
      anchor: 'player',
    },
    {
      speakerId: 'meeting-minotaur',
      speakerLabel: podgornyName,
      lines: ['Вызова нет. Списка нет. Офис закрыт на карантин.'],
      anchor: 'enemy',
    },
    {
      speakerId: 'boss-prime',
      speakerLabel: 'Александр',
      lines: ['Болеете?'],
      anchor: 'player',
    },
    {
      speakerId: 'meeting-minotaur',
      speakerLabel: podgornyName,
      lines: ['Не спорьте с регламентом.'],
      anchor: 'enemy',
    },
    {
      speakerId: 'boss-prime',
      speakerLabel: 'Александр',
      lines: ['Я и не спорю. У меня QR-код имеется.'],
      anchor: 'player',
    },
    {
      speakerId: 'meeting-minotaur',
      speakerLabel: podgornyName,
      lines: ['...Кто это сканировать будет? У меня телефон кнопочный.'],
      anchor: 'enemy',
    },
    {
      speakerId: 'boss-prime',
      speakerLabel: 'Александр',
      lines: ['Аналоговая охрана в цифровом офисе.'],
      anchor: 'player',
    },
  ];

  return [
    {
      id: 'arina-trofimova',
      name: 'Арина Трофимова',
      battleName: 'Арина, HR Brand на тревожной тяге',
      hp: 20,
      maxHp: 20,
      damage: 4,
      intent: 'Отменённая конференция: 4',
      battleIntro: 'Арина раскрывает календарь отменённых конференций и смотрит на него как на место преступления.',
      dialogue: {
        speakerId: 'arina-trofimova',
        speakerLabel: 'Арина',
        lines: [
          'Саша, конференции отменили, митапы отменили. Собеседования с кандидатами теперь похожи на свидания вслепую. Только вместо ресторана -Zoom, а вместо цветов - ссылка на вакансию.',
        ],
        anchor: 'enemy',
      },
      responseDialogue: {
        speakerId: 'boss-prime',
        speakerLabel: 'Александр',
        lines: [
          'В этом есть своя прелесть - мы можем расшарить счёт за интернет с неподходящим кандидатом. Никто не узнает. Даже тимлид, если он сам не подключался с мобильного.',
        ],
        anchor: 'player',
      },
      rewardCard: ACT_ONE_REWARD_CARD_LIBRARY['opening-gambit'],
      rewardCopy: '«Указ о локдауне» получен. Прибережём его для финального разговора.',
    },
    {
      id: 'slide-cultist',
      name: 'Аня Тихомирова',
      battleName: 'Аня, первичка в режиме тревоги',
      hp: 24,
      maxHp: 24,
      damage: 5,
      intent: 'Возврат отчёта: 5',
      battleIntro: 'Аня открывает папку ковидных расходов. Папка выглядит так, будто уже хочет домой.',
      dialogue: {
        speakerId: 'slide-cultist',
        speakerLabel: 'Аня Т',
        lines: [
          'Саша, в отчёте по персоналу появилась новая строка: «расходы на поддержание морального духа в период пандемии путем создания собственных эмодзи в Teams».',
          'Стикер — это имущество компании. Пусть представят акт приёма-передачи.',
        ],
        anchor: 'enemy',
      },
      responseDialogue: {
        speakerId: 'boss-prime',
        speakerLabel: 'Саша',
        lines: ['Эх, стикер – не имущество,  это арт-объект. А искусство не амортизируется. Оно вечное, как и мое терпение.'],
        anchor: 'player',
      },
      rewardCard: ACT_ONE_REWARD_CARD_LIBRARY['second-wind-sigil'],
      rewardCopy: '«ПЦР судьбы» получен. Самый серьёзный PDF эпохи теперь на нашей стороне.',
    },
    {
      id: 'meeting-minotaur',
      name: scene.bossEncounter?.name ?? 'Подгорный',
      battleName: 'Подгорный, Аналоговый Страж Цифрового Офиса',
      hp: 64,
      maxHp: 64,
      damage: 8,
      intent: 'Проверка по журналу: 8',
      battleIntro: 'Подгорный поднимает журнал посещений так, будто журнал сейчас попросит зарплату.',
      dialogue: podgornyDialogueSequence[0],
      dialogueSequence: podgornyDialogueSequence,
      boss: true,
    },
  ];
}
