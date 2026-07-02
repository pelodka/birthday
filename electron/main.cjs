const { app, BrowserWindow, Menu, protocol, shell } = require('electron');
const fs = require('node:fs');
const path = require('node:path');
const { Readable } = require('node:stream');

const APP_SCHEME = 'birthday';
const APP_HOST = 'local';
const DIST_DIR = path.join(__dirname, '..', 'dist');
const isDevServer = Boolean(process.env.VITE_DEV_SERVER_URL);
const isAudioSeekSmokeTest = Boolean(process.env.ELECTRON_AUDIO_SEEK_SMOKE);
const isSmokeTest = Boolean(process.env.ELECTRON_SMOKE_TEST) || isAudioSeekSmokeTest;

const MIME_TYPES = new Map([
  ['.aac', 'audio/aac'],
  ['.css', 'text/css; charset=utf-8'],
  ['.flac', 'audio/flac'],
  ['.glb', 'model/gltf-binary'],
  ['.html', 'text/html; charset=utf-8'],
  ['.jpeg', 'image/jpeg'],
  ['.jpg', 'image/jpeg'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.m4a', 'audio/mp4'],
  ['.mp3', 'audio/mpeg'],
  ['.mp4', 'video/mp4'],
  ['.ogg', 'audio/ogg'],
  ['.ogv', 'video/ogg'],
  ['.png', 'image/png'],
  ['.svg', 'image/svg+xml; charset=utf-8'],
  ['.wav', 'audio/wav'],
  ['.webp', 'image/webp'],
]);

const AUDIO_SEEK_SMOKE_CASES = [
  {
    label: 'Act 1 second encounter start offset',
    src: '/audio/act-1/music/reis-piter-erevan.mp3',
    targetTime: 44,
  },
  {
    label: 'Act 2 opening encounter start offset',
    src: '/audio/act-2/music/nyu-yorkskij-taksist.mp3',
    targetTime: 34,
  },
  {
    label: 'Act 4 finale resume offset',
    src: '/audio/act-4/music/kikile.mp3',
    targetTime: 19,
  },
];

const ELECTRON_RUNTIME_CSS = `
  .act-one-dialogue {
    overflow: visible !important;
    overscroll-behavior: auto !important;
  }
`;

protocol.registerSchemesAsPrivileged([
  {
    scheme: APP_SCHEME,
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      stream: true,
    },
  },
]);

function getAppUrl() {
  return isDevServer ? process.env.VITE_DEV_SERVER_URL : `${APP_SCHEME}://${APP_HOST}/index.html`;
}

function parseRangeHeader(rangeHeader, size) {
  const match = /^bytes=(\d*)-(\d*)$/u.exec(rangeHeader ?? '');
  if (!match) {
    return null;
  }

  const [, rawStart, rawEnd] = match;
  let start;
  let end;

  if (rawStart === '' && rawEnd === '') {
    return null;
  }

  if (rawStart === '') {
    const suffixLength = Number(rawEnd);
    if (!Number.isFinite(suffixLength) || suffixLength <= 0) {
      return null;
    }
    start = Math.max(size - suffixLength, 0);
    end = size - 1;
  } else {
    start = Number(rawStart);
    end = rawEnd === '' ? size - 1 : Number(rawEnd);
  }

  if (!Number.isFinite(start) || !Number.isFinite(end) || start < 0 || end < start || start >= size) {
    return null;
  }

  return {
    start,
    end: Math.min(end, size - 1),
  };
}

function createFileResponse(filePath, request, stat) {
  const contentType = MIME_TYPES.get(path.extname(filePath).toLowerCase()) ?? 'application/octet-stream';
  const baseHeaders = {
    'Accept-Ranges': 'bytes',
    'Cache-Control': 'no-cache',
    'Content-Type': contentType,
  };
  const rangeHeader = request.headers.get('range');

  if (rangeHeader) {
    const range = parseRangeHeader(rangeHeader, stat.size);
    if (!range) {
      return new Response(null, {
        status: 416,
        headers: {
          ...baseHeaders,
          'Content-Range': `bytes */${stat.size}`,
        },
      });
    }

    const contentLength = range.end - range.start + 1;
    const body =
      request.method === 'HEAD'
        ? null
        : Readable.toWeb(fs.createReadStream(filePath, { start: range.start, end: range.end }));

    return new Response(body, {
      status: 206,
      headers: {
        ...baseHeaders,
        'Content-Length': String(contentLength),
        'Content-Range': `bytes ${range.start}-${range.end}/${stat.size}`,
      },
    });
  }

  const body = request.method === 'HEAD' ? null : Readable.toWeb(fs.createReadStream(filePath));
  return new Response(body, {
    status: 200,
    headers: {
      ...baseHeaders,
      'Content-Length': String(stat.size),
    },
  });
}

