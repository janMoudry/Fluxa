import { test, expect } from '@playwright/test';

type TestWin = Window & {
  __fluxa_ready__?: boolean;
  observe: (ev: string) => unknown;
  getCount: (ev: string) => number;
  emit: (ev: string, payload?: unknown) => void;
};

test('BroadcastChannel delivers across tabs on same channel', async ({ browser, baseURL }) => {
  const ctx = await browser.newContext();
  const pageA = await ctx.newPage();
  const pageB = await ctx.newPage();

  const channel = `ch-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  await pageA.goto(`${baseURL}/e2e/pages/tab.html?channel=${channel}&ctx=A`);
  await pageB.goto(`${baseURL}/e2e/pages/tab.html?channel=${channel}&ctx=B`);
  await pageA.waitForFunction(() => (window as unknown as TestWin).__fluxa_ready__ === true);
  await pageB.waitForFunction(() => (window as unknown as TestWin).__fluxa_ready__ === true);

  await pageA.evaluate(() => (window as unknown as TestWin).observe('ping'));
  await pageB.evaluate(() => (window as unknown as TestWin).observe('ping'));

  await pageA.evaluate(() => (window as unknown as TestWin).emit('ping', { n: 1 }));

  await expect.poll(async () => pageB.evaluate(() => (window as unknown as TestWin).getCount('ping'))).toBe(1);
  // Sender should have only local delivery (no echo from BC)
  await expect.poll(async () => pageA.evaluate(() => (window as unknown as TestWin).getCount('ping'))).toBe(1);

  await ctx.close();
});

test('BroadcastChannel isolation by channel name', async ({ browser, baseURL }) => {
  const ctx = await browser.newContext();
  const pageA = await ctx.newPage();
  const pageB = await ctx.newPage();
  const pageC = await ctx.newPage();

  const channel1 = `ch-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const channel2 = channel1 + '-other';

  await pageA.goto(`${baseURL}/e2e/pages/tab.html?channel=${channel1}&ctx=A`);
  await pageB.goto(`${baseURL}/e2e/pages/tab.html?channel=${channel1}&ctx=B`);
  await pageC.goto(`${baseURL}/e2e/pages/tab.html?channel=${channel2}&ctx=C`);
  await pageA.waitForFunction(() => (window as unknown as TestWin).__fluxa_ready__ === true);
  await pageB.waitForFunction(() => (window as unknown as TestWin).__fluxa_ready__ === true);
  await pageC.waitForFunction(() => (window as unknown as TestWin).__fluxa_ready__ === true);

  await pageB.evaluate(() => (window as unknown as TestWin).observe('ping'));
  await pageC.evaluate(() => (window as unknown as TestWin).observe('ping'));

  await pageA.evaluate(() => (window as unknown as TestWin).emit('ping', { n: 1 }));

  await expect.poll(async () => pageB.evaluate(() => (window as unknown as TestWin).getCount('ping'))).toBe(1);
  await expect.poll(async () => pageC.evaluate(() => (window as unknown as TestWin).getCount('ping'))).toBe(0);

  await ctx.close();
});
