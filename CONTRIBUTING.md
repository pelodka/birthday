# Contributing

Thanks for helping with Project Jubilee 50. This repo is a browser-first game, so small, well-tested changes are easiest to review.

## Setup

Use Node.js 20.19 or newer.

```bash
npm ci
npm run dev
```

`package.json` keeps `private: true` to prevent accidental npm publishing; it does not affect GitHub contributions.

Useful routes after `npm run dev` starts the local Vite server:

```text
http://localhost:5173/
http://localhost:5173/?scene=<scene-id>&autoplay=1
http://localhost:5173/?scene=act-4-finale&autoplay=1&act4=ending
http://localhost:5173/?scene=act-4-finale&autoplay=1&act4=credits
```

## Before You Change Code

- Read [README.md](./README.md) and [docs/README.md](./docs/README.md).
- Use [docs/structure.md](./docs/structure.md) to find the owning module.
- Keep docs current-state only.
- Keep generated output out of commits: `dist/`, `release/`, and `output/`.

## Development Rules

- Keep authored copy and asset paths in `src/content/**` where possible.
- Keep runtime behavior in `src/game/**`.
- Route audio through `AUDIO_HOOKS` and `SceneAudioController`.
- Route delayed scene work through `createScheduler()` so cleanup is reliable.
- Put runtime assets under `public/` and reference them with `/...` paths.
- Follow [ASSET_POLICY.md](./ASSET_POLICY.md) for all new media.

## Quality Gates

Run the focused gate for the area you changed, then run the full gate before a PR when practical:

```bash
npm run validate:assets
npm run build
npm test
```

The smoke tests start their own local Vite server.

## Pull Requests

PRs should include:

- What changed.
- Which acts or routes were touched.
- Commands run.
- Screenshots or short clips for visible UI/gameplay changes.
- Asset source/license notes when adding or replacing media.

By contributing, you agree that your code and documentation contributions are licensed under this repository's source-code license.
