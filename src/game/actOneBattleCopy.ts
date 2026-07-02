import type { ActOneCardDefinition, ActOneEncounterActorId } from '../content/actOne';

export interface ActOneBattleCopyEncounter {
  id: ActOneEncounterActorId;
  name: string;
  battleName: string;
  boss?: boolean;
}

type ActOneBattleCopyCard = Pick<ActOneCardDefinition, 'id' | 'name'>;

export function getActOneBattleName(encounter: ActOneBattleCopyEncounter): string {
  return encounter.battleName || encounter.name;
}

export function formatEncounterIntent(encounter: ActOneBattleCopyEncounter, damage: number): string {
  if (encounter.boss) {
    return damage >= 10 ? `Новая норма: ${damage}` : `Проверка по журналу: ${damage}`;
  }

  if (encounter.id === 'slide-cultist') {
    return damage >= 6 ? `Акт на доработку: ${damage}` : `Возврат отчёта: ${damage}`;
  }

  return damage >= 5 ? `Воронка найма горит: ${damage}` : `Отменённая конференция: ${damage}`;
}

export function getActOneBattleLogEyebrow(encounter: ActOneBattleCopyEncounter): string {
  switch (encounter.id) {
    case 'slide-cultist':
      return 'Сводка абсурда';
    case 'meeting-minotaur':
      return 'Хроника эпохи';
    default:
      return 'Сводка абсурда';
  }
}

export function describeActOneTurnStart(currentTurn: number, encounter?: ActOneBattleCopyEncounter): string {
  if (encounter?.id === 'arina-trofimova') {
    const beats = [
      'Александр проверяет воронку и делает вид, что у паники тоже есть SLA.',
      'Конференции отменены, митапы исчезли, но кандидаты где-то в интернете всё ещё делают вид, что не читают сообщения.',
      'HR-бренд шумит как календарь с температурой. Александр выбирает спокойный ход.',
    ];

    return `Ход ${currentTurn}. ${beats[(currentTurn - 1) % beats.length]}`;
  }

  if (encounter?.id === 'slide-cultist') {
    const beats = [
      'Александр сверяет офисную реальность с папкой документов. Реальность просит прислать всё одним письмом.',
      'Удалёнка удалёнкой, но первичка всё равно хочет подпись, основание и Excel с моральной поддержкой.',
      'Аня смотрит на расходы так, будто один чек сейчас попросит больничный.',
    ];

    return `Ход ${currentTurn}. ${beats[(currentTurn - 1) % beats.length]}`;
  }

  if (encounter?.id === 'meeting-minotaur') {
    const beats = [
      'Александр ищет в регламенте выход, но находит сноску, журнал и лёгкое осуждение.',
      'Пост охраны готов. Термометр готов. Здравый смысл стоит снаружи и машет бейджем.',
      'Норма отменяет норму, но требует соблюдать обе. Александр достаёт папку с лицом человека, который привык.',
    ];

    return `Ход ${currentTurn}. ${beats[(currentTurn - 1) % beats.length]}`;
  }

  const beats = [
    'Александр выдыхает, закрывает лишние вкладки в голове и снова берётся за эпоху.',
    'На столе карты, в воздухе санитайзер, в календаре паника с повтором. Работаем.',
    'Мир всё ещё ведёт себя как сырой патч, но Александр уже знает, куда не нажимать.',
  ];

  return `Ход ${currentTurn}. ${beats[(currentTurn - 1) % beats.length]}`;
}

export function describeActOneCardLead(card: ActOneBattleCopyCard): string {
  switch (card.id) {
    case 'calendar-jab':
      return '«Протокол удалёнки» вступает в силу. Весь офис мысленно рассажен по кухням и спорит с роутером.';
    case 'reply-all':
      return '«Спираль домового чата» раскручивается. Нотификации летят быстрее здравого смысла.';
    case 'inbox-guard':
      return '«Маску надел» срабатывает. Александр снова выглядит единственным взрослым в комнате.';
    case 'agenda-armor':
      return '«Санитайзерный щит» распыляется так щедро, будто сейчас подпишет акт выполненных работ.';
    case 'hard-stop':
      return '«Уведомление о комендантском часу» приходит тем самым тоном, после которого все сразу вспоминают про дом.';
    case 'opening-gambit':
      return '«Указ о локдауне» спускается сверху с видом бумаги, которая сама себя согласовала.';
    case 'second-wind-sigil':
      return '«ПЦР судьбы» предъявлен. Даже хаос на секунду спрашивает, где бахилы.';
    default:
      return `«${card.name}» идёт в ход.`;
  }
}

