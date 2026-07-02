# Act 4 Mechanics

Act 4 is the DOM/CSS Jubilee finale route. It reuses the Act 1 side-scroll/card foundation, then branches into the support-card sequence, relic ritual, anime showdown, cutscene, credits, and gift video.

## Ownership

- Runtime: [`src/game/domActs.ts`](../src/game/domActs.ts)
- Phase/timing helpers: [`src/game/actFourFinaleFlow.ts`](../src/game/actFourFinaleFlow.ts)
- Credits: [`src/game/actFourCredits.ts`](../src/game/actFourCredits.ts)
- Content: [`src/content/actFour`](../src/content/actFour)
- Shared DOM escaping: [`src/game/domMarkup.ts`](../src/game/domMarkup.ts)
- Styling: [`src/style.css`](../src/style.css)

## Flow

1. Alexander enters the jubilee zone.
2. The player walks until `Титан Пятидесятилетия` is discovered in-world.
3. The boss reveal zoom shows the boss scale.
4. Two sprite-backed zero-damage cards produce oversized `0 DAMAGE` feedback.
5. `Вызов Валеры` appears.
6. Valera explains the rules, transforms, conjures guitar support, and holds during relic consumption.
7. `Золотая маска`, `Коньяк Арарат`, and `Пэ Эм Жэ` are consumed into Alexander.
8. The route switches into two horizontal anime showdown panels.
9. `Press X to win` appears after the showdown hold.
10. Confirming starts the post-showdown cutscene.
11. The cutscene holds its final frame, then credits play.
12. `Тут Подарок` opens the fullscreen gift video.
13. The final screen returns with `СПАСИБО ЗА ИГРУ` and `Начать заново`.

## Controls

- `Left` / `Right`, `A` / `D`, or controller left stick / D-pad: move during side-scroll phases.
- Mouse click or controller `X`: confirm dialogue, reveal prompts, cards, support card, and win prompt.
- Card cursor uses the shared Act 1/Act 4 battle navigation.

## Finale Assets

- Background: [`public/backgrounds/act-4/berlin-jubilee-finale.png`](../public/backgrounds/act-4/berlin-jubilee-finale.png)
- Boss: [`public/sprites/act-4/boss/jubilee-wag.png`](../public/sprites/act-4/boss/jubilee-wag.png)
- Player battle stance: [`public/sprites/act-4/player/alexander-battle-act4.png`](../public/sprites/act-4/player/alexander-battle-act4.png)
- Artifact consumption: [`public/sprites/act-4/player/alexander-artifact-consume.png`](../public/sprites/act-4/player/alexander-artifact-consume.png)
- Alexander showdown: [`public/sprites/act-4/player/alexander-anime-showdown.png`](../public/sprites/act-4/player/alexander-anime-showdown.png)
- Jubilee showdown: [`public/sprites/act-4/jubilee-anime.png`](../public/sprites/act-4/jubilee-anime.png)
- Valera support sheets: [`public/sprites/act-4/support`](../public/sprites/act-4/support)
- Card fronts: [`public/sprites/act-4/cards`](../public/sprites/act-4/cards)
- Post-showdown cutscene: [`public/video/act-4-post-showdown-cutscene.mp4`](../public/video/act-4-post-showdown-cutscene.mp4)
- Gift video: [`public/video/birthday-gift.mp4`](../public/video/birthday-gift.mp4)

## Audio

Configured in [`src/content/actFour/audio.ts`](../src/content/actFour/audio.ts):

- Background: [`public/audio/act-4/music/e-dance.mp3`](../public/audio/act-4/music/e-dance.mp3)
- Valera/finale: [`public/audio/act-4/music/kikile.mp3`](../public/audio/act-4/music/kikile.mp3)
- Showdown start: [`public/audio/act-4/sfx/naruto-screaming.mp3`](../public/audio/act-4/sfx/naruto-screaming.mp3)
- Showdown loop: [`public/audio/act-4/music/anime-showdown-loud.mp3`](../public/audio/act-4/music/anime-showdown-loud.mp3)
- Post-showdown handoff: [`public/audio/act-4/sfx/studio-audience-awwww.mp3`](../public/audio/act-4/sfx/studio-audience-awwww.mp3)

## Direct QA

```text
?scene=act-4-finale&autoplay=1&act4=ending
?scene=act-4-finale&autoplay=1&act4=credits
```

## Verification

```bash
npm run test:act4
```
