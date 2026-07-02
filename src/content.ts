import type { GameContent, RelicDefinition, SceneDefinition } from './types';
import { ACT_ONE_AUDIO } from './content/actOne';
import { ACT_FOUR_AUDIO } from './content/actFour';
import { createActTwoScene } from './content/actTwo';
import { buildActThreeScene } from './content/actThree';

const relics: RelicDefinition[] = [
  {
    id: 'calendar-core',
    name: 'Золотая маска',
    comedicTheme: 'Золотая маска, золотая',
    bossSource: 'Подгорный',
    transformationRole: 'Золотая маска, золотая',
    pixelLabel: 'MASK',
    finaleLabel: 'Золотая маска',
    color: '#ffcf56',
  },
  {
    id: 'catchphrase-visor',
    name: 'Коньяк Арарат',
    comedicTheme: 'Папа рад и мама рад',
    bossSource: 'Гигантский Хинкали',
    transformationRole: 'Коньяк Арарат (папа рад и мама рад)',
    pixelLabel: 'AR',
    finaleLabel: 'Коньяк Арарат',
    color: '#ff6d8d',
    imagePath: '/sprites/act-2/relics/ararat-cognac.png',
  },
  {
    id: 'residence-permit',
    name: 'Пэ Эм Жэ',
    comedicTheme: 'ПМЖ как бумажный бессмертный режим',
    bossSource: 'LEA, Keeper of Appointments',
    transformationRole: 'ПЭ ЭМ ЖЭ (бумага постоянная)',
    pixelLabel: 'ПМЖ',
    finaleLabel: 'Пэ Эм Жэ',
    color: '#57d7ff',
    imagePath: '/sprites/act-3/relics/pmzh-residence-permit.png',
  },
];

const scenes: SceneDefinition[] = [
  {
    id: 'act-1-calendar',
    actNumber: 1,
    title: 'Санкт-Петербург 2019-2020: Протокол локдауна',
    subtitle: 'Карточная битва в духе Slay the Spire',
    homage: 'Card battler',
    visualEra: 'deck-gothic',
    runtime: 'dom',
    objective:
      'Пройдите три постановочных столкновения, дайте врагам самим открыть дуэли и добейте Подгорного двумя картами, которые пахнут принтером и тревогой.',
    controls:
      'В боковой прокрутке используйте Left/Right, A/D или стик геймпада; X подтверждает активные кнопки, затем разыгрывайте карты и завершайте ход в бою.',
    intro:
      'Акт 1 проходит в боковой прокрутке: офисный локдаун, две тревоги на подходе и босс, которого можно победить только бумагой, у которой есть настроение.',
    outro: 'Ну что ж, вхожу по QR-коду с чистыми намерениями. Проверено санитайзером!',
    mechanicsHighlights: [
      'Intro dialogue bubble',
      'Side-scroll camera follow',
      'Three encounter duels',
      'Two boss cards',
      'Center-screen artifact drop',
    ],
    enemyRoster: [
      'Арина Трофимова / HR Brand на тревожной тяге',
      'Аня Тихомирова / Первичка в режиме тревоги',
      'Подгорный / Аналоговый Страж Цифрового Офиса',
    ],
    backgroundImage: '/backgrounds/act-1-saint-petersburg-lockdown-snes.png',
    backgroundImagePosition: 'center center',
    backgroundFloorOffset: '220px',
    audio: ACT_ONE_AUDIO,
    palette: {
      background: '#120d18',
      accent: '#ffcf56',
      ui: '#fff0d9',
    },
    bossEncounter: {
      id: 'meeting-minotaur',
      name: 'Подгорный',
      role: 'Начальник физической безопасности и норм в офисе',
      dramaticTagline: 'Босс-фаза, где ковидные правила и проходной режим делают вид, что это они наняли здравый смысл.',
      comedicTheme: 'Физическая безопасность, ковидные нормы и офисные правила, которые победили логику',
      introLine: 'Стоп. Вход запрещён.',
      victoryLine: 'Ну что ж, вхожу по QR-коду с чистыми намерениями. Проверено санитайзером!',
      tauntLines: [
        'Я по вызову.',
        'Вызова нет. Списка нет. Офис закрыт на карантин.',
        'Болеете?',
        'Не спорьте с регламентом.',
        'Я и не спорю. У меня QR-код имеется.',
        '...Кто это сканировать будет? У меня телефон кнопочный.',
        'Аналоговая охрана в цифровом офисе.',
      ],
      attackPatternDescription: 'Боковой подход переходит в три дуэли один на один, а две особые карты сохраняются специально для финального регламента.',
    },
    relicReward: relics[0],
  },
  createActTwoScene(relics[1]),
  buildActThreeScene(relics[2]),
  {
    id: 'act-4-finale',
    actNumber: 4,
    title: 'Финал: Протокол Юбилея',
    subtitle: 'Титан Пятидесятилетия',
    homage: 'Retro giant-boss fake-out into anime finale',
    visualEra: 'anime-finale',
    runtime: 'dom',
    objective:
      'Дойдите до финальной инстанции юбилея, докажите, что обычные карты исчерпали мандат, вызовите Валеру и запустите артефакты.',
    controls:
      'В боковой прокрутке используйте Left/Right, A/D или стик геймпада; X подтверждает реплики и активные кнопки, затем разыгрывайте карты.',
    intro:
      'Все предыдущие акты были не просто испытаниями, а сборкой финальной формы. Пятидесятилетие — не проблема, а источник питания, к которому Валера, конечно, нашёл кабель.',
    outro:
      'Артефакты приняты. Обычная физика больше не имеет юридической силы.',
    mechanicsHighlights: [
      'Гигантский zoom reveal босса',
      'Фейк-аут с картами на 0 урона',
      'Правила финала от Валеры',
      'Поглощение артефактов',
      'Огромная кнопка Press X to win',
      'Катсцена и титры без возврата в бой',
    ],
    enemyRoster: ['Титан Пятидесятилетия / Финальная инстанция юбилея'],
    backgroundImage: '/backgrounds/act-4/berlin-jubilee-finale.png',
    backgroundImagePosition: 'center center',
    backgroundFloorOffset: '220px',
    audio: ACT_FOUR_AUDIO,
    palette: {
      background: '#120d18',
      accent: '#e4f85f',
      ui: '#fff0d9',
    },
    bossEncounter: {
      id: 'titan-fifty',
      name: 'Титан Пятидесятилетия',
      role: 'Финальная инстанция юбилея',
      dramaticTagline: 'Юбилейная проверка, где обычные карты выглядят как люди без записи, а 50 — не возраст, а источник питания.',
      comedicTheme: 'Пятидесятилетие как источник питания, а не возрастная проблема',
      introLine: 'Пятидесятый уровень обнаружен. Юбилейный протокол открывает дело.',
      victoryLine: 'Юбилейный допуск подтверждён. Обычная физика отводится от дела.',
      tauntLines: [
        'Обычные карты действуют только до сорок девятого уровня. Дальше вступает стаж.',
        'HP: бесконечность. Основание: торжественность цифры.',
        'Полвека — это не возраст. Это категория босса.',
      ],
      attackPatternDescription: 'Обычные карты наносят 0 урона, затем появляется поддержка Валеры и начинается протокол артефактов.',
    },
  },
];

