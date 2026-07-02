# Development

## Commands

Use Node.js 20.19 or newer.

```bash
npm ci
npm run dev
npm run build
npm run preview
```

Desktop:

```bash
npm run desktop
npm run desktop:pack
npm run desktop:dist
npm run desktop:dist:win:zip
```

Quality gates:

```bash
npm run validate:assets
npm run test:act1
npm run test:act2
npm run test:act3
npm run test:act4
npm test
```

## Edit Map

| Task | Primary files |
| --- | --- |
| Scene list, relics, shared story metadata | [`src/content.ts`](../src/content.ts) |
| Shared content/runtime shape | [`src/types.ts`](../src/types.ts) |
| Shell, intro, overlays, progression, direct launch | [`src/game/director.ts`](../src/game/director.ts) |
| Act 1 gameplay | [`src/game/domActs.ts`](../src/game/domActs.ts), [`src/content/actOne`](../src/content/actOne) |
| Act 2 gameplay | [`src/game/actTwoThree.ts`](../src/game/actTwoThree.ts), [`src/content/actTwo`](../src/content/actTwo) |
| Act 2 model bindings | [`src/game/actTwoModelSchema.ts`](../src/game/actTwoModelSchema.ts), [`src/game/actTwoPartyVisual.ts`](../src/game/actTwoPartyVisual.ts), [`src/game/actTwoEnemyVisual.ts`](../src/game/actTwoEnemyVisual.ts) |
| Act 3 gameplay | [`src/game/threeAct.ts`](../src/game/threeAct.ts), [`src/game/actThreeVisuals.ts`](../src/game/actThreeVisuals.ts), [`src/content/actThree`](../src/content/actThree) |
| Act 4 finale gameplay | [`src/game/domActs.ts`](../src/game/domActs.ts), [`src/game/actFourFinaleFlow.ts`](../src/game/actFourFinaleFlow.ts), [`src/game/actFourCredits.ts`](../src/game/actFourCredits.ts), [`src/content/actFour`](../src/content/actFour) |
| Shared audio hook ids and playback | [`src/audio/hooks.ts`](../src/audio/hooks.ts), [`src/audio/sceneAudio.ts`](../src/audio/sceneAudio.ts), `src/content/act*/audio.ts` |
| Controller input | [`src/input/gamepad.ts`](../src/input/gamepad.ts) |
| Delayed action cleanup | [`src/game/scheduler.ts`](../src/game/scheduler.ts) |
| Styling | [`src/style.css`](../src/style.css) |
| Smoke harness | [`scripts/smoke-harness.mjs`](../scripts/smoke-harness.mjs) |
| Electron wrapper | [`electron/main.cjs`](../electron/main.cjs) |

## Content Folders

- [`src/content/actOne`](../src/content/actOne): Act 1 dialogue, cards, visuals, audio.
- [`src/content/actTwo`](../src/content/actTwo): Act 2 dialogue, UI copy, portraits, config, audio.
- [`src/content/actThree`](../src/content/actThree): Act 3 mission copy, pickups, world layout, visual specs, audio.
- [`src/content/actFour`](../src/content/actFour): Act 4 dialogue, audio, boss/card/support/artifact/showdown assets.

## Runtime Rules

- Keep authored text in content modules; runtime modules should handle behavior and rendering.
- Route shared audio through `AUDIO_HOOKS` and `SceneAudioController`.
- Route controller input through `GamepadInputManager`; act runtimes consume high-level intents.
- Use `createScheduler()` for scene-local timeouts and cleanup.
- Put runtime assets under `public/` and reference them with `/...` paths.
- Follow [Asset Policy](../ASSET_POLICY.md) for new or replacement media.
- Keep generated output out of source: `dist/`, `release/`, and `output/`.

## Smoke Tests

| Script | Covers |
| --- | --- |
| [`scripts/test-act1-smoke.mjs`](../scripts/test-act1-smoke.mjs) | Act 1 route and handoff |
| [`scripts/test-act2-smoke.mjs`](../scripts/test-act2-smoke.mjs) | Act 2 field/battle loop and Act 3 handoff |
| [`scripts/test-act3-smoke.mjs`](../scripts/test-act3-smoke.mjs) | Act 3 checkpoint pickups, LEA shootout, reward |
| [`scripts/test-act4-smoke.mjs`](../scripts/test-act4-smoke.mjs) | Act 4 reveal, zero-damage cards, support card, credits path |

Smoke tests start a Vite server through [`scripts/smoke-harness.mjs`](../scripts/smoke-harness.mjs).

## Pull Requests

Use [Contributing](../CONTRIBUTING.md) for PR expectations.

## Direct Launch

```text
?scene=<scene-id>&autoplay=1
```

Act 4 QA shortcuts:

```text
?scene=act-4-finale&autoplay=1&act4=ending
?scene=act-4-finale&autoplay=1&act4=credits
```

## Packaging

Electron packages the Vite build and serves it through `birthday://local/` with byte-range media support. See [Desktop Packaging](./desktop-packaging.md).
