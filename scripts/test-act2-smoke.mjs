import process from 'node:process';

import { chromium } from 'playwright';
import {
  assert,
  isVisible,
  log,
  saveFailureScreenshot,
  startViteSmokeServer,
  stopViteSmokeServer,
  waitForServer,
} from './smoke-harness.mjs';

async function walkIntoEncounter(page, encounterNumber) {
  log(`Walking into encounter ${encounterNumber}...`);
  const encounterMode = page.locator(
    ".act-two-poc[data-mode='dialogue'], .act-two-poc[data-mode='transition'], .act-two-poc[data-mode='battle']",
  );
  const movementKey = encounterNumber % 2 === 0 ? 'a' : 'd';
  await page.locator('.act-two-poc').click({ position: { x: 240, y: 240 } });
  await page.keyboard.down(movementKey);
  for (let attempts = 0; attempts < 48; attempts += 1) {
    if (await isVisible(encounterMode)) {
      break;
    }
    await page.waitForTimeout(200);
  }
  await page.keyboard.up(movementKey);
  await encounterMode.waitFor({ state: 'visible', timeout: 8000 });
  if (await isVisible(page.locator('[data-act-two-dialogue-continue]'))) {
    const dialogueLengths = {
      1: 4,
      2: 4,
      3: 4,
    };
    await continueDialogueSequence(page, dialogueLengths[encounterNumber] ?? 2, 'battle');
    return;
  }
  await page.locator('.act-two-poc[data-mode="battle"]').waitFor({ state: 'visible', timeout: 8000 });
}

async function resolveBattle(page, label, options = {}) {
  log(`Resolving ${label}...`);
  const nextOverlay = page.locator('[data-act-two-continue]');
  const dialogueOverlay = page.locator('[data-act-two-dialogue-continue]');
  const rewardOverlay = page.locator('[data-action="next"]');
  const artifactOverlay = page.locator('[data-act-two-artifact]');
  const attackButton = page.locator('[data-act-two-command="attack"]');
  const targetButtons = page.locator('[data-act-two-world-target]');
  let shouldUseKeyboardTargeting = Boolean(options.useKeyboardTargeting);

  for (let attempts = 0; attempts < 300; attempts += 1) {
    if (
      await isVisible(nextOverlay) ||
      await isVisible(dialogueOverlay) ||
      await isVisible(rewardOverlay) ||
      await isVisible(artifactOverlay)
    ) {
      return;
    }

    if (await isVisible(attackButton)) {
      try {
        await attackButton.first().click({ timeout: 1500 });
        if (shouldUseKeyboardTargeting) {
          await page.keyboard.press('d');
          await page.keyboard.press('Enter');
          shouldUseKeyboardTargeting = false;
        } else {
          await targetButtons.first().click({ timeout: 1500 });
        }
      } catch {
        await page.waitForTimeout(120);
      }
      continue;
    }

    await page.waitForTimeout(180);
  }

  throw new Error(`Battle loop for "${label}" did not finish in time.`);
}

async function continueDialogueSequence(page, lineCount, finalMode = 'explore') {
  const continueButton = page.locator('[data-act-two-dialogue-continue]');
  await continueButton.waitFor({ state: 'visible', timeout: 8000 });

  for (let index = 0; index < lineCount; index += 1) {
    await continueButton.waitFor({ state: 'visible', timeout: 8000 });
    await continueButton.click();
  }

  await page.locator(`.act-two-poc[data-mode="${finalMode}"]`).waitFor({ state: 'visible', timeout: 8000 });
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

  log('Opening Act 2 directly...');
  await page.goto(`${baseUrl}/?scene=act-2-catchphrase&autoplay=1`, {
    waitUntil: 'networkidle',
  });

  await continueDialogueSequence(page, 3, 'explore');
  await page.locator('.act-two-poc[data-mode="explore"]').waitFor({ state: 'visible', timeout: 10000 });
  const hudText = (await page.locator('[data-act-two-hud]').innerText()).trim();
  const sceneStatusTextDuringExplore = (await page.locator('[data-scene-status]').innerText()).trim();
  assert(hudText === '', 'Act 2 exploration HUD should stay hidden.');
  assert(sceneStatusTextDuringExplore === '', 'Act 2 exploration scene status should stay hidden.');

  await walkIntoEncounter(page, 1);
  await resolveBattle(page, 'Encounter 1');
  await continueDialogueSequence(page, 4, 'explore');

  await walkIntoEncounter(page, 2);
  await resolveBattle(page, 'Encounter 2', { useKeyboardTargeting: true });
  await continueDialogueSequence(page, 1, 'explore');

  await walkIntoEncounter(page, 3);
  await resolveBattle(page, 'Boss Encounter');
  await continueDialogueSequence(page, 3, 'artifact');
  await page.locator('[data-act-two-artifact]').waitFor({ state: 'visible', timeout: 10000 });
  const sceneStatusText = (await page.locator('[data-scene-status]').innerText()).trim();
  assert(sceneStatusText === '', 'Scene status should be empty during the Act 2 artifact drop.');
  await page.locator('[data-act-two-artifact]').click();

  await page.locator('.overlay-card--reward').waitFor({ state: 'hidden', timeout: 10000 });
  await page.locator('[data-act-three-ui]').waitFor({ state: 'visible', timeout: 18000 });
  await page.locator('.overlay-card--briefing').waitFor({ state: 'hidden', timeout: 10000 });

  log('Act 2 smoke test passed.');
} catch (error) {
  await saveFailureScreenshot(browser, 'act2-smoke-failure.png');

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
