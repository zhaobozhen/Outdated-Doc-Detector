import { expect, test } from '@playwright/test';
import { chromium, type BrowserContext } from 'playwright';
import { fileURLToPath } from 'node:url';

const extensionPath = fileURLToPath(new URL('../.output/chrome-mv3-test', import.meta.url));

let context: BrowserContext;
let extensionId: string;

test.beforeAll(async () => {
  context = await chromium.launchPersistentContext('', {
    channel: 'chromium',
    headless: false,
    locale: 'zh-CN',
    colorScheme: 'light',
    args: [
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`,
      '--lang=zh-CN',
    ],
  });

  let serviceWorker = context.serviceWorkers()[0];
  serviceWorker ??= await context.waitForEvent('serviceworker');
  extensionId = new URL(serviceWorker.url()).host;
});

test.afterAll(async () => {
  await context.close();
});

test('popup severely-outdated state matches the visual contract', async () => {
  const page = await context.newPage();
  await page.setViewportSize({ width: 368, height: 560 });
  await page.goto(`chrome-extension://${extensionId}/popup.html?preview=stale`);

  await expect(page.getByRole('heading', { level: 1 })).toContainText(/严重过时|Severely outdated/);
  await expect(page.locator('.icon-button span')).toHaveText(/设置|Settings/);
  await expect(page.locator('.popup-shell')).toHaveScreenshot('popup-outdated.png');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: /设置|Settings/ })).toBeFocused();
  await page.close();
});

test('popup gives every lag tier distinct copy, color, and icon', async () => {
  const cases = [
    ['current', /已是最新|Up to date/],
    ['behind', /轻微落后|Slightly behind/],
    ['outdated', /明显落后|Noticeably behind/],
    ['stale', /严重过时|Severely outdated/],
  ] as const;
  const appearances = await Promise.all(
    cases.map(async ([kind, title]) => {
      const page = await context.newPage();
      await page.setViewportSize({ width: 368, height: 560 });
      await page.goto(`chrome-extension://${extensionId}/popup.html?preview=${kind}`);
      await expect(page.locator('.popup-shell')).toHaveAttribute('data-state', kind);
      const heading = page.getByRole('heading', { level: 1 });
      await expect(heading).toContainText(title);
      const color = await heading.evaluate((element) => getComputedStyle(element).color);
      const iconClass = await page.locator('.status-icon svg').getAttribute('class');
      await page.close();
      return { color, iconClass };
    }),
  );

  expect(new Set(appearances.map(({ color }) => color)).size).toBe(cases.length);
  expect(new Set(appearances.map(({ iconClass }) => iconClass)).size).toBe(cases.length);
});

test('popup has a complete dark theme', async () => {
  const page = await context.newPage();
  await page.setViewportSize({ width: 368, height: 560 });
  await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' });
  await page.goto(`chrome-extension://${extensionId}/popup.html?preview=stale`);

  await expect(page.locator('.popup-shell')).toHaveScreenshot('popup-outdated-dark.png');
  await page.close();
});

test('options page exposes the enabled notice setting and privacy copy', async () => {
  const page = await context.newPage();
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(`chrome-extension://${extensionId}/options.html`);

  await expect(page.getByRole('switch')).toHaveAttribute('aria-checked', 'true');
  await page.getByRole('switch').click();
  await expect(page.getByRole('switch')).toHaveAttribute('aria-checked', 'false');
  await page.getByRole('switch').click();
  await expect(page.getByRole('switch')).toHaveAttribute('aria-checked', 'true');
  await expect(page.getByText(/已保存|Saved/)).toBeVisible();
  await expect(page.getByText(/设置会自动保存|Settings save automatically/)).toBeVisible();
  await expect(page).toHaveScreenshot('options-light.png', { fullPage: true });
  await page.close();
});

test('options page remains usable at 320 pixels', async () => {
  const page = await context.newPage();
  await page.setViewportSize({ width: 320, height: 700 });
  await page.goto(`chrome-extension://${extensionId}/options.html`);

  await page.getByRole('switch').focus();
  await expect(page.getByRole('switch')).toBeFocused();
  await expect(page.locator('body')).toHaveJSProperty('scrollWidth', 320);
  await expect(page).toHaveScreenshot('options-narrow.png', { fullPage: true });
  await page.close();
});

