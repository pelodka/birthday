import { spawn } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import net from 'node:net';
import path from 'node:path';
import process from 'node:process';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const repoRoot = path.resolve(__dirname, '..');
export const artifactsDir = path.join(repoRoot, 'artifacts');
export const host = '127.0.0.1';

export { delay };

export function log(message) {
  process.stdout.write(`${message}\n`);
}

export function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

export async function getFreePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.unref();

    server.on('error', reject);
    server.listen(0, host, () => {
      const address = server.address();
      if (!address || typeof address === 'string') {
        server.close();
        reject(new Error('Unable to determine a free TCP port.'));
        return;
      }

      const selectedPort = address.port;
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(selectedPort);
      });
    });
  });
}

export async function waitForServer(url, timeoutMs = 20000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        return;
      }
    } catch {
      // Keep polling until the dev server is reachable.
    }

    await delay(250);
  }

  throw new Error(`Timed out waiting for dev server at ${url}`);
}

export async function isVisible(locator) {
  if ((await locator.count()) === 0) {
    return false;
  }
  return locator.first().isVisible();
}

export async function startViteSmokeServer() {
  const port = await getFreePort();
  const baseUrl = `http://${host}:${port}`;
  const viteBin = path.join(repoRoot, 'node_modules', '.bin', process.platform === 'win32' ? 'vite.cmd' : 'vite');
  const server = spawn(viteBin, ['--host', host, '--port', String(port), '--strictPort'], {
    cwd: repoRoot,
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  let output = '';
  server.stdout.on('data', (chunk) => {
    output += chunk.toString();
  });
  server.stderr.on('data', (chunk) => {
    output += chunk.toString();
  });

  return {
    baseUrl,
    server,
    getOutput: () => output,
  };
}

export async function stopViteSmokeServer(server) {
  if (server.exitCode !== null) {
    return;
  }

  const exitPromise = new Promise((resolve) => {
    server.once('exit', resolve);
  });
  server.kill('SIGTERM');
  await Promise.race([exitPromise, delay(600)]);
}

export async function saveFailureScreenshot(browser, filename) {
  await mkdir(artifactsDir, { recursive: true });

  const page = browser?.contexts()[0]?.pages()[0];
  if (!page) {
    return;
  }

  await page.screenshot({
    path: path.join(artifactsDir, filename),
    fullPage: true,
  });
}