export const gameContent: GameContent = {
  fallbackRig: {
    colors: {
      base: '#e9f8ff',
      trim: '#ffcf56',
      accent: '#57d7ff',
      outline: '#102033',
    },
  },
  relics,
  scenes,
  transformation: {
    finalFormName: 'МЕХА-ЮБИЛЕЙ: ВОСХОДЯЩАЯ ФОРМА',
    introCopy:
      'Артефакты загораются по очереди и признают единственного человека, который может превратить roast-энергию в кинематографическую неизбежность.',
    steps: [
      {
        relicId: 'calendar-core',
        callout: 'ЗОЛОТАЯ МАСКА НАДЕТА',
        effect: 'Золотая маска превращает пандемийную выдержку в спокойствие человека, который продолжает функционировать, пока реальность буферизуется.',
        roleLabel: 'Маска',
      },
      {
        relicId: 'catchphrase-visor',
        callout: 'КОНЬЯК АРАРАТ ВЫПИТ',
        effect: 'Коньяк Арарат включает тактическое зрение: слабые места, дедлайны и нужные знакомства подсвечены.',
        roleLabel: 'Арарат',
      },
      {
        relicId: 'residence-permit',
        callout: 'ПЭ ЭМ ЖЭ ПРЕДЪЯВЛЕН',
        effect: 'Пэ Эм Жэ превращает берлинский допуск в тягу последнего рывка: маршрут официально невозможен, значит, проходим.',
        roleLabel: 'ПМЖ',
      },
    ],
    finalCallout: 'АБСОЛЮТНАЯ ФОРМА ЮБИЛЕЯ',
  },
  finalePrompt: {
    label: 'НАЖМИ X ДЛЯ ПОБЕДЫ',
    copy: 'Один ввод. Максимальный юбилей.',
    payoffBeats: [
      'РАЗРУШИТЕЛЬ ПЛАНЁРОК',
      'ПОКОРИТЕЛЬ БЮРОКРАТИИ',
      'ВЛАДЫКА НУЖНЫХ ЗНАКОМСТВ',
      'АБСОЛЮТНАЯ ФОРМА ЮБИЛЕЯ',
    ],
    heartfeltCopy: [
      'Пятьдесят уровней пройдено. Главный апгрейд только что завершён.',
      'Спасибо за истории, энергию, стандарт качества и умение проходить невозможное как будто так и надо.',
      'С юбилеем, Александр.',
    ],
  },
};