function registerAppProtocol() {
  if (isDevServer) {
    return;
  }

  protocol.handle(APP_SCHEME, async (request) => {
    const requestUrl = new URL(request.url);
    const normalizedPath = decodeURIComponent(requestUrl.pathname === '/' ? '/index.html' : requestUrl.pathname);
    const requestedFile = path.normalize(path.join(DIST_DIR, normalizedPath));

    if (requestedFile !== DIST_DIR && !requestedFile.startsWith(`${DIST_DIR}${path.sep}`)) {
      return new Response('Not found', { status: 404 });
    }

    try {
      const stat = await fs.promises.stat(requestedFile);
      if (!stat.isFile()) {
        return new Response('Not found', { status: 404 });
      }

      return createFileResponse(requestedFile, request, stat);
    } catch {
      return new Response('Not found', { status: 404 });
    }
  });
}

function createMainWindow() {
  const mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 960,
    minHeight: 540,
    backgroundColor: '#050208',
    autoHideMenuBar: true,
    fullscreen: !isSmokeTest,
    fullscreenable: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.webContents.on('will-navigate', (event, url) => {
    const appUrl = getAppUrl();

    if (url !== appUrl && !url.startsWith(`${appUrl}?`) && !url.startsWith(`${appUrl}#`)) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });

  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (input.type !== 'keyDown') {
      return;
    }

    if (input.key === 'F11' || (input.key === 'Enter' && (input.control || input.meta))) {
      mainWindow.setFullScreen(!mainWindow.isFullScreen());
      event.preventDefault();
    }

    if (input.key === 'Escape' && mainWindow.isFullScreen()) {
      mainWindow.setFullScreen(false);
      event.preventDefault();
    }
  });

  mainWindow.webContents.on('did-finish-load', () => {
    mainWindow.webContents.insertCSS(ELECTRON_RUNTIME_CSS).catch(() => {
      // Styling injection is only a wrapper polish; do not block the game if it fails.
    });
  });

  if (isSmokeTest) {
    mainWindow.webContents.once('did-fail-load', (_event, errorCode, errorDescription) => {
      console.error(`Electron smoke failed to load: ${errorCode} ${errorDescription}`);
      app.exit(1);
    });

    mainWindow.webContents.once('did-finish-load', async () => {
      try {
        if (isAudioSeekSmokeTest) {
          const result = await mainWindow.webContents.executeJavaScript(`
            (async () => {
              const cases = ${JSON.stringify(AUDIO_SEEK_SMOKE_CASES)};
              const runCase = (testCase) => new Promise((resolve) => {
                const audio = new Audio(testCase.src);
                let settled = false;

                const finish = (ok, extra = {}) => {
                  if (settled) {
                    return;
                  }
                  settled = true;
                  clearTimeout(timeout);
                  audio.pause();
                  resolve({
                    label: testCase.label,
                    src: testCase.src,
                    targetTime: testCase.targetTime,
                    ok,
                    currentTime: audio.currentTime,
                    duration: Number.isFinite(audio.duration) ? audio.duration : null,
                    readyState: audio.readyState,
                    networkState: audio.networkState,
                    ...extra,
                  });
                };

                const checkSeek = () => {
                  if (Math.abs(audio.currentTime - testCase.targetTime) < 1.5) {
                    finish(true);
                  }
                };

                const timeout = setTimeout(() => finish(false, { reason: 'timeout' }), 10000);
                audio.preload = 'auto';
                audio.addEventListener('loadedmetadata', () => {
                  try {
                    audio.currentTime = testCase.targetTime;
                  } catch (error) {
                    finish(false, { reason: String(error) });
                  }
                });
                audio.addEventListener('seeked', checkSeek);
                audio.addEventListener('canplay', checkSeek);
                audio.addEventListener('error', () => finish(false, { reason: audio.error?.message ?? 'media error' }));
                audio.load();
              });

              const results = [];
              for (const testCase of cases) {
                results.push(await runCase(testCase));
              }
              return {
                ok: results.every((caseResult) => caseResult.ok),
                results,
              };
            })()
          `);

          if (!result.ok) {
            console.error('Electron audio seek smoke failed:', result);
            app.exit(1);
            return;
          }

          console.log('Electron audio seek smoke passed:', result);
          app.exit(0);
          return;
        }

        const hasStartButton = await mainWindow.webContents.executeJavaScript(
          'Boolean(document.querySelector("[data-action=\\"start\\"]"))',
        );

        if (!hasStartButton) {
          console.error('Electron smoke failed: start button not found.');
          app.exit(1);
          return;
        }

        console.log('Electron smoke passed: start screen rendered.');
        app.exit(0);
      } catch (error) {
        console.error('Electron smoke failed:', error);
        app.exit(1);
      }
    });
  }

  if (isDevServer) {
    mainWindow.loadURL(getAppUrl());
    return;
  }

  mainWindow.loadURL(getAppUrl());
}

app.whenReady().then(() => {
  Menu.setApplicationMenu(null);
  registerAppProtocol();
  createMainWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
