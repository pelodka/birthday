# Act 3 Mechanics

Act 3 is a Three.js first-person corridor route with two checkpoint shootouts, two physical paperwork pickups, and a three-hit LEA finale.

## Ownership

- Runtime: [`src/game/threeAct.ts`](../src/game/threeAct.ts)
- Visual helpers: [`src/game/actThreeVisuals.ts`](../src/game/actThreeVisuals.ts)
- Content: [`src/content/actThree`](../src/content/actThree)
- Styling: [`src/style.css`](../src/style.css)

## Flow

1. Show `Чтобы убить - стреляйте.`
2. Preload and render-warm hands, checkpoint actors, and LEA.
3. Show `Чтобы не убить - не стреляйте.`
4. Unlock into the mission HUD.
5. Approach `A1 Zertifikat`, lock at the checkpoint line, land two shots.
6. Collect the A1 certificate sprite from the defeated checkpoint.
7. Approach `Einburgerungstest`, lock at the checkpoint line, land two shots.
8. Collect the 330/33 result sprite.
9. Approach LEA and land three registered hits.
10. Click the large in-scene `Пэ Эм Жэ` reward.
11. Route through `ЮБИЛЕЙ`.

## Controls

- `W` / `S` or arrows: move forward/back.
- `A` / `D`: strafe.
- Mouse or controller right stick: look.
- `Space` or controller `R2`: fire during checkpoint and LEA shootouts.
- Controller left stick / D-pad: movement.

## Runtime Rules

- The player is the camera.
- Corridor geometry is modular and content-driven.
- Target prompts appear only when the crosshair is over a live target.
- Checkpoint enemies require two registered hits.
- LEA requires three registered hits.
- Hit animations act as invincibility windows.
- Defeated checkpoint actors remain visible.
- Reward phases wait for physical sprite pickup collection before the route advances.
- LEA does not counterfire.

## Visuals

- Hands model: [`public/models/act-3/player/fps-hands.glb`](../public/models/act-3/player/fps-hands.glb).
- Enemy and LEA model specs live in [`src/content/actThree/visuals.ts`](../src/content/actThree/visuals.ts).
- Crosshair and mission HUD are DOM overlays.
- Normal shots spawn procedural `DER`, `DIE`, and `DAS` projectiles.
- The article magazine hides fired articles and renews after `DAS`.
- LEA hits two and three fire the collected paperwork sprites.
- LEA clip mapping is explicit because the exported clip names do not match their visual meaning.

## Audio

Configured in [`src/content/actThree/audio.ts`](../src/content/actThree/audio.ts):

- Music: [`public/audio/act-3/music/rot-und-schwarz.mp3`](../public/audio/act-3/music/rot-und-schwarz.mp3)
- Shot SFX: [`public/audio/act-3/sfx/sniper-rifle-impulse-shoot.mp3`](../public/audio/act-3/sfx/sniper-rifle-impulse-shoot.mp3)
- Registered hit SFX: [`public/audio/act-3/sfx/ack.mp3`](../public/audio/act-3/sfx/ack.mp3)

## Debug

Append `handsTuner=1` to the Act 3 URL to show the hands tuning panel.

## Verification

```bash
npm run test:act3
```
