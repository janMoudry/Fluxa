import { test, expect } from '@playwright/test';

type TestWin = Window & {
  __fluxa_ready__?: boolean;
  observe: (ev: string) => unknown;
  getCount: (ev: string) => number;
  emit: (ev: string, payload?: unknown) => void;
  unregister?: () => void;
};

const PORT_A = Number(process.env.PORT_A || 4178);
const PORT_B = Number(process.env.PORT_B || 4179);

test('Parent → Child via postMessage with allowed "*"', async ({ page, baseURL }) => {
  await page.goto(`${baseURL}/e2e/pages/host.html?allow=*`);
  await page.waitForFunction(() => (window as unknown as TestWin).__fluxa_ready__ === true);
  const frameEl = await page.waitForSelector('iframe');
  await frameEl.waitForElementState('stable');
  await expect.poll(async () => page.frames().some(f => f.url().includes('/e2e/pages/child.html'))).toBe(true);
  const childFrame = page.frames().find(f => f.url().includes('/e2e/pages/child.html'))!;
  await childFrame.waitForFunction(() => (window as any).__fluxa_ready__ === true);
  await childFrame.evaluate(() => (window as unknown as TestWin).observe('ping'));
  await page.evaluate(() => (window as unknown as TestWin).emit('ping', { n: 1 }));
  await expect.poll(async () => childFrame.evaluate(() => (window as unknown as TestWin).getCount('ping'))).toBe(1);
});

test('Child → Parent via postMessage with allowed "*"', async ({ page, baseURL }) => {
  await page.goto(`${baseURL}/e2e/pages/host.html?allow=*`);
  await page.waitForFunction(() => (window as unknown as TestWin).__fluxa_ready__ === true);
  const frameEl = await page.waitForSelector('iframe');
  await frameEl.waitForElementState('stable');
  await expect.poll(async () => page.frames().some(f => f.url().includes('/e2e/pages/child.html'))).toBe(true);
  const childFrame = page.frames().find(f => f.url().includes('/e2e/pages/child.html'))!;
  await childFrame.waitForFunction(() => (window as any).__fluxa_ready__ === true);
  await page.evaluate(() => (window as unknown as TestWin).observe('pong'));
  await childFrame.evaluate(() => (window as unknown as TestWin).emit('pong', { n: 2 }));
  await expect.poll(async () => page.evaluate(() => (window as unknown as TestWin).getCount('pong'))).toBe(1);
});

test('Blocked by allowedOrigins mismatch (child on different origin)', async ({ page }) => {
  const host = `http://localhost:${PORT_A}`;
  const child = `http://localhost:${PORT_B}`;
  // Host only allows same-origin; child served from other port.
  await page.goto(`${host}/e2e/pages/host.html?allow=same&child_origin=${encodeURIComponent(child)}&child_allow=*`);
  await page.waitForFunction(() => (window as unknown as TestWin).__fluxa_ready__ === true);
  const frameEl = await page.waitForSelector('iframe');
  await frameEl.waitForElementState('stable');
  await expect.poll(async () => page.frames().some(f => f.url().startsWith(child))).toBe(true);
  const childFrame = page.frames().find(f => f.url().startsWith(child))!;
  await childFrame.waitForFunction(() => (window as any).__fluxa_ready__ === true);

  // Parent should not accept child → parent
  await page.evaluate(() => (window as unknown as TestWin).observe('x'));
  await childFrame.evaluate(() => (window as unknown as TestWin).emit('x', { n: 3 }));
  // Give it a moment and assert still zero
  await page.waitForTimeout(200);
  expect(await page.evaluate(() => (window as unknown as TestWin).getCount('x'))).toBe(0);

  // Parent → child should be accepted by child (child allows '*')
  await childFrame.evaluate(() => (window as unknown as TestWin).observe('y'));
  await page.evaluate(() => (window as unknown as TestWin).emit('y', { n: 4 }));
  await expect.poll(async () => childFrame.evaluate(() => (window as unknown as TestWin).getCount('y'))).toBe(1);
});

test('unregisterFramePeer stops Parent → Child delivery', async ({ page, baseURL }) => {
  await page.goto(`${baseURL}/e2e/pages/host.html?allow=*`);
  await page.waitForFunction(() => (window as unknown as TestWin).__fluxa_ready__ === true);
  const frameEl = await page.waitForSelector('iframe');
  await frameEl.waitForElementState('stable');
  await expect.poll(async () => page.frames().some(f => f.url().includes('/e2e/pages/child.html'))).toBe(true);
  const childFrame = page.frames().find(f => f.url().includes('/e2e/pages/child.html'))!;
  await childFrame.waitForFunction(() => (window as any).__fluxa_ready__ === true);
  await childFrame.evaluate(() => (window as unknown as TestWin).observe('z'));
  await page.evaluate(() => (window as unknown as TestWin).emit('z', { n: 1 }));
  await expect.poll(async () => childFrame.evaluate(() => (window as unknown as TestWin).getCount('z'))).toBe(1);
  await page.evaluate(() => (window as unknown as TestWin).unregister?.());
  await page.evaluate(() => (window as unknown as TestWin).emit('z', { n: 2 }));
  await page.waitForTimeout(200);
  expect(await childFrame.evaluate(() => (window as unknown as TestWin).getCount('z'))).toBe(1);
});
