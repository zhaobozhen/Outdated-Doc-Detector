# Outdated Docs Agent Guide

Root instructions for coding agents in this repository. Keep this file
operational: durable product decisions, validation commands, module boundaries,
and recurring pitfalls only.

## First Read

- This repository contains a Chrome Manifest V3 extension built with WXT,
  React, and TypeScript.
- Read this file first, then use `README.md` for the human-facing product,
  architecture, and usage overview.
- Run commands from the repository root unless a tool explicitly requires a
  different working directory.
- Start with `git status --short`. Never revert unrelated user changes in a
  dirty worktree.
- Preserve the adapter boundary. Site-specific selectors and date parsing do
  not belong in Popup, Options, background, or generic analysis modules.

## Project Map

| Area | Path | Runtime | What it owns |
| --- | --- | --- | --- |
| Background | `entrypoints/background.ts` | MV3 service worker | Cross-origin English fetches, per-tab session results, toolbar state. |
| Detector | `entrypoints/detector.content/` | Content script + React Shadow Root | Current-page parsing, analysis orchestration, SPA detection, page notice. |
| Popup | `entrypoints/popup/` | React extension page | Result display, retry, English link, Options entrypoint. |
| Options | `entrypoints/options/` | React extension page | `showPageNotice` preference and privacy explanation. |
| Site adapters | `lib/analyzers/` | TypeScript + DOM | Supported hosts, selectors, locale and timestamp extraction. |
| Analysis | `lib/analysis/` | TypeScript | Result model, freshness classification, orchestration, cache guard. |
| Messaging | `lib/messages.ts`, `lib/messageClient.ts` | Extension runtime | Validated request and response contracts. |
| Shared UI | `components/` | React + CSS | Lucide freshness icon mapping, page notice, visual tokens. |
| Localization | `public/_locales/`, `lib/i18n.ts` | Chrome i18n | English and Simplified Chinese product copy. |
| Tests | `tests/fixtures/`, `e2e/` | Vitest + Playwright | Stable DOM fixtures, real MV3 flows, visual baselines. |

## High-Value Entry Points

- WXT and manifest config: `wxt.config.ts`
- Supported site registry: `lib/analyzers/sites.ts`
- Adapter registry: `lib/analyzers/index.ts`
- MDN adapter: `lib/analyzers/MdnAdapter.ts`
- Google DevSite adapter: `lib/analyzers/GoogleDevsiteAdapter.ts`
- Analysis orchestration: `lib/analysis/analyzePage.ts`
- Freshness thresholds: `lib/analysis/classify.ts`
- Result types: `lib/analysis/types.ts`
- Runtime message validation: `lib/messages.ts`
- Synchronized setting: `lib/storage/settings.ts`
- Playwright extension suite: `e2e/extension.spec.ts`

## Common Commands

| Task | Command |
| --- | --- |
| Install dependencies | `npm install` |
| Audit dependencies | `npm audit --audit-level=low` |
| WXT development mode | `npm run dev` |
| Lint | `npm run lint` |
| Typecheck | `npm run typecheck` |
| Unit and fixture tests | `npm test` |
| Production build | `npm run build` |
| Background MV3 browser tests | `npm run test:e2e` |
| Headed MV3 visual tests | `npm run test:e2e:visual` |
| Replace visual baselines | `npm run test:e2e:update` |
| Chrome Web Store ZIP | `npm run zip` |

For docs-only changes, inspect links and rendered Markdown; builds are normally
unnecessary. For source changes, run the narrowest relevant check first, then
broaden when an adapter, runtime contract, manifest boundary, or shared UI
surface changes.

## Core Product Decisions

- Chrome Manifest V3 is the only first-release browser target.
- The extension reports timestamp lag. It does not claim content differs and
  does not judge translation quality.
- Unreliable inputs must produce `unknown` or a retryable `error`. Never turn a
  missing date, missing English link, invalid date, redirect mismatch, or
  network failure into a freshness warning.
- Up to 30 minutes behind is `current`; over 30 minutes and under 7 days is
  `behind`; 7 through 44 days is `outdated`; at least 45 days is `stale`. A
  localized page newer than English remains `current`.
- The content script parses both the current DOM and returned English HTML. The
  service worker owns only validated cross-origin retrieval and extension
  state.
