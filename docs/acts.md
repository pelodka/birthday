# Acts

## Overview

| Act | Scene ID | Runtime | Reward / Outcome |
| --- | --- | --- | --- |
| 1 | `act-1-calendar` | DOM/CSS side-scroll card battle | `Золотая маска` |
| 2 | `act-2-catchphrase` | Three.js field + DOM JRPG battle UI | `Коньяк Арарат` |
| 3 | `act-3-weekend` | Three.js first-person corridor shootout | `Пэ Эм Жэ` |
| 4 | `act-4-finale` | DOM/CSS finale route | Credits and gift video |

## Shared Flow

1. `CLICK ME` start overlay.
2. Intro video.
3. `НАЗАД В ПРОШЛОЕ` handoff.
4. `САНКТ-ПЕТЕРБУРГ / 2020` title card.
5. Acts 1-4 in order, with title-card handoffs:
   - `ЕРЕВАН / 2022`
   - `БЕРЛИН / 2025`
   - `ЮБИЛЕЙ`

The director owns the shell, relic rack, title cards, scene mounting, and direct scene launch.

## Shared Controls

- Keyboard/mouse are supported throughout.
- Gamepad left stick / D-pad: movement and menu/card cursor navigation.
- Gamepad right stick: Act 3 look.
- `X`: confirm dialogue, menus, cards, selected targets, artifacts, and overlays.
- `O`: Act 2 back/cancel.
- `R2`: Act 3 fire.

## Act 1

Runtime: [`src/game/domActs.ts`](../src/game/domActs.ts)  
Content: [`src/content/actOne`](../src/content/actOne)  
Spec: [Act 1 Mechanics](./act-1.md)

Flow:

1. Alexander starts in the Saint Petersburg side-scroll lane.
2. Two intro bubbles unlock movement and show a centered three-second `GO ->` prompt.
3. The player walks into three one-on-one card battles.
4. The first two victories grant boss-only special cards, then show the same `GO ->` prompt before the next approach.
5. The boss fight always includes both special cards.
6. Defeating Подгорный drops `Золотая маска`.
7. Clicking the artifact triggers the final Act 1 dialogue and the `ЕРЕВАН / 2022` handoff.

## Act 2

Runtime: [`src/game/actTwoThree.ts`](../src/game/actTwoThree.ts)  
Content: [`src/content/actTwo`](../src/content/actTwo)  
Spec: [Act 2 Mechanics](./act-2.md)

Flow:

1. Boss Prime explores a fixed-camera Yerevan field alone.
2. Five movement steps trigger the taxi encounter.
3. Юрист Андрей joins after the opening battle.
4. Five more steps trigger the duo encounter.
5. Five final steps trigger Гигантский Хинкали.
6. The boss drops `Коньяк Арарат`.
7. Clicking the artifact routes through `БЕРЛИН / 2025`.

## Act 3

Runtime: [`src/game/threeAct.ts`](../src/game/threeAct.ts)  
Visual helpers: [`src/game/actThreeVisuals.ts`](../src/game/actThreeVisuals.ts)  
Content: [`src/content/actThree`](../src/content/actThree)  
Spec: [Act 3 Mechanics](./act-3.md)

Flow:

1. Two Russian instruction prompts gate preload and render warmup.
2. The mission HUD shrinks into the upper-right checklist.
3. The player clears `A1 Zertifikat` with two shots.
4. The player collects the A1 certificate sprite.
5. The player clears `Einburgerungstest` with two shots.
6. The player collects the 330/33 result sprite.
7. LEA takes three registered hits.
8. The reward appears as a large in-scene `Пэ Эм Жэ` asset.
9. Clicking it routes through `ЮБИЛЕЙ`.

## Act 4

Runtime: [`src/game/domActs.ts`](../src/game/domActs.ts)  
Flow helpers: [`src/game/actFourFinaleFlow.ts`](../src/game/actFourFinaleFlow.ts)  
Credits: [`src/game/actFourCredits.ts`](../src/game/actFourCredits.ts)  
Content: [`src/content/actFour`](../src/content/actFour)  
Spec: [Act 4 Mechanics](./act-4.md)

Flow:

1. Alexander enters the jubilee zone.
2. The player discovers `Титан Пятидесятилетия` in-world.
3. The camera reveal shows the boss scale.
4. Two zero-damage cards produce oversized `0 DAMAGE` feedback.
5. `Вызов Валеры` appears and starts the support sequence.
6. Valera explains the rules, transforms, conjures guitar support, and holds during artifact consumption.
7. The three relics are consumed into Alexander with visible action callouts.
8. The finale switches into horizontal anime showdown panels.
9. A center `Press X to win` prompt starts the post-showdown cutscene.
10. The cutscene holds its final frame, then credits play.
11. `Тут Подарок` opens the gift video.
12. The returned final screen shows `СПАСИБО ЗА ИГРУ` and `Начать заново`.

Direct QA:

```text
?scene=act-4-finale&autoplay=1&act4=ending
?scene=act-4-finale&autoplay=1&act4=credits
```

## Failure Model

Acts 1 and 2 clamp player/party HP to at least `1`. Act 3 has no enemy counterfire. The project is tuned for guided playback rather than fail-state challenge.
