# Desktop Packaging

Electron wraps the built Vite app for playback machines. Browser/Vite is the development target.

## Commands

```bash
npm run desktop
npm run desktop:pack
npm run desktop:dist
npm run desktop:dist:win:zip
```

Generated desktop files live under ignored `release/`. Do not commit `release/`, `dist/`, packaged apps, installers, zips, or `node_modules/`.

## Wrapper Behavior

- Entry point: [`electron/main.cjs`](../electron/main.cjs).
- Packaged builds load `birthday://local/index.html`.
- The custom protocol serves `dist/` files with explicit MIME types.
- The custom protocol supports byte-range media requests and returns `206 Partial Content`.
- External navigation opens in the system browser.
- The app opens fullscreen outside smoke-test mode.
- `Ctrl+Enter`, `Cmd+Enter`, and `F11` toggle fullscreen.
- `Esc` exits fullscreen.
- The native application menu is removed.

## Windows Zip

Build:

```bash
npm run desktop:dist:win:zip
```

After unpacking on Windows, run:

```text
win-unpacked/Project Jubilee 50.exe
```

The zip archive is the quick-test artifact. Cross-built Windows output still needs a Windows machine for final playback verification.

## Smoke Checks

Browser gates:

```bash
npm run build
npm test
```

Packaged macOS start-screen smoke:

```bash
ELECTRON_SMOKE_TEST=1 "release/mac-arm64/Project Jubilee 50.app/Contents/MacOS/Project Jubilee 50"
```

Packaged macOS media-seek smoke:

```bash
ELECTRON_AUDIO_SEEK_SMOKE=1 "release/mac-arm64/Project Jubilee 50.app/Contents/MacOS/Project Jubilee 50"
```

If media seek works in the browser but fails in Electron, inspect the `birthday://local/` range handling in [`electron/main.cjs`](../electron/main.cjs).
