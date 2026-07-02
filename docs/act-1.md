# Act 1 Mechanics

Act 1 is a DOM/CSS side-scroll route with three one-on-one card battles and an in-scene artifact pickup.

## Ownership

- Runtime: [`src/game/domActs.ts`](../src/game/domActs.ts)
- Content: [`src/content/actOne`](../src/content/actOne)
- Shared shell/progression: [`src/game/director.ts`](../src/game/director.ts)
- Styling: [`src/style.css`](../src/style.css)

## Flow

1. Alexander appears in the Saint Petersburg side-scroll lane.
2. Two intro bubbles play above the player.
3. Movement unlocks and a centered flashing `GO ->` prompt appears for three seconds.
4. The player walks into the first enemy dialogue and battle.
5. Victory grants the first boss-only card.
6. After the reward clears, the centered `GO ->` prompt appears for another three seconds.
7. The player walks into the second enemy dialogue and battle.
8. Victory grants the second boss-only card.
9. After the reward clears, the centered `GO ->` prompt appears for another three seconds.
10. The player walks into the boss dialogue and battle.
11. The boss fight includes both boss-only cards.
12. Defeating Подгорный drops `Золотая маска`.
13. Clicking the artifact plays the pickup animation and final dialogue.
14. The act hands off through `ЕРЕВАН / 2022`.

## Controls

- `Left` / `Right`, `A` / `D`, or controller left stick / D-pad: move.
- Mouse click or controller `X`: confirm dialogue, cards, rewards, artifact.
- Battle cursor: keyboard arrows / WASD or controller stick / D-pad.
- Down in battle moves focus to `End Turn`; up returns to cards.

## Battle Rules

- Each battle is one player versus one enemy.
- The hand draws five cards.
- Energy resets to `3` each player turn.
- Block resets at the start of the player turn.
- Player HP clamps to at least `1`.
- The two boss-only cards each deal 50% of the boss max HP.
- Damage produces health-bar feedback and floating numbers.
- Blocked enemy attacks produce a `Blocked!` floater.

## Presentation

- The stage uses [`public/backgrounds/act-1-saint-petersburg-lockdown-snes.png`](../public/backgrounds/act-1-saint-petersburg-lockdown-snes.png).
- Player sprites:
  - [`public/sprites/act-1/player/alexander-idle.png`](../public/sprites/act-1/player/alexander-idle.png)
  - [`public/sprites/act-1/player/alexander-run.png`](../public/sprites/act-1/player/alexander-run.png)
  - [`public/sprites/act-1/player/alexander-battle-act1.png`](../public/sprites/act-1/player/alexander-battle-act1.png)
- Enemy and boss sprites are configured in [`src/content/actOne/visuals.ts`](../src/content/actOne/visuals.ts).
- Dialogue bubbles are anchored to the speaking sprite.
- A CSS-drawn, old-school beat-em-up `GO ->` prompt flashes at viewport center when exploration resumes.
- Battle UI is staged over the same side-scroll environment.
- `End Turn` is anchored near the player.
- Health bars are anchored above active combatants.
- Card art comes from `public/sprites/act-1/cards`.
- Artifact asset: [`public/sprites/act-1/act01-artifact-v002.png`](../public/sprites/act-1/act01-artifact-v002.png).

## Audio

Configured in [`src/content/actOne/audio.ts`](../src/content/actOne/audio.ts):

- Field: [`public/audio/act-1/music/promise.mp3`](../public/audio/act-1/music/promise.mp3)
- First encounter: [`public/audio/act-1/music/guano-apes-big-in-japan.mp3`](../public/audio/act-1/music/guano-apes-big-in-japan.mp3)
- Second encounter: [`public/audio/act-1/music/reis-piter-erevan.mp3`](../public/audio/act-1/music/reis-piter-erevan.mp3)
- Boss: [`public/audio/act-1/music/ariya-bespechnyj-angel.mp3`](../public/audio/act-1/music/ariya-bespechnyj-angel.mp3)
- Collection SFX: [`public/audio/shared/sfx/arcade-bonus.mp3`](../public/audio/shared/sfx/arcade-bonus.mp3)

## Verification

```bash
npm run test:act1
```
