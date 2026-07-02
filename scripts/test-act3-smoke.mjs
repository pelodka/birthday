import process from 'node:process';

import { chromium } from 'playwright';
import {
  log,
  saveFailureScreenshot,
  startViteSmokeServer,
  stopViteSmokeServer,
  waitForServer,
} from './smoke-harness.mjs';

async function waitForText(page, selector, text, timeout = 12000) {
  await page.waitForFunction(
    ({ selector: currentSelector, text: currentText }) => {
      const element = document.querySelector(currentSelector);
      return Boolean(element?.textContent?.includes(currentText));
    },
    { selector, text },
    { timeout },
  );
}

async function waitForAnyText(page, selector, texts, timeout = 12000) {
  await page.waitForFunction(
    ({ selector: currentSelector, texts: currentTexts }) => {
      const element = document.querySelector(currentSelector);
      const content = element?.textContent ?? '';
      return currentTexts.some((text) => content.includes(text));
    },
    { selector, texts },
    { timeout },
  );
}

async function waitForOverlayData(page, key, expectedValue, timeout = 12000) {
  await page.waitForFunction(
    ({ selector: currentSelector, key: currentKey, expectedValue: currentExpectedValue }) => {
      const element = document.querySelector(currentSelector);
      return element?.getAttribute(`data-${currentKey}`) === currentExpectedValue;
    },
    { selector: '[data-act-three-ui]', key, expectedValue },
    { timeout },
  );
}

async function dispatchGameKey(page, key, code) {
  await page.evaluate(
    ({ key: currentKey, code: currentCode }) => {
      const keydown = new KeyboardEvent('keydown', {
        key: currentKey,
        code: currentCode,
        bubbles: true,
        cancelable: true,
      });
      const keyup = new KeyboardEvent('keyup', {
        key: currentKey,
        code: currentCode,
        bubbles: true,
        cancelable: true,
      });
      window.dispatchEvent(keydown);
      window.dispatchEvent(keyup);
    },
    { key, code },
  );
}

async function walkUntilPrompt(page, titleText, laneShiftKey) {
  if (laneShiftKey) {
    const laneCode = laneShiftKey.toLowerCase() === 'a' ? 'KeyA' : 'KeyD';
    await dispatchGameKey(page, laneShiftKey, laneCode);
    await page.waitForTimeout(250);
  }

  await page.keyboard.down('w');
  await waitForText(page, '[data-stealth-title]', titleText, 16000);
  await page.keyboard.up('w');
}

async function walkUntilPathSegment(page, segmentIndex, timeout = 20000) {
  await page.keyboard.down('w');
  try {
    await waitForOverlayData(page, 'path-segment', String(segmentIndex), timeout);
  } finally {
    await page.keyboard.up('w');
  }
}

async function walkFor(page, ms) {
  await page.keyboard.down('w');
  await page.waitForTimeout(ms);
  await page.keyboard.up('w');
}

async function walkUntilOverlayData(page, key, expectedValue, timeout = 12000) {
  await page.keyboard.down('w');
  try {
    await waitForOverlayData(page, key, expectedValue, timeout);
  } finally {
    await page.keyboard.up('w');
  }
}

async function walkUntilPlayerCoordinate(page, key, comparison, targetValue, timeout = 24000) {
  await page.keyboard.down('w');
  try {
    await page.waitForFunction(
      ({ selector, key: currentKey, comparison: currentComparison, targetValue: currentTargetValue }) => {
        const value = Number(document.querySelector(selector)?.getAttribute(`data-${currentKey}`));
        if (!Number.isFinite(value)) {
          return false;
        }
        return currentComparison === 'lte' ? value <= currentTargetValue : value >= currentTargetValue;
      },
      { selector: '[data-act-three-ui]', key, comparison, targetValue },
      { timeout },
    );
  } finally {
    await page.keyboard.up('w');
  }
}

async function waitForHitReaction(page) {
  await page.waitForTimeout(9000);
}

const { baseUrl, server, getOutput: getServerOutput } = await startViteSmokeServer();

let browser;
let browserLogs = '';

