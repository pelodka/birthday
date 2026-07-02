import type { DialogueSequenceDefinition, WorldDialogueSequenceDefinition } from '../../types';
import { ACT_FOUR_BOSS } from './assets';

export interface ActFourRelicConsumptionBeat extends DialogueSequenceDefinition {
  relicId?: string;
}

export const ACT_FOUR_INTRO_DIALOGUE: WorldDialogueSequenceDefinition = {
  speakerId: 'boss-prime',
  speakerLabel: 'Александр',
  lines: [
    'Юбилейная зона загружена. Все предыдущие акты были не испытаниями, а сборкой финальной формы.',
    'Пандемия, Ереван, Берлин — инвентарь не молчал. Он ждал, пока число 50 включит питание.',
  ],
  anchor: 'player',
};

export const ACT_FOUR_REVEAL_DIALOGUE: DialogueSequenceDefinition = {
  speakerId: 'titan-fifty',
  speakerLabel: ACT_FOUR_BOSS.name,
  lines: [
    'Соискатель Александр, уровень 50 обнаружен. Пятидесятилетие активировано как категория босса.',
    'Для допуска к юбилею предъявите справки, истории и Валеру: система не нашла другого человека, который объяснит финал без флипчарта.',
  ],
};

export const ACT_FOUR_FOOT_DIALOGUE: DialogueSequenceDefinition = {
  speakerId: 'boss-prime',
  speakerLabel: 'Александр',
  lines: ['Так. Это нога или отдельный административный район?', 'Если это торт, я заранее отказываюсь от углового кусочка.'],
};

export const ACT_FOUR_REVEAL_RESPONSE: DialogueSequenceDefinition = {
  speakerId: 'boss-prime',
  speakerLabel: 'Александр',
  lines: [
    'Я шёл к торту, а пришёл к госуслуге с HP и чувством собственной важности.',
    'Ладно. Если юбилей стал регламентом, значит, его можно пройти по процедуре и слегка обидеть результатом.',
  ],
};

export const ACT_FOUR_SUPPORT_DIALOGUE: readonly DialogueSequenceDefinition[] = [
  {
    speakerId: 'valera',
    speakerLabel: 'Валера',
    lines: ['Так. Стоп. Похоже, карты нам больше не помогут. Их теперь разве что в очко...или преферанс разыграть.'],
  },
  {
    speakerId: 'boss-prime',
    speakerLabel: 'Александр',
    lines: ['Это давайте без меня! Но могу вам стратегию выигрышную через GPT подсказать, чтобы целее были!'],
  },
  {
    speakerId: 'valera',
    speakerLabel: 'Валера',
    lines: ['Так, ладно, что тут у нас. Допускаю, что обычный урон не проходит'],
  },
  {
    speakerId: 'valera',
    speakerLabel: 'Валера',
    lines: ['...зато проходит всё, что болело и наболело. Похоже, эта штука made in Germany! Нам срочно нужен термин и сейчас!'],
  },
  {
    speakerId: 'boss-prime',
    speakerLabel: 'Александр',
    lines: ['Термин одним днём? Да я скорее не глядя дам какой-нибудь аппрув, чем поверю в возможность его сегодня получить.'],
  },
  {
    speakerId: 'valera',
    speakerLabel: 'Валера',
    lines: ['Увы. Медлить нельзя: мне нужно срочно мимикрировать под местного, иначе термин нам не получить. Не трогай загрузку, а то мне придется репортить тебе по пятницам в таком виде!'],
  },
];

export const ACT_FOUR_SUPPORT_PHASE_DIALOGUE: Record<
  'transform' | 'second-transform' | 'conjure',
  DialogueSequenceDefinition
> = {
  transform: {
    speakerId: 'valera',
    speakerLabel: 'Валера',
    lines: ['Загружаю модуль "Берлинец хрестоматийный"', 'Уберите детей от экрана! Сами подойдите поближе!'],
  },
  'second-transform': {
    speakerId: 'valera',
    speakerLabel: 'Валера',
    lines: ['"Гитара подключена и я, кажется, тоже!'],
  },
  conjure: {
    speakerId: 'valera',
    speakerLabel: 'Валера',
    lines: [
      '*слезливо исполняет "Ветер Перемен" локального вокально-инструментального ансамбля Скорпионы',
      'Сработало! Заебашаусхуйамт согласен выдать термин! *Получаю термин вне очереди*',
      '*Наблюдаю, как очередь взрывается от беспорядка, испытываю немецкое Schadenfreude — радость от чужих несчастий или неудач*',
    ],
  },
};

export const ACT_FOUR_RELIC_CONSUMPTION_DIALOGUE: readonly ActFourRelicConsumptionBeat[] = [
  {
    speakerId: 'valera',
    speakerLabel: 'Валера',
    lines: ['Получилось! Теперь артефакты полетят к тебе по одному. Стой ровно, как человек на фото, которое всё равно не примут с первого раза и придется переделывать!'],
  },
];
