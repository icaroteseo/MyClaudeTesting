---
name: run-app
description: Launch the D&D 5e Companion web app and drive it with headless Chromium to verify changes or take screenshots. Use when asked to run, start, screenshot, or visually verify the app.
---

# Running the D&D 5e Companion

This is a plain static site (no build step, no package.json). Serve the
repo root and open `index.html` in a browser.

## Serve

```bash
cd /home/user/MyClaudeTesting
python3 -m http.server 8765 >/tmp/server.log 2>&1 & echo $! > /tmp/dev.pid
timeout 15 bash -c 'until curl -sf http://localhost:8765 >/dev/null; do sleep 0.5; done'
```

Stop with `kill $(cat /tmp/dev.pid)`.

## Drive with headless Chromium

Environment specifics (verified in this remote container):

- `chromium-cli` is **not** installed.
- `npx playwright install chromium` **fails** — the network policy blocks
  Playwright's CDN (`403 Host not in allowlist`). Don't retry it.
- A matching Chromium build is **pre-installed** at `/opt/pw-browsers`,
  and Playwright 1.56 is globally installed at
  `/opt/node22/lib/node_modules/playwright`. Use both via:
  - `PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers`
  - `require('/opt/node22/lib/node_modules/playwright')` (NODE_PATH does
    not work for ESM imports — use a `.cjs` script with the absolute
    require path)
- Launch with `args: ['--no-sandbox']` (container has no sandbox).

Driver template:

```bash
cat > /tmp/drive.cjs <<'EOF'
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  const page = await (await browser.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => m.type() === 'error' && errors.push(m.text()));

  await page.goto('http://localhost:8765');
  await page.waitForSelector('text=Dice Roller');

  // Representative interaction: quick-roll a d20, check it lands in history
  await page.locator('button', { hasText: /d20/i }).first().click();
  await page.waitForTimeout(600);
  await page.screenshot({ path: '/tmp/shots/dice.png' });

  // Switch modules via the header nav: data-module is one of
  // dice-roller | character-sheet | spell-tracker | combat-tracker
  await page.click('[data-module="combat-tracker"]');
  await page.waitForTimeout(400);
  await page.screenshot({ path: '/tmp/shots/combat.png' });

  console.log('console errors:', errors.length ? errors : 'none');
  await browser.close();
})();
EOF
mkdir -p /tmp/shots
PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node /tmp/drive.cjs
```

## Gotchas

- Expect exactly one console error: `net::ERR_CERT_AUTHORITY_INVALID`
  from the Google Fonts request going through the sandbox proxy. It is
  environmental, not an app bug; the app falls back to system fonts.
  Any other console error is real.
- Module content is rendered into `<main id="app">` on nav clicks;
  there's no routing or page reload, so `waitForTimeout(400)` after a
  nav click is enough.
