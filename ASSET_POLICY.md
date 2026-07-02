# Asset Policy

Runtime assets live in [`public/`](./public) and are served by Vite as `/...` paths. The code license does not grant standalone reuse rights for bundled media.

## Contributing Assets

Only add assets that are safe for this repository:

- Original work you created.
- Assets with a license that allows this project to use and redistribute them.
- Assets provided with explicit permission from the rights holder.

Do not add:

- Commercial music, game, film, anime, or TV assets without clear permission.
- Personal photos, portraits, or voice/video recordings without consent.
- Generated media that imitates a living artist's exact style or contains third-party marks that cannot be used here.
- Secrets, source photos, prompts with private data, or temporary generation outputs.

## Pull Request Requirements

For every new asset, include in the PR:

- Source or author.
- License or permission note.
- Runtime path under `public/`.
- The code or content file that references it.

Run `npm run validate:assets` before opening the PR.
