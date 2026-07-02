import process from 'node:process';

import { chromium } from 'playwright';
import {
  assert,
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

async function waitForOpacity(page, selector, minOpacity = 0.8, timeout = 12000) {
  await page.waitForFunction(
    ({ selector: currentSelector, minOpacity: currentMinOpacity }) => {
      const element = document.querySelector(currentSelector);
      if (!element) {
        return false;
      }

      return Number.parseFloat(window.getComputedStyle(element).opacity) >= currentMinOpacity;
    },
    { selector, minOpacity },
    { timeout },
  );
}

async function getCreditsActionState(page, selector) {
  return page.evaluate((currentSelector) => {
    const button = document.querySelector(currentSelector);
    if (!(button instanceof HTMLButtonElement)) {
      return { attached: false };
    }

    const style = window.getComputedStyle(button);
    const rect = button.getBoundingClientRect();

    return {
      attached: true,
      className: button.className,
      disabled: button.disabled,
      height: rect.height,
      label: button.textContent?.trim() ?? '',
      opacity: style.opacity,
      pointerEvents: style.pointerEvents,
      visibleClass: button.classList.contains('is-visible'),
      width: rect.width,
    };
  }, selector);
}

async function waitForCreditsActionReady(page, selector, label, timeout = 45000) {
  const actionButton = page.locator(selector);
  await actionButton.waitFor({ state: 'attached', timeout: 10000 });
  await waitForText(page, selector, label, 5000);

  try {
    await page.waitForFunction(
      ({ selector: currentSelector, text }) => {
        const button = document.querySelector(currentSelector);
        if (!(button instanceof HTMLButtonElement)) {
          return false;
        }

        const style = window.getComputedStyle(button);
        const rect = button.getBoundingClientRect();

        return (
          !button.disabled &&
          button.classList.contains('is-visible') &&
          button.textContent?.includes(text) &&
          style.pointerEvents !== 'none' &&
          Number.parseFloat(style.opacity) >= 0.8 &&
          rect.width > 0 &&
          rect.height > 0
        );
      },
      { selector, text: label },
      { timeout },
    );
  } catch (error) {
    const state = await getCreditsActionState(page, selector);
    throw new Error(
      `Timed out waiting for ${selector} to become ready. Last state: ${JSON.stringify(state)}\n${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
}

async function clickVisible(page, selector, timeout = 12000) {
  const control = page.locator(selector).first();
  await control.waitFor({ state: 'visible', timeout });
  await control.click();
}

async function walkUntilActFourDialogue(page, timeout = 70000) {
  const dialogueButton = page.locator('[data-dialogue-ok]');
  await page.keyboard.down('ArrowRight');
  try {
    await dialogueButton.waitFor({ state: 'visible', timeout });
  } finally {
    await page.keyboard.up('ArrowRight');
  }
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

  log('Opening Act 4 directly...');
  await page.goto(`${baseUrl}/?scene=act-4-finale&autoplay=1`, {
    waitUntil: 'networkidle',
  });

  await page.locator('.act-one-shell').waitFor({ state: 'visible', timeout: 10000 });
  await clickVisible(page, '[data-dialogue-ok]');
  await waitForText(page, '[data-scene-status]', 'Идите вперёд', 5000);

  log('Walking into the Act 4 reveal...');
  await walkUntilActFourDialogue(page);
  await waitForText(page, '.act-one-dialogue', 'Это нога', 5000);
  await clickVisible(page, '[data-dialogue-ok]');

  await waitForText(page, '.act-one-dialogue', 'Соискатель Александр', 12000);
  await clickVisible(page, '[data-dialogue-ok]');
  await waitForText(page, '.act-one-dialogue', 'Я шёл к торту', 5000);
  await clickVisible(page, '[data-dialogue-ok]');

  log('Checking zero-damage card flow...');
  await page.locator('[data-card]').first().waitFor({ state: 'visible', timeout: 16000 });
  await page.locator('[data-card]').first().click();
  await waitForText(page, 'body', '0 DAMAGE', 3000);
  await page.locator('.act-four-boss-feedback').waitFor({ state: 'hidden', timeout: 4000 });
  await page.locator('[data-card]').first().click();
  await page.locator('[data-card="summon-valera"]').waitFor({ state: 'visible', timeout: 8000 });
  await waitForText(page, '[data-scene-status]', 'Вызов Валеры', 5000);
  await page.locator('.act-four-boss-feedback').waitFor({ state: 'hidden', timeout: 4000 });

  log('Checking support dialogue delegation...');
  await page.locator('[data-card="summon-valera"]').click();
  await page.locator('.act-four-support[data-act-four-support-phase="summon"]').waitFor({
    state: 'visible',
    timeout: 8000,
  });
  await page.locator('[data-act-four-support-dialogue]').waitFor({ state: 'visible', timeout: 9000 });
  await waitForText(page, '.act-four-support__dialogue', 'карты нам больше не помогут', 5000);
  await clickVisible(page, '[data-act-four-support-dialogue]');
  await waitForText(page, '.act-four-support__dialogue', 'стратегию выигрышную через GPT', 5000);
  await clickVisible(page, '[data-act-four-support-dialogue]');
  await waitForText(page, '.act-four-support__dialogue', 'обычный урон не проходит', 5000);
  await clickVisible(page, '[data-act-four-support-dialogue]');
  await waitForText(page, '.act-four-support__dialogue', 'made in Germany', 5000);
  await clickVisible(page, '[data-act-four-support-dialogue]');
  await waitForText(page, '.act-four-support__dialogue', 'Термин одним днём', 5000);
  await clickVisible(page, '[data-act-four-support-dialogue]');
  await waitForText(page, '.act-four-support__dialogue', 'мимикрировать под местного', 5000);

  const statusText = (await page.locator('[data-scene-status]').innerText()).trim();
  assert(statusText.length > 0, 'Act 4 scene status should stay populated during the support sequence.');

  log('Checking artifact consumption result ordering...');
  await clickVisible(page, '[data-act-four-support-dialogue]');
  await page.locator('[data-act-four-artifact-dialogue]').waitFor({ state: 'visible', timeout: 24000 });
  await waitForText(page, '.act-four-artifact-dialogue', 'артефакты полетят', 5000);
  await clickVisible(page, '[data-act-four-artifact-dialogue]');
  await page.locator('.act-four-artifact-ritual[data-artifact-mode="artifact-consuming"]').waitFor({
    state: 'visible',
    timeout: 5000,
  });
  await page.locator('.act-four-relic-token.is-consuming').waitFor({ state: 'visible', timeout: 3000 });
  const prematureGainLineCount = await page.locator('.act-four-artifact-gain-line').count();
  assert(prematureGainLineCount === 0, 'Artifact result pane should not appear before consumption starts.');
  await page.waitForTimeout(1800);
  const midFlightGainLineCount = await page.locator('.act-four-artifact-gain-line').count();
  assert(midFlightGainLineCount === 0, 'Artifact result pane should stay hidden while the relic is still flying.');
  await page.locator('.act-four-artifact-gain-line').waitFor({ state: 'visible', timeout: 5000 });

  log('Checking credits direct launch...');
  await page.goto(`${baseUrl}/?scene=act-4-finale&autoplay=1&act4=credits`, {
    waitUntil: 'networkidle',
  });
  await page.locator('.act-four-credits').waitFor({ state: 'visible', timeout: 10000 });
  await waitForText(page, '.act-four-credits', 'A GAME BY', 5000);
  await waitForText(page, '.act-four-credits', 'БРИГАДА ПРОДАКШЕНС', 5000);
  await page.locator('.act-four-credits__birthday[aria-label="С ДНЕМ РОЖДЕНИЯ"]').waitFor({
    state: 'visible',
    timeout: 5000,
  });
  await waitForOpacity(page, '.act-four-credits__birthday', 0.8, 22000);
  const preGiftThanksCount = await page.locator('.act-four-credits__thanks').count();
  assert(preGiftThanksCount === 0, 'Pre-gift birthday screen should not show the thank-you line.');
  await waitForCreditsActionReady(page, '[data-act-four-gift]', 'Тут Подарок');
  await page.locator('[data-act-four-gift]').click();
  await page.locator('.act-four-gift-video').waitFor({ state: 'visible', timeout: 5000 });
  await page.locator('.act-four-gift-video.is-ready').waitFor({ state: 'visible', timeout: 5000 });
  await page.locator('[data-act-four-gift-video]').evaluate((video) => {
    const media = video;
    return new Promise((resolve) => {
      if (media.readyState >= HTMLMediaElement.HAVE_METADATA) {
        resolve();
        return;
      }

      media.addEventListener('loadedmetadata', () => resolve(), { once: true });
    });
  });
  await page.locator('[data-act-four-gift-video]').evaluate((video) => {
    const media = video;
    media.currentTime = Math.max(0, media.duration - 0.25);
    void media.play();
  });
  await page.locator('.act-four-credits.is-settled').waitFor({ state: 'visible', timeout: 8000 });
  await waitForText(page, '.act-four-credits__thanks', 'СПАСИБО ЗА ИГРУ', 5000);
  await waitForCreditsActionReady(page, '[data-act-four-restart]', 'Начать заново', 8000);
  await page.evaluate(() => {
    const relicRack = document.querySelector('[data-persistent-relics]');
    if (!relicRack) {
      return;
    }

    relicRack.classList.add('is-visible');
    relicRack.innerHTML = '<article class="persistent-relic">test relic</article>';
  });
  await page.locator('[data-act-four-restart]').click();
  await waitForText(page, '.start-screen', 'CLICK ME', 5000);
  await page.waitForFunction(
    () => {
      const relicRack = document.querySelector('[data-persistent-relics]');
      return Boolean(relicRack && !relicRack.classList.contains('is-visible') && relicRack.innerHTML.trim() === '');
    },
    {},
    { timeout: 5000 },
  );

  log('Act 4 smoke test passed.');
} catch (error) {
  await saveFailureScreenshot(browser, 'act4-smoke-failure.png');

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
