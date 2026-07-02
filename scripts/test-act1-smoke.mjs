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

async function clickVisible(page, selector, timeout = 12000) {
  const control = page.locator(selector).first();
  await control.waitFor({ state: 'visible', timeout });
  await control.click();
}

async function clearVisibleDialogue(page, nextSelector, timeout = 20000) {
  const deadline = Date.now() + timeout;
  const dialogueButton = page.locator('[data-dialogue-ok]');
  const nextState = page.locator(nextSelector);

  while (Date.now() < deadline) {
    if (await isVisible(nextState)) {
      return;
    }

    if (await isVisible(dialogueButton)) {
      await dialogueButton.first().click();
      await page.waitForTimeout(160);
      continue;
    }

    await page.waitForTimeout(160);
  }

  throw new Error(`Timed out clearing dialogue before ${nextSelector}.`);
}

async function expectGoPromptBurst(page, label) {
  const prompt = page.locator('[data-act-one-go-prompt]');
  await prompt.waitFor({ state: 'visible', timeout: 3000 });
  await prompt.waitFor({ state: 'hidden', timeout: 4200 });
  log(`GO prompt appeared for ${label}.`);
}

async function walkIntoEncounter(page, label, timeout = 45000) {
  log(`Walking into ${label}...`);
  const dialogue = page.locator('.act-one-dialogue');

  await page.locator('.act-one-shell').click({ position: { x: 420, y: 420 } });
  await page.keyboard.down('ArrowRight');
  try {
    await dialogue.waitFor({ state: 'visible', timeout });
  } finally {
    await page.keyboard.up('ArrowRight');
  }
  await page.locator('[data-act-one-go-prompt]').waitFor({ state: 'hidden', timeout: 2000 });
}

async function playAvailableCard(page) {
  const clicked = await page.evaluate(() => {
    const card = document.querySelector('[data-card]:not([disabled])');
    if (!(card instanceof HTMLButtonElement)) {
      return false;
    }

    card.click();
    return true;
  });
  if (!clicked) {
    return false;
  }

  await page.waitForTimeout(180);
  return true;
}

async function clickEndTurn(page) {
  const clicked = await page.evaluate(() => {
    const endTurn = document.querySelector('[data-end-turn]');
    if (!(endTurn instanceof HTMLButtonElement)) {
      return false;
    }

    endTurn.click();
    return true;
  });
  if (!clicked) {
    return false;
  }

  await page.waitForTimeout(600);
  return true;
}

async function resolveBattle(page, label, options = {}) {
  log(`Resolving ${label}...`);
  const rewardContinue = page.locator('[data-reward-continue]');
  const artifactCollect = page.locator('[data-artifact-collect]');
  const battleUi = page.locator('.act-one-battle-ui');
  const endTurn = page.locator('[data-end-turn]');

  for (let attempts = 0; attempts < 360; attempts += 1) {
    if (await isVisible(rewardContinue)) {
      return 'reward';
    }

    if (await isVisible(artifactCollect)) {
      return 'artifact';
    }

    if (options.completeSelector && (await isVisible(page.locator(options.completeSelector)))) {
      return 'complete';
    }

    if (await isVisible(battleUi)) {
      if (await playAvailableCard(page)) {
        continue;
      }

      if ((await isVisible(endTurn)) && (await clickEndTurn(page))) {
        continue;
      }
    }

    await page.waitForTimeout(220);
  }

  throw new Error(`Battle loop for "${label}" did not finish in time.`);
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

  log('Opening Act 1 directly...');
  await page.goto(`${baseUrl}/?scene=act-1-calendar&autoplay=1`, {
    waitUntil: 'networkidle',
  });

  await page.locator('.act-one-shell').waitFor({ state: 'visible', timeout: 10000 });
  await clearVisibleDialogue(page, '.act-one-shell:not(:has(.act-one-dialogue))', 12000);
  await waitForText(page, '[data-scene-status]', 'Управление включено', 5000);
  await expectGoPromptBurst(page, 'the Act 1 opening');

  await walkIntoEncounter(page, 'encounter 1');
  await clearVisibleDialogue(page, '.act-one-battle-ui', 16000);
  assert((await resolveBattle(page, 'Encounter 1')) === 'reward', 'Act 1 encounter 1 should end with a reward card.');
  await clickVisible(page, '[data-reward-continue]');
  await waitForText(page, '[data-scene-status]', 'Награда получена', 8000);
  await expectGoPromptBurst(page, 'after encounter 1');

  await walkIntoEncounter(page, 'encounter 2');
  await clearVisibleDialogue(page, '.act-one-battle-ui', 16000);
  assert((await resolveBattle(page, 'Encounter 2')) === 'reward', 'Act 1 encounter 2 should end with a reward card.');
  await clickVisible(page, '[data-reward-continue]');
  await waitForText(page, '[data-scene-status]', 'Награда получена', 8000);
  await expectGoPromptBurst(page, 'after encounter 2');

  await walkIntoEncounter(page, 'the boss encounter', 65000);
  await clearVisibleDialogue(page, '.act-one-battle-ui', 24000);
  assert((await resolveBattle(page, 'Boss Encounter')) === 'artifact', 'Act 1 boss should reveal the artifact.');
  await clickVisible(page, '[data-artifact-collect]');
  await clearVisibleDialogue(page, '[data-act-two-dialogue-continue]', 18000);
  await page.locator('.act-two-poc').waitFor({ state: 'visible', timeout: 18000 });

  log('Act 1 smoke test passed.');
} catch (error) {
  await saveFailureScreenshot(browser, 'act1-smoke-failure.png');

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
