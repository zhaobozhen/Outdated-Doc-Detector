import { expect, test } from '@playwright/test';
import { chromium, type BrowserContext } from 'playwright';
import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const builtExtensionPath = fileURLToPath(new URL('../.output/chrome-mv3-test', import.meta.url));

let context: BrowserContext;
let extensionId: string;
let temporaryExtensionRoot: string | undefined;

async function createChineseTestExtension(): Promise<string> {
  // Chromium on macOS follows the host UI locale for extension messages even
  // when --lang is supplied, so use a single-locale copy for stable snapshots.
  temporaryExtensionRoot = await mkdtemp(join(tmpdir(), 'outdated-docs-e2e-'));
  const extensionPath = join(temporaryExtensionRoot, 'extension');
  await cp(builtExtensionPath, extensionPath, { recursive: true });

  await rm(join(extensionPath, '_locales', 'en'), { recursive: true, force: true });
  const manifestPath = join(extensionPath, 'manifest.json');
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8')) as Record<string, unknown>;
  manifest.default_locale = 'zh_CN';
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

  return extensionPath;
}

async function installPreviewRoutes(browserContext: BrowserContext): Promise<void> {
  await browserContext.route('https://firebase.google.com/docs/cloud-messaging?hl=en', async (route) => {
    await route.fulfill({
      contentType: 'text/html',
      body: '<!doctype html><html lang="en"><body>English original</body></html>',
    });
  });
  await browserContext.route(
    'https://developer.android.com/develop/ui/compose/performance/stability?hl=en',
    async (route) => {
      await route.fulfill({
        contentType: 'text/html',
        body: '<!doctype html><html lang="en"><body>English original</body></html>',
      });
    },
  );
  await browserContext.route('https://firebase.google.com/__outdated_docs_preview**', async (route) => {
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
  await browserContext.route(
    'https://firebase.google.com/__outdated_docs_dark_preview**',
    async (route) => {
      await route.fulfill({
        contentType: 'text/html',
        body: '<!doctype html><html lang="zh-CN"><body style="background:#101923"></body></html>',
      });
    },
  );
}

test.beforeAll(async ({ headless }) => {
  const extensionPath = await createChineseTestExtension();
  context = await chromium.launchPersistentContext('', {
    channel: 'chromium',
    headless,
    locale: 'zh-CN',
    colorScheme: 'light',
    args: [
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`,
      '--lang=zh-CN',
      '--hide-scrollbars',
    ],
  });

  await installPreviewRoutes(context);

  let serviceWorker = context.serviceWorkers()[0];
  serviceWorker ??= await context.waitForEvent('serviceworker');
  extensionId = new URL(serviceWorker.url()).host;
});

test.afterEach(async () => {
  await Promise.all(context?.pages().map((page) => page.close()) ?? []);
});

test.afterAll(async () => {
  await context?.close();
  if (temporaryExtensionRoot) {
    await rm(temporaryExtensionRoot, { recursive: true, force: true });
  }
});

test('popup severely-outdated state matches the visual contract', async () => {
  const page = await context.newPage();
  await page.setViewportSize({ width: 368, height: 560 });
  await page.goto(`chrome-extension://${extensionId}/popup.html?preview=stale`);

  await expect(page.getByRole('heading', { level: 1 })).toContainText(/严重过时|Severely outdated/);
  await expect(page.locator('.icon-button span')).toHaveText(/设置|Settings/);
  const popup = page.locator('.popup-shell');
  await expect(popup).toHaveCSS('user-select', 'none');
  await expect(popup).toHaveScreenshot('popup-outdated.png');
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

  const popup = page.locator('.popup-shell');
  await expect(popup).toHaveCSS('background-color', 'rgb(0, 0, 0)');
  await expect(popup).toHaveScreenshot('popup-outdated-dark.png');
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
  const pageWidth = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(pageWidth.scrollWidth).toBeLessThanOrEqual(pageWidth.clientWidth);
  await expect(page).toHaveScreenshot('options-narrow.png', { fullPage: true });
  await page.close();
});

test('content script mounts an isolated, dismissible notice', async () => {
  const page = await context.newPage();
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(
    'https://firebase.google.com/__outdated_docs_preview?outdated-docs-preview=stale&outdated-docs-diff=stability',
  );

  const notice = page.locator('.page-notice');
  await expect(notice).toBeVisible();
  await expect(notice).toHaveCSS('user-select', 'none');
  const comparison = notice.getByRole('group', {
    name: /更新时间对比|Timestamp comparison/,
  });
  await expect(comparison).toContainText('2025-07-26');
  await expect(comparison).toContainText('2026-01-16');
  await expect(notice).toHaveScreenshot('page-notice-outdated.png');
  const collapsedBounds = await notice.evaluate((element) => {
    const bounds = element.getBoundingClientRect();
    return { centerX: bounds.x + bounds.width / 2, height: bounds.height, top: bounds.top, width: bounds.width };
  });
  const headerBottom = await page.locator('body > header').evaluate(
    (element) => element.getBoundingClientRect().bottom,
  );
  expect(Math.abs(collapsedBounds.centerX - 640)).toBeLessThanOrEqual(1);
  expect(collapsedBounds.top).toBeGreaterThanOrEqual(headerBottom);
  expect(collapsedBounds.top).toBeLessThanOrEqual(headerBottom + 12);

  const diffButton = notice.getByRole('button', { name: 'Diff' });
  await diffButton.click();
  await expect(diffButton).toHaveAttribute('aria-expanded', 'true');
  await expect.poll(() => notice.evaluate((element) => element.getBoundingClientRect().width))
    .toBeGreaterThan(collapsedBounds.width + 200);
  const expandedBounds = await notice.evaluate((element) => {
    const bounds = element.getBoundingClientRect();
    return { bottom: bounds.bottom, centerX: bounds.x + bounds.width / 2, height: bounds.height };
  });
  expect(Math.abs(expandedBounds.centerX - 640)).toBeLessThanOrEqual(1);
  expect(expandedBounds.height).toBeGreaterThan(collapsedBounds.height);
  expect(expandedBounds.bottom).toBeLessThanOrEqual(800);
  await expect(notice).toContainText(/未检测到可验证差异|No verifiable differences/);
  await expect(notice).toContainText(/9\/9 个章节|9\/9 sections/);
  await expect(notice).toHaveScreenshot('page-notice-diff-aligned.png');

  const englishPagePromise = context.waitForEvent('page');
  await notice.getByRole('button', { name: /打开英文原版|Open English original/ }).click();
  const englishPage = await englishPagePromise;
  await expect(englishPage).toHaveURL(
    'https://developer.android.com/develop/ui/compose/performance/stability?hl=en',
  );
  await englishPage.close();
  await notice.getByRole('button', { name: /关闭|Close/ }).click();
  await expect(notice).toBeHidden();
  await page.evaluate(() => {
    history.pushState({}, '', `${location.pathname}?outdated-docs-preview=stale&spa=2`);
  });
  await expect(notice).toBeVisible();
  await page.close();
});

test('in-page Diff renders verified code and API evidence', async () => {
  const page = await context.newPage();
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(
    'https://firebase.google.com/__outdated_docs_preview?outdated-docs-preview=stale&outdated-docs-diff=changed',
  );

  const notice = page.locator('.page-notice');
  await notice.getByRole('button', { name: 'Diff' }).click();
  await expect(notice).toContainText(/2 条可验证差异|2 verifiable differences/);
  await expect(notice).toContainText('SnapshotStateList<T>');
  await expect(notice).toContainText('val items = immutableListOf(value)');
  await expect(notice).toContainText('val items = listOf(value)');
  await expect(notice).toHaveScreenshot('page-notice-diff-changed.png');
  await page.close();
});

test('in-page notice stays centered on a narrow page', async () => {
  const page = await context.newPage();
  await page.setViewportSize({ width: 375, height: 700 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(
    'https://firebase.google.com/__outdated_docs_preview?outdated-docs-preview=stale&outdated-docs-diff=stability&narrow=1',
  );

  const notice = page.locator('.page-notice');
  await expect(notice).toBeVisible();
  const noticeBounds = await notice.evaluate((element) => {
    const bounds = element.getBoundingClientRect();
    return { centerX: bounds.x + bounds.width / 2, top: bounds.top, width: bounds.width };
  });
  const headerBottom = await page.locator('body > header').evaluate(
    (element) => element.getBoundingClientRect().bottom,
  );
  expect(Math.abs(noticeBounds.centerX - 187.5)).toBeLessThanOrEqual(1);
  expect(noticeBounds.top).toBeGreaterThanOrEqual(headerBottom);
  expect(noticeBounds.width).toBeLessThanOrEqual(359);
  await expect(notice).toHaveScreenshot('page-notice-narrow.png');

  await notice.getByRole('button', { name: 'Diff' }).click();
  await expect(notice.getByRole('button', { name: /收起 Diff|Collapse Diff/ })).toHaveAttribute(
    'aria-expanded',
    'true',
  );
  const expandedBounds = await notice.evaluate((element) => {
    const bounds = element.getBoundingClientRect();
    return { bottom: bounds.bottom, left: bounds.left, right: bounds.right };
  });
  expect(expandedBounds.left).toBeGreaterThanOrEqual(0);
  expect(expandedBounds.right).toBeLessThanOrEqual(375);
  expect(expandedBounds.bottom).toBeLessThanOrEqual(700);
  const pageWidth = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  if (pageWidth.scrollWidth > pageWidth.clientWidth) {
    const diagnostics = await page.evaluate(() => {
      const viewportWidth = innerWidth;
      const snapshot = (element: Element | null) => {
        if (!element) return null;
        const bounds = element.getBoundingClientRect();
        const style = getComputedStyle(element);
        const htmlElement = element instanceof HTMLElement ? element : null;
        return {
          className: element.getAttribute('class'),
          clientWidth: htmlElement?.clientWidth ?? null,
          id: element.id,
          offsetLeft: htmlElement?.offsetLeft ?? null,
          offsetWidth: htmlElement?.offsetWidth ?? null,
          rect: {
            left: bounds.left,
            overflowRight: Math.max(0, bounds.right - viewportWidth),
            right: bounds.right,
            width: bounds.width,
          },
          scrollWidth: htmlElement?.scrollWidth ?? null,
          style: {
            contain: style.contain,
            display: style.display,
            insetInlineEnd: style.insetInlineEnd,
            insetInlineStart: style.insetInlineStart,
            marginInlineEnd: style.marginInlineEnd,
            marginInlineStart: style.marginInlineStart,
            maxWidth: style.maxWidth,
            minWidth: style.minWidth,
            overflowX: style.overflowX,
            position: style.position,
            transform: style.transform,
            width: style.width,
          },
          tagName: element.tagName,
        };
      };
      const shadowHost = document.querySelector('outdated-docs-notice');
      const shadow = shadowHost?.shadowRoot;
      const shadowElements = shadow ? [...shadow.querySelectorAll('*')].map(snapshot) : [];
      return {
        body: snapshot(document.body),
        bodyChildren: [...document.body.children].map(snapshot),
        documentElement: snapshot(document.documentElement),
        media: {
          max480: matchMedia('(max-width: 480px)').matches,
          max680: matchMedia('(max-width: 680px)').matches,
          reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches,
        },
        shadowElements,
        shadowHost: snapshot(shadowHost),
        viewport: {
          devicePixelRatio,
          innerWidth: viewportWidth,
          visualViewportWidth: visualViewport?.width ?? null,
        },
      };
    });
    console.log(`NARROW_OVERFLOW_DIAGNOSTICS ${JSON.stringify(diagnostics)}`);
  }
  expect(pageWidth.scrollWidth).toBeLessThanOrEqual(pageWidth.clientWidth);
  await expect(notice).toHaveScreenshot('page-notice-diff-narrow.png');
  await page.close();
});

test('in-page notice has a complete dark theme', async () => {
  const page = await context.newPage();
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' });
  await page.goto(
    'https://firebase.google.com/__outdated_docs_dark_preview?outdated-docs-preview=stale&outdated-docs-diff=stability',
  );

  const notice = page.locator('.page-notice');
  await expect(notice).toHaveScreenshot('page-notice-outdated-dark.png');
  await notice.getByRole('button', { name: 'Diff' }).click();
  await expect(notice).toHaveScreenshot('page-notice-diff-dark.png');
  await page.close();
});