export function describeActOneBlockFollowup(card: ActOneBattleCopyCard): string {
  switch (card.id) {
    case 'inbox-guard':
      return 'Воздух сразу становится безопаснее, а тон происходящего делает вид, что он из рассылки.';
    case 'agenda-armor':
      return 'Вокруг Александра образуется санитарная аура уровня «не подходить, если не бухгалтерия».';
    default:
      return 'Собранность Александра снова делает своё тихое, но очень обидное для врага дело.';
  }
}

export function describeActOneEnemyReaction(encounter: ActOneBattleCopyEncounter): string {
  switch (encounter.id) {
    case 'arina-trofimova':
      return 'Арина на секунду теряет власть над воронкой найма и подозревает календарь в саботаже.';
    case 'slide-cultist':
      return 'Аня на секунду теряет счёт основаниям, но папка уже собирает контраргументы.';
    case 'meeting-minotaur':
      return 'Подгорный впервые выглядит как регламент, который распечатали, но не заламинировали.';
    default:
      return `${getActOneBattleName(encounter)} выглядит куда менее убедительно.`;
  }
}

export function describeActOneEnemyTurnLead(encounter: ActOneBattleCopyEncounter): string {
  switch (encounter.id) {
    case 'arina-trofimova':
      return 'Ход врага. Арина открывает список отменённых конференций и грустит профессионально.';
    case 'slide-cultist':
      return 'Ход врага. Аня достаёт папку, где ковидные расходы лежат с видом свидетелей.';
    case 'meeting-minotaur':
      return 'Ход врага. Подгорный сверяет температуру, журнал и право Александра быть возле двери.';
    default:
      return 'Ход врага. Начинается очередная неприятная импровизация.';
  }
}

export function describeActOneEnemyResolution(
  encounter: ActOneBattleCopyEncounter,
  blocked: number,
  dealt: number,
): string {
  if (dealt === 0) {
    switch (encounter.id) {
      case 'arina-trofimova':
        return 'Конференции исчезают из календаря, но Александр пропускает HR-панику мимо себя, как лишний invite.';
      case 'slide-cultist':
        return 'Карантинный акт возвращается на доработку, но Александр отбивает его фразой: «Пришлите шаблон без эмоций».';
      case 'meeting-minotaur':
        return 'Термометр показывает температуру бюрократии, но Александр держит лицо человека с письмом от руководства.';
      default:
        return 'Шуму много, результата почти никакого.';
    }
  }

  if (blocked > 0) {
    switch (encounter.id) {
      case 'arina-trofimova':
        return 'Одна отменённая конференция всё же попадает в нервную систему. Не больно, но календарь хмыкнул.';
      case 'slide-cultist':
        return 'Часть папки уходит в защиту, но один чек всё же требует объяснение и чай.';
      case 'meeting-minotaur':
        return 'Даже когда половину нормы удаётся отбить, пост охраны блокирует проход формулировкой «ну вы же понимаете».';
      default:
        return `${getActOneBattleName(encounter)} всё же продавливает немного хаоса.`;
    }
  }

  switch (encounter.id) {
    case 'arina-trofimova':
      return 'Арина обрушивает на Александра срочный план найма без единого офлайн-ивента и с лишним оптимизмом.';
    case 'slide-cultist':
      return 'Аня наносит удар папкой расходов, правил и подписей, которые стесняются появиться.';
    case 'meeting-minotaur':
      return 'Подгорный требует подпись за чтение регламента, который нельзя читать без предварительной подписи.';
    default:
      return `${getActOneBattleName(encounter)} оставляет после себя ощутимый привкус абсурда.`;
  }
}

export function describeActOneEnergyShortage(card: ActOneBattleCopyCard): string {
  return `Для «${card.name}» сейчас не хватает ни энергии, ни терпения к этой эпохе.`;
}