test('content script mounts an isolated, dismissible notice', async () => {
  await context.route('https://firebase.google.com/docs/cloud-messaging?hl=en', async (route) => {
    await route.fulfill({
      contentType: 'text/html',
      body: '<!doctype html><html lang="en"><body>English original</body></html>',
    });
  });
  await context.route('https://firebase.google.com/__outdated_docs_preview**', async (route) => {
    await route.fulfill({
      contentType: 'text/html',
      body: `<!doctype html>
        <html lang="zh-CN">
          <head><title>Firebase 文档</title></head>
          <body style="margin:0;font-family:system-ui;color:#182230;background:#fff">
            <header style="height:72px;border-bottom:1px solid #dde3eb;display:flex;align-items:center;padding:0 48px;font-weight:700">Firebase 文档</header>
            <main style="max-width:900px;margin:80px auto;padding:0 32px">
              <h1 style="font-size:42px">Cloud Messaging</h1>
              <p style="font-size:18px;color:#667386">构建可靠的跨平台消息传递体验。</p>
            </main>
          </body>
        </html>`,
    });
  });

  const page = await context.newPage();
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(
    'https://firebase.google.com/__outdated_docs_preview?outdated-docs-preview=stale',
  );

  const notice = page.locator('.page-notice');
  await expect(notice).toBeVisible();
  await expect(notice).toHaveScreenshot('page-notice-outdated.png');
  const noticeBounds = await notice.evaluate((element) => {
    const bounds = element.getBoundingClientRect();
    return { centerX: bounds.x + bounds.width / 2, top: bounds.top };
  });
  expect(Math.abs(noticeBounds.centerX - 640)).toBeLessThanOrEqual(1);
  expect(noticeBounds.top).toBeGreaterThanOrEqual(8);
  expect(noticeBounds.top).toBeLessThanOrEqual(20);
  const englishPagePromise = context.waitForEvent('page');
  await notice.getByRole('button', { name: /打开英文原版|Open English original/ }).click();
  const englishPage = await englishPagePromise;
  await expect(englishPage).toHaveURL('https://firebase.google.com/docs/cloud-messaging?hl=en');
  await englishPage.close();
  await notice.getByRole('button', { name: /关闭|Close/ }).click();
  await expect(notice).toBeHidden();
  await page.evaluate(() => {
    history.pushState({}, '', `${location.pathname}?outdated-docs-preview=stale&spa=2`);
  });
  await expect(notice).toBeVisible();
  await page.close();
});

test('in-page notice stays centered on a narrow page', async () => {
  const page = await context.newPage();
  await page.setViewportSize({ width: 375, height: 700 });
  await page.goto(
    'https://firebase.google.com/__outdated_docs_preview?outdated-docs-preview=stale&narrow=1',
  );

  const notice = page.locator('.page-notice');
  await expect(notice).toBeVisible();
  const noticeBounds = await notice.evaluate((element) => {
    const bounds = element.getBoundingClientRect();
    return { centerX: bounds.x + bounds.width / 2, width: bounds.width };
  });
  expect(Math.abs(noticeBounds.centerX - 187.5)).toBeLessThanOrEqual(1);
  expect(noticeBounds.width).toBeLessThanOrEqual(359);
  await expect(notice).toHaveScreenshot('page-notice-narrow.png');
  await page.close();
});

test('in-page notice has a complete dark theme', async () => {
  await context.route('https://firebase.google.com/__outdated_docs_dark_preview**', async (route) => {
    await route.fulfill({
      contentType: 'text/html',
      body: '<!doctype html><html lang="zh-CN"><body style="background:#101923"></body></html>',
    });
  });

  const page = await context.newPage();
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' });
  await page.goto(
    'https://firebase.google.com/__outdated_docs_dark_preview?outdated-docs-preview=stale',
  );

  await expect(page.locator('.page-notice')).toHaveScreenshot('page-notice-outdated-dark.png');
  await page.close();
});