try {
  log('Starting local Vite server...');
  await waitForServer(baseUrl);

  browser = await chromium.launch({
    headless: true,
    args: ['--use-angle=swiftshader'],
  });

  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
  });

  page.on('console', (message) => {
    browserLogs += `[console:${message.type()}] ${message.text()}\n`;
  });
  page.on('pageerror', (error) => {
    browserLogs += `[pageerror] ${error.stack ?? error.message}\n`;
  });

  log('Opening Act 3 directly...');
  await page.goto(`${baseUrl}/?scene=act-3-weekend&autoplay=1`, {
    waitUntil: 'networkidle',
  });

  await page.locator('[data-act-three-ui]').waitFor({ state: 'visible', timeout: 10000 });
  await waitForOverlayData(page, 'startup-modal', 'visible', 5000);
  await waitForOverlayData(page, 'startup-step', 'kill', 5000);
  await waitForText(page, '[data-stealth-body]', 'Чтобы убить', 5000);
  await page.waitForFunction(() => {
    const dismiss = document.querySelector('[data-startup-dismiss]');
    return dismiss && !dismiss.disabled;
  });
  await page.locator('[data-startup-dismiss]').click();
  await waitForOverlayData(page, 'startup-step', 'spare', 5000);
  await waitForText(page, '[data-stealth-body]', 'Чтобы не убить', 5000);
  await waitForOverlayData(page, 'startup-assets-ready', 'true', 24000);
  await page.waitForFunction(() => {
    const dismiss = document.querySelector('[data-startup-dismiss]');
    return dismiss && !dismiss.disabled;
  });
  await page.locator('[data-startup-dismiss]').click();
  await waitForOverlayData(page, 'startup-modal', 'hidden', 5000);
  await waitForText(page, '[data-act-three-mission-title]', 'МИССИЯ ПМЖ ЛЮБОЙ ЦЕНОЙ');
  await page.locator('.stealth-ui__mission.is-hud').waitFor({ state: 'visible', timeout: 5000 });
  await waitForText(page, '[data-stealth-title]', 'Fire (R2)');

  log('Clearing checkpoint one...');
  await waitForOverlayData(page, 'crosshair-target', 'Дойч А1', 8000);
  await dispatchGameKey(page, ' ', 'Space');
  await waitForOverlayData(page, 'checkpoint-one-hits', '1', 8000);
  await waitForHitReaction(page);
  await waitForOverlayData(page, 'crosshair-target', 'Дойч А1', 8000);
  await dispatchGameKey(page, ' ', 'Space');
  await waitForOverlayData(page, 'phase', 'checkpoint-one-reward', 8000);
  await walkUntilOverlayData(page, 'deutsch-a1-collected', 'true', 30000);
  await waitForOverlayData(page, 'deutsch-a1-inventory', 'visible', 8000);
  await waitForOverlayData(page, 'phase', 'checkpoint-two', 8000);

  log('Clearing checkpoint two...');
  await waitForOverlayData(page, 'phase', 'checkpoint-two', 20000);
  await walkUntilPlayerCoordinate(page, 'player-z', 'lte', -19);
  await dispatchGameKey(page, 'd', 'KeyD');
  await walkUntilPathSegment(page, 1);
  await waitForText(page, '[data-stealth-title]', 'Fire (R2)');
  await waitForOverlayData(page, 'crosshair-target', 'Айн Бюргер Тест', 8000);
  await dispatchGameKey(page, ' ', 'Space');
  await waitForOverlayData(page, 'checkpoint-two-hits', '1', 8000);
  await waitForHitReaction(page);
  await waitForOverlayData(page, 'crosshair-target', 'Айн Бюргер Тест', 8000);
  await dispatchGameKey(page, ' ', 'Space');
  await waitForOverlayData(page, 'phase', 'checkpoint-two-reward', 8000);
  await walkUntilOverlayData(page, 'einbuergerungstest-collected', 'true', 30000);
  await waitForOverlayData(page, 'einbuergerungstest-inventory', 'visible', 8000);
  await waitForOverlayData(page, 'phase', 'shootout', 8000);

  log('Resolving LEA shootout...');
  await waitForOverlayData(page, 'phase', 'shootout', 20000);
  await walkUntilPlayerCoordinate(page, 'player-x', 'gte', 17.7);
  await dispatchGameKey(page, 'a', 'KeyA');
  await walkUntilPathSegment(page, 2);
  await waitForText(page, '[data-stealth-title]', 'Fire (R2)');
  for (let hits = 1; hits <= 3; hits += 1) {
    await waitForText(page, '[data-stealth-title]', 'Fire (R2)', 16000);
    await waitForOverlayData(page, 'crosshair-target', 'ЛЕА (не принцесса)', 8000);
    await dispatchGameKey(page, ' ', 'Space');
    await waitForOverlayData(page, 'boss-hits', String(hits), 8000);
    if (hits === 2) {
      await waitForOverlayData(page, 'deutsch-a1-inventory', 'hidden', 8000);
    }
    if (hits === 3) {
      await waitForOverlayData(page, 'einbuergerungstest-inventory', 'hidden', 8000);
    }
    if (hits < 3) {
      await waitForHitReaction(page);
    }
  }

  await page.locator('.act-three-reward').click({ timeout: 12000 });
  await page.locator('[data-act-three-ui]').waitFor({ state: 'detached', timeout: 12000 });
  await waitForAnyText(page, 'body', ['ПЭ ЭМ ЖЭ', 'Пэ Эм Жэ'], 12000);

  log('Act 3 smoke test passed.');
} catch (error) {
  try {
    const page = browser?.contexts()[0]?.pages()[0];
    if (page) {
      const overlayData = await page.locator('[data-act-three-ui]').evaluate((element) => ({ ...element.dataset }));
      browserLogs += `[debug:act3-overlay] ${JSON.stringify(overlayData)}\n`;
    }
  } catch (debugError) {
    browserLogs += `[debug:error] ${debugError instanceof Error ? debugError.message : String(debugError)}\n`;
  }
  await saveFailureScreenshot(browser, 'act3-smoke-failure.png');

  process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
  if (browserLogs) {
    process.stderr.write('\n--- Browser output ---\n');
    process.stderr.write(browserLogs);
  }
  process.stderr.write('\n--- Vite server output ---\n');
  process.stderr.write(getServerOutput());
  process.exitCode = 1;
} finally {
  if (browser) {
    await browser.close();
  }

  await stopViteSmokeServer(server);
}