- The only persisted preference is `showPageNotice=true` in
  `chrome.storage.sync`. Per-tab analysis snapshots use
  `chrome.storage.session`, are bound to the exact page URL, and clear on
  navigation or tab removal.
- No account, backend, analytics, telemetry, arbitrary user rules, or remotely
  hosted executable code belongs in the first release.

## Adapter And Network Rules

- `lib/analyzers/sites.ts` is the source of truth for supported site IDs, hosts,
  content-script matches, and manifest host permissions.
- `MdnAdapter` handles only `developer.mozilla.org`.
- `GoogleDevsiteAdapter` handles Android Developers, Google for Developers,
  Firebase, TensorFlow, AOSP, and both Google Cloud documentation hosts.
- Adding a site requires a registry change, a matching adapter path, a stable
  DOM fixture, and focused adapter or analysis tests. Do not add broad wildcard
  host permissions for convenience.
- English requests must use HTTPS and stay inside the originating adapter
  family. Use site credentials because signed-in Google DevSite sessions
  redirect anonymous requests through OAuth; set `redirect: 'error'` so those
  credentials are never forwarded to another origin.
- Google DevSite English URLs must explicitly set `hl=en`. Its bare
  `hreflang="en"` URL is language-negotiated and can return the browser's
  localized page; reject a fetched DevSite document whose declared locale is
  not English before comparing timestamps.
- Prefer a page's declared comparable timestamp. Google DevSite may fall back
  to a reliable HTTP `Last-Modified` value only when its English footer date is
  absent. Never use response time as document time.
- Parse external HTML as data. Do not inject fetched markup into extension UI.

## Messaging And State Rules

- Keep transport contracts in `lib/messages.ts` and use the typed helpers in
  `lib/messageClient.ts` at call sites.
- Runtime message validation is a trust boundary. New message variants need
  payload validation and tests.
- Preserve the originating adapter ID in English-fetch messages so redirects
  cannot cross parser families.
- A cached result is reusable only when its `pageUrl` matches the active tab URL
  exactly. Clear toolbar and session state when navigation invalidates it.
- Content-script analyses may overlap during SPA navigation. Preserve the run
  ID guard so an older request cannot overwrite a newer result.

## UI And Localization Rules

- Keep the Popup at 368 px and preserve the compact developer-dashboard
  hierarchy: status, timestamp comparison, actions, verified host.
- Use native CSS variables and the existing shared tokens. Do not add Tailwind
  or a component library for this small UI.
- The page notice must remain inside the WXT Shadow Root, use px-based sizing,
  stay keyboard accessible, and avoid covering document content unnecessarily.
- Preserve light and dark themes. Status meaning must use text and shape in
  addition to color.
- Keep `Alt+Shift+E`, visible focus, native button semantics, and useful ARIA
  labels.
- `public/_locales/en/messages.json` and
  `public/_locales/zh_CN/messages.json` are the user-facing copy sources of
  truth. Keep keys and placeholders aligned.
- After locale-key changes, run `npm run prepare` before typechecking.
- Keep dates in stable `YYYY-MM-DD` display form. Do not expose internal enum or
  browser API names in user-facing copy.
- Test preview data belongs only to WXT test mode. Confirm production output
  does not contain preview query flags or fixture dates when that boundary
  changes.

## Permissions And Privacy

- Production permissions stay limited to `storage` and exact supported HTTPS
  documentation hosts.
- Do not add `tabs`, broad browsing-history access, remote code, telemetry, or
  external services without an explicit product decision.
- Do not send page content or browsing data anywhere except the supported
  English-original request required for the comparison.
- Keep `PRIVACY.md`, README permission claims, and the built manifest aligned.
- Treat permission expansion, URL validation, message validation, and HTML
  parsing changes as security-sensitive.

## Validation Guidance

- Analysis or adapter changes: run `npm run lint`, `npm run typecheck`, and
  `npm test`.
- Manifest, background, content-script, or permission changes: also run
  `npm run build` and inspect `.output/chrome-mv3/manifest.json`.
- Popup, Options, notice, theme, or interaction changes: run the relevant static
  checks and `npm run test:e2e`.
- Visual changes require inspecting both the accepted concept under
  `docs/design/` and the latest implementation screenshot in the same QA pass.
