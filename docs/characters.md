# Characters

## Hero

| Field | Value |
| --- | --- |
| Name | Alexander / Boss Prime |
| Role | Playable hero across all acts |
| Finale form | `МЕХА-ЮБИЛЕЙ: ВОСХОДЯЩАЯ ФОРМА` |

Core traits:

- Commanding, playful, competent under absurd pressure.
- The joke lands first; the respect lands second.
- Visual identity stays readable across sprite, low-poly, first-person, and anime-finale modes.

Palette anchors:

- `#ffcf56`
- `#ff6d8d`
- `#57d7ff`
- `#f2f7ff`

## Bosses

| Act | Boss | Theme | Reward |
| --- | --- | --- | --- |
| 1 | Подгорный | Covid-era office security and impossible rules | `Золотая маска` |
| 2 | Гигантский Хинкали | Hospitality, bureaucracy, office-opening appetite | `Коньяк Арарат` |
| 3 | LEA, Keeper of Appointments | Residency appointments and administrative proof | `Пэ Эм Жэ` |
| 4 | Титан Пятидесятилетия | Jubilee scale reveal and zero-damage finale fake-out | Credits/gift ending |

## Supporting Cast

| Act | Characters |
| --- | --- |
| 1 | Арина Трофимова, Аня Тихомирова |
| 2 | Юрист Андрей / Planner Mage, Таксист Мигран, Антоха Гвоздодер, Вадимус Хэвиметал |
| 3 | A1 Zertifikat, Einburgerungstest |
| 4 | Валера |

## Relics

| Relic | ID | Source | Finale callout |
| --- | --- | --- | --- |
| `Золотая маска` | `calendar-core` | Act 1 | `ЗОЛОТАЯ МАСКА НАДЕТА` |
| `Коньяк Арарат` | `catchphrase-visor` | Act 2 | `КОНЬЯК АРАРАТ ВЫПИТ` |
| `Пэ Эм Жэ` | `residence-permit` | Act 3 | `ПЭ ЭМ ЖЭ ПРЕДЪЯВЛЕН` |

The Act 4 relic ritual consumes these three relics into Alexander before the anime showdown.

## Act 4 Support

| Field | Value |
| --- | --- |
| Character | Валера |
| Support card | `Вызов Валеры` |
| Metadata | [`src/content/actFour/assets.ts`](../src/content/actFour/assets.ts) |
| Sprite folder | [`public/sprites/act-4/support`](../public/sprites/act-4/support) |

Sequence:

1. Reverse summon from `valera-transform-1-sheet.png`.
2. Idle dialogue on `valera-idle-sheet.png`.
3. First and second transformation sheets.
4. Guitar conjure.
5. Guitar support loop during artifact consumption.
6. Handoff into anime showdown.

## Finale Payoff

The relic ritual launches the horizontal anime showdown: Jubilee in the upper panel, Alexander in the lower panel. After six seconds, `Press X to win` appears. Confirming plays the post-showdown cutscene, holds the final frame, then fades into the Kojima strikeout gag, `БРИГАДА ПРОДАКШЕНС`, balloon-letter `С ДНЕМ РОЖДЕНИЯ`, the `Тут Подарок` gift video, and the final `СПАСИБО ЗА ИГРУ` restart screen.
