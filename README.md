# Project Jubilee 50

Project Jubilee 50 is a fully playable browser-first birthday roast RPG built with `Vite`, `TypeScript`, DOM/CSS, and Three.js. The game runs inside one full-screen director shell and moves through four scripted acts:

| Act | Runtime | Shape |
| --- | --- | --- |
| 1 | DOM/CSS | Saint Petersburg side-scroll card battles |
| 2 | Three.js + DOM overlay | Yerevan field exploration and JRPG-style battles |
| 3 | Three.js | Berlin first-person bureaucracy shootout |
| 4 | DOM/CSS | Jubilee finale with support card, relic ritual, cutscene, and credits |

## Run

Requires Node.js 20.19 or newer.

```bash
npm ci
npm run dev
```

Build:

```bash
npm run build
```

Run the desktop wrapper:

```bash
npm run desktop
```

Build desktop output into ignored `release/` artifacts:

```bash
npm run desktop:pack
```

## Test

```bash
npm run validate:assets
npm run test:act1
npm run test:act2
npm run test:act3
npm run test:act4
```

`npm test` runs the asset validator and all smoke tests.

## Useful URLs

These URLs work after the Vite dev server is running with `npm run dev`.

- Full app: `http://localhost:5173/`
- Direct act launch: `http://localhost:5173/?scene=<scene-id>&autoplay=1`
- Act 4 ending QA: `http://localhost:5173/?scene=act-4-finale&autoplay=1&act4=ending`
- Act 4 credits QA: `http://localhost:5173/?scene=act-4-finale&autoplay=1&act4=credits`

Scene ids are listed in [docs/structure.md](./docs/structure.md).

## Documentation

Start with [docs/README.md](./docs/README.md).

Core references:

- [Project structure](./docs/structure.md): runtime architecture and file ownership.
- [Development guide](./docs/development.md): commands, edit map, QA gates.
- [Act overview](./docs/acts.md): shipped gameplay flow by act.
- [Audio hooks](./docs/audio.md): shared music, voice, and SFX contract.
- [Desktop packaging](./docs/desktop-packaging.md): Electron wrapper behavior and release commands.
- [Contributing](./CONTRIBUTING.md): setup, workflow, PR expectations, and quality gates.
- [Asset policy](./ASSET_POLICY.md): media licensing and contribution rules.

Act references:

- [Act 1](./docs/act-1.md)
- [Act 2](./docs/act-2.md)
- [Act 2 model schema](./docs/act-2-model-schema.md)
- [Act 3](./docs/act-3.md)
- [Act 4](./docs/act-4.md)

## Notes

- The browser route is the development target; Electron wraps the built Vite app for playback machines.
- Runtime docs describe shipped behavior only.
- Generated outputs in `dist/`, `release/`, and `output/` are not source files.

## Contributing

Issues and pull requests are welcome. Read [CONTRIBUTING.md](./CONTRIBUTING.md), [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md), and [SECURITY.md](./SECURITY.md) before opening a PR.

## License

Source code, tests, scripts, and docs are licensed under the terms in [LICENSE.md](./LICENSE.md). Bundled media assets and personal/story content are not granted standalone reuse rights; see [ASSET_POLICY.md](./ASSET_POLICY.md).