- Use `.github/workflows/update-visual-baselines.yml` after intentionally
  accepting a visual change. It regenerates candidates and verifies them with a
  headed visual E2E pass before upload. Inspect its macOS 26 artifact before
  replacing tracked snapshots, then require the normal CI workflow to pass after
  commit.
- `npm run test:e2e:update` is suitable for local preview, but locally generated
  Darwin snapshots are not canonical when the host OS differs from the CI image.
- Browser GUI validation must launch the entire Playwright/WXT parent process
  outside the sandbox. Do not start only a child Chromium process outside it.
- Real MV3 Playwright tests use bundled Chromium's new headless mode by default
  and skip platform-sensitive screenshot assertions. Keep the manually launched
  persistent context bound to Playwright's configured `headless` value. Use
  `npm run test:e2e:visual` for explicit headed snapshot validation; CI and
  Nightly must retain that visual gate.
- Release preparation requires the full README gate followed by `npm run zip`.
- If the default npm cache is not writable in a sandbox, use
  `/private/tmp/outdated-doc-detector-npm-cache`. Do not rewrite the lockfile to
  a different registry as a workaround.

## Dependency And Output Rules

- Keep exact dependency versions and the npm lockfile unless the task explicitly
  calls for an upgrade.
- Node.js 26.5.0 is the documented and CI-validated minimum. Keep both workflow
  pins, `package.json`, the lockfile root package, and README requirements
  aligned when changing it.
- Direct `vite@8.1.4` and `vite-node@6.0.0` pins are intentional. Do not change
  the build toolchain without updating and proving the project requirement.
- `package.json` overrides keep WXT's development-only dependency chain on
  patched `esbuild`, `shell-quote`, `tmp`, and CommonJS-compatible `uuid`
  versions. Remove an override only after the upstream chain is fixed and the
  full release gate passes without it.
- `.wxt/`, `.output/`, `test-results/`, `playwright-report/`, caches, and local
  logs are generated and must not be committed.
- Visual snapshots, stable DOM fixtures, locale catalogs, icons, and design
  references are source artifacts and should be committed when intentionally
  changed.

## GitHub Automation Rules

- `.github/workflows/ci.yml` runs the full release gate for `main`, pull
  requests, and manual dispatches with read-only repository permissions.
- `.github/workflows/nightly-release.yml` runs daily at 00:17 Asia/Shanghai
  and by manual dispatch from the default branch. It alone has
  `contents: write`.
- `.github/workflows/update-visual-baselines.yml` is manual-only and uploads
  macOS 26 snapshot candidates without writing to the repository.
- All three workflows use `macos-26` because the accepted Playwright screenshots
  are Darwin-specific. Changing runner OS requires replacing and reviewing the
  corresponding visual baselines.
- CI and Nightly retain Playwright failure screenshots and diffs for 7 days so
  visual failures can be reviewed before changing a baseline or tolerance.
- Nightly publication moves the lightweight `nightly` tag and updates one
  prerelease in place. It publishes the Chrome ZIP plus a SHA-256 checksum and
  must not mark that prerelease as the latest stable release.

## Commit Rules

- Run the relevant validation commands before committing and inspect
  `git diff --cached --stat`.
- Before each commit, consider whether this file needs a durable rule learned
  from the task. Add recurring guidance only, not one-off incidents.
- Do not commit build output, caches, `.DS_Store`, logs, or temporary files.
- Do not publish to the Chrome Web Store, push branches, or change a user's
  persistent browser profile unless the user explicitly asks.

## Agent Workflow

1. Start with `git status --short`.
2. Inspect the smallest relevant area with `rg` or `rg --files`.
3. Read existing local patterns before editing.
4. Keep edits focused and avoid unrelated refactors or generated-output churn.
5. Run the narrowest relevant validation, then report exactly what passed,
   failed, or was skipped.

## Compact Instructions

If context is compacted, preserve these facts:

- Current user request and exact screenshots, paths, URLs, issue links, or
  commits.
- Files read and files changed.
- Commands run and pass, fail, or blocker results.
- Current dev server URL and whether it may be stale.
- Current git status and whether changes are user-owned or agent-owned.
- Current extension build path and whether it is production or test mode.
- Any browser process, extension ID, active test page, or visual baseline state.
- Any unresolved permission, adapter, selector, or release decision that must
  not be guessed after compaction.
