# Structure

Project Jubilee 50 is a single-page game. `EraRoastDirector` owns the full-screen shell, progression, overlays, audio manager, and scene mounting. Each act owns its gameplay in a focused runtime module.

## Source Tree

```text
birthday/
├── electron/              Electron wrapper for packaged playback
├── public/                Runtime assets served from /...
├── scripts/               Smoke tests and shared harness
├── src/
│   ├── audio/             Audio hook ids and playback manager
│   ├── content/           Act-local copy, assets, audio maps, scene factories
│   ├── game/              Director, act runtimes, visual helpers
│   ├── input/             Shared gamepad intent layer
│   ├── content.ts         Scene list, relics, shared story metadata
│   ├── main.ts            Browser bootstrap
│   ├── style.css          Global shell and act styling
│   └── types.ts           Shared content/runtime types
├── index.html
├── CONTRIBUTING.md
├── LICENSE.md
├── package.json
├── tsconfig.json
└── vite.config.ts
```

## Runtime Routing

| Scene ID | Act | Runtime | Mount |
| --- | --- | --- | --- |
| `act-1-calendar` | 1 | DOM/CSS | `mountCardBattle()` in [`src/game/domActs.ts`](../src/game/domActs.ts) |
| `act-2-catchphrase` | 2 | Three.js + DOM | `mountActTwoThree()` in [`src/game/actTwoThree.ts`](../src/game/actTwoThree.ts) |
| `act-3-weekend` | 3 | Three.js | `mountThreeEncounter()` in [`src/game/threeAct.ts`](../src/game/threeAct.ts) |
| `act-4-finale` | 4 | DOM/CSS | `mountCardBattle()` in [`src/game/domActs.ts`](../src/game/domActs.ts), Act 4 branch |

Direct launch:

```text
?scene=<scene-id>&autoplay=1
```

Act 4 also supports:

```text
&act4=ending
&act4=credits
```

## Ownership

| Concern | Files |
| --- | --- |
| Scene list, relics, shared story metadata | [`src/content.ts`](../src/content.ts) |
| Shared types | [`src/types.ts`](../src/types.ts) |
| Shell, overlays, progression, direct launch | [`src/game/director.ts`](../src/game/director.ts) |
| Act 1 gameplay and Act 4 finale | [`src/game/domActs.ts`](../src/game/domActs.ts) |
| Act 2 gameplay | [`src/game/actTwoThree.ts`](../src/game/actTwoThree.ts) |
| Act 2 party GLB loading | [`src/game/actTwoPartyVisual.ts`](../src/game/actTwoPartyVisual.ts) |
| Act 2 enemy GLB loading | [`src/game/actTwoEnemyVisual.ts`](../src/game/actTwoEnemyVisual.ts) |
| Act 2 model bindings | [`src/game/actTwoModelSchema.ts`](../src/game/actTwoModelSchema.ts) |
| Act 3 gameplay | [`src/game/threeAct.ts`](../src/game/threeAct.ts) |
| Act 3 visuals | [`src/game/actThreeVisuals.ts`](../src/game/actThreeVisuals.ts) |
| Act 4 phase helpers | [`src/game/actFourFinaleFlow.ts`](../src/game/actFourFinaleFlow.ts) |
| Act 4 credits | [`src/game/actFourCredits.ts`](../src/game/actFourCredits.ts) |
| DOM escaping/helpers | [`src/game/domMarkup.ts`](../src/game/domMarkup.ts) |
| Delayed-action cleanup | [`src/game/scheduler.ts`](../src/game/scheduler.ts) |
| Audio hooks and playback | [`src/audio/hooks.ts`](../src/audio/hooks.ts), [`src/audio/sceneAudio.ts`](../src/audio/sceneAudio.ts) |
| Controller input | [`src/input/gamepad.ts`](../src/input/gamepad.ts) |
| Global styling | [`src/style.css`](../src/style.css) |
| Electron wrapper | [`electron/main.cjs`](../electron/main.cjs) |
| Smoke harness | [`scripts/smoke-harness.mjs`](../scripts/smoke-harness.mjs) |
| Contributor workflow | [`CONTRIBUTING.md`](../CONTRIBUTING.md) |
| Asset policy | [`ASSET_POLICY.md`](../ASSET_POLICY.md) |

## Content Folders

| Folder | Owns |
| --- | --- |
| [`src/content/actOne`](../src/content/actOne) | Act 1 dialogue, cards, visuals, audio |
| [`src/content/actTwo`](../src/content/actTwo) | Act 2 dialogue, UI labels, portraits, encounter config, audio |
| [`src/content/actThree`](../src/content/actThree) | Act 3 mission copy, pickups, layout, actor specs, audio |
| [`src/content/actFour`](../src/content/actFour) | Act 4 dialogue, audio, boss/card/support/showdown assets |

## Runtime Flow

1. [`src/main.ts`](../src/main.ts) loads CSS and content, then creates the director.
2. The director renders the start overlay, intro video, location cards, relic rack, and act shell.
3. The director dynamically imports the active scene runtime.
4. The act runtime mounts into the shell and returns a cleanup function.
5. Completion returns control to the director for relic collection, title cards, or the next act.

## Build Shape

- Vite handles the browser app.
- `vite.config.ts` splits Three.js into a separate chunk.
- Electron packages the built `dist/` app and serves it through `birthday://local/`.
- Runtime assets must live under [`public/`](../public).
- Generated `dist/`, `release/`, and `output/` artifacts are not source docs or source assets.
