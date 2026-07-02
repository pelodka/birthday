# Act 2 Mechanics

Act 2 is a Three.js field-and-battle route with DOM dialogue, HUD, and JRPG-style command overlays.

## Ownership

- Runtime: [`src/game/actTwoThree.ts`](../src/game/actTwoThree.ts)
- Scene chrome: [`src/game/actTwoSceneChrome.ts`](../src/game/actTwoSceneChrome.ts)
- Party GLB visuals: [`src/game/actTwoPartyVisual.ts`](../src/game/actTwoPartyVisual.ts)
- Enemy GLB visuals: [`src/game/actTwoEnemyVisual.ts`](../src/game/actTwoEnemyVisual.ts)
- Model schema: [`src/game/actTwoModelSchema.ts`](../src/game/actTwoModelSchema.ts)
- Content: [`src/content/actTwo`](../src/content/actTwo)
- Styling: [`src/style.css`](../src/style.css)

## Flow

1. Boss Prime explores the Yerevan field alone.
2. Five movement steps trigger Таксист Мигран.
3. Victory plays the Юрист Андрей join dialogue.
4. Five more movement steps trigger Антоха Гвоздодер and Вадимус Хэвиметал.
5. Victory returns to field dialogue.
6. Five final movement steps trigger Гигантский Хинкали.
7. Victory drops `Коньяк Арарат`.
8. Clicking the artifact routes through `БЕРЛИН / 2025`.

## Controls

- `WASD`, arrows, or controller left stick / D-pad: field movement.
- Command menu uses keyboard arrows / WASD or controller stick / D-pad.
- Mouse click or controller `X`: confirm commands, targets, dialogue, artifact.
- Controller `O`: back out of ability or target menus.

## Field

- Background plate: [`public/backgrounds/act-2/field-yerevan-2022.png`](../public/backgrounds/act-2/field-yerevan-2022.png).
- Field movement is fixed-camera.
- Encounter triggers are deterministic movement-step thresholds.
- The partner follows only after joining.

## Dialogue

- Dialogue copy: [`src/content/actTwo/dialogue.ts`](../src/content/actTwo/dialogue.ts).
- UI labels: [`src/content/actTwo/ui.ts`](../src/content/actTwo/ui.ts).
- Portrait lists: [`src/content/actTwo/portraits.ts`](../src/content/actTwo/portraits.ts).
- Player portrait appears on the left.
- Enemy and partner portraits appear on the right.
- Partner portraits are mirrored to face the player.
- Runtime dialogue text is escaped before rendering.
- The exact line `Бегите, глупцы!` receives the special shout treatment.

## Battle Rules

- Turn order is living party members followed by living enemies.
- Party commands: `Attack`, `Ability`, `Guard`.
- Target selection happens on enemy HUD markers.
- `Guard` halves the next incoming hit.
- `Shield` absorbs damage before HP.
- Party HP clamps to at least `1`.
- Enemy HP can reach `0`; defeated enemies leave the turn order.

## Battle Presentation

- Battles use a code-driven side-view arena over the field plate.
- Combatant HUDs are anchored above 3D actors.
- The command panel appears near the active party member.
- Battle text appears in the lower caption panel.
- Targeting mode hides the caption and uses the selected enemy HUD highlight.
- Party victory cues play before the route continues.

## Animation

- Boss Prime, Planner Mage, and all enemies load imported GLB animation sets.
- Party actors use one-shot cues for `battle-start`, `battle-guard`, `battle-hit`, `battle-attack`, `battle-skill`, and `battle-victory`.
- Party `battle-hit` intentionally reuses the struck actor’s own guard animation.
- Enemies loop `battle-idle`, play `battle-hit` on damage, and play `battle-defeat` on defeat.
- Enemy HP updates inside the hit/defeat reaction timing.
- Planner Mage attack timing is shortened at runtime to remove trailing dead time.
- Гигантский Хинкали uses a separate defeat-facing offset.

## Abilities

Alexander:

- `Цепочка знакомств`: costs `3 MP`, deals `12`.
- `Оперативный сбор`: costs `3 MP`, heals party for `5`.

Юрист Андрей:

- `Заверенная копия`: costs `4 MP`, deals `10`.
- `Нужный контакт`: costs `3 MP`, grants party `6` shield.

## Audio

Configured in [`src/content/actTwo/audio.ts`](../src/content/actTwo/audio.ts):

- Field: [`public/audio/act-2/music/blue-fields.mp3`](../public/audio/act-2/music/blue-fields.mp3)
- Taxi encounter: [`public/audio/act-2/music/nyu-yorkskij-taksist.mp3`](../public/audio/act-2/music/nyu-yorkskij-taksist.mp3)
- Duo encounter: [`public/audio/act-2/music/govnari.mp4`](../public/audio/act-2/music/govnari.mp4)
- Boss: [`public/audio/act-2/music/armyane-vsego-mira.mp3`](../public/audio/act-2/music/armyane-vsego-mira.mp3)
- Collection SFX: [`public/audio/shared/sfx/arcade-bonus.mp3`](../public/audio/shared/sfx/arcade-bonus.mp3)

## Verification

```bash
npm run test:act2
```
