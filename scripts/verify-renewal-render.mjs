import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const base = process.env.RENEWAL_BASE_URL ?? 'http://127.0.0.1:3187';
const chrome = process.env.CHROME_PATH ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const output = 'docs/renewal-verification';
const profile = await mkdtemp(join(tmpdir(), 'morspeak-render-'));
const child = spawn(chrome, [
  '--headless=new', '--no-first-run', '--disable-gpu', '--remote-debugging-port=0',
  `--user-data-dir=${profile}`, 'about:blank',
], { stdio: 'ignore' });

try {
  let port;
  for (let attempt = 0; attempt < 100; attempt++) {
    try {
      port = (await readFile(join(profile, 'DevToolsActivePort'), 'utf8')).split('\n')[0];
      break;
    } catch {
      assert.equal(child.exitCode, null, 'Chrome exited before remote debugging started');
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  assert.ok(port, 'Chrome remote debugging did not start');
  const pages = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
  const page = pages.find(item => item.type === 'page');
  assert.ok(page, 'Chrome did not create a page');
  const socket = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    socket.addEventListener('open', resolve, { once: true });
    socket.addEventListener('error', reject, { once: true });
  });
  let id = 0;
  const pending = new Map();
  socket.addEventListener('message', event => {
    const message = JSON.parse(event.data);
    if (!message.id) return;
    const item = pending.get(message.id);
    if (!item) return;
    pending.delete(message.id);
    if (message.error) item.reject(new Error(message.error.message));
    else item.resolve(message.result);
  });
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const callId = ++id;
    pending.set(callId, { resolve, reject });
    socket.send(JSON.stringify({ id: callId, method, params }));
  });
  const evaluate = async expression => {
    const result = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
    return result.result.value;
  };
  await send('Page.enable');
  await send('Runtime.enable');
  const capture = async name => {
    const { data } = await send('Page.captureScreenshot', { format: 'png', fromSurface: true });
    await writeFile(`${output}/${name}.png`, Buffer.from(data, 'base64'));
  };

  for (const viewport of [
    { name: 'desktop-1440', width: 1440, height: 900, mobile: false },
    { name: 'mobile-390', width: 390, height: 844, mobile: true },
  ]) {
    await send('Emulation.setDeviceMetricsOverride', {
      width: viewport.width, height: viewport.height, deviceScaleFactor: 1,
      mobile: viewport.mobile,
    });
    await send('Page.navigate', { url: `${base}/home/renewal` });
    const ready = await evaluate(`(async () => {
      for (let i = 0; i < 100; i++) {
        if (document.readyState === 'complete' && document.querySelector('h1')) break;
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      await document.fonts.ready;
      await Promise.all([...document.images].filter(image => image.getBoundingClientRect().top < innerHeight).map(image => image.decode().catch(() => {})));
      return {
        width: innerWidth,
        scrollWidth: document.documentElement.scrollWidth,
        heading: document.querySelector('h1')?.textContent,
        menuVisible: [...document.querySelectorAll('button')].some(button => button.getAttribute('aria-label') === '메뉴 열기' && getComputedStyle(button).display !== 'none'),
        heroImageLoaded: [...document.querySelectorAll('main img')].some(image => image.getBoundingClientRect().top < innerHeight && image.naturalWidth > 0),
      };
    })()`);
    assert.equal(ready.width, viewport.width, `${viewport.name}: viewport mismatch`);
    assert.ok(ready.scrollWidth <= viewport.width, `${viewport.name}: horizontal overflow (${ready.scrollWidth})`);
    assert.match(ready.heading ?? '', /Small, Yet Significant/);
    assert.equal(ready.menuVisible, viewport.mobile, `${viewport.name}: wrong navigation mode`);
    assert.ok(ready.heroImageLoaded, `${viewport.name}: hero image did not load`);
    const heroAssets = await evaluate(`({
      images: [...document.querySelectorAll('[data-slide] picture img')].map(image => ({
        source: new URL(image.currentSrc).pathname,
        loaded: image.naturalWidth > 0,
      })),
      pause: !!document.querySelector('button[aria-label="사진 자동 전환 일시정지"]'),
      symbols: document.querySelectorAll('section svg[class*="resourceIcon"]').length,
    })`);
    assert.equal(heroAssets.images.length, 3, `${viewport.name}: hero image count changed`);
    assert.ok(heroAssets.images.every(image => image.loaded), `${viewport.name}: hero image missing`);
    assert.ok(heroAssets.images.every(image => image.source.endsWith(viewport.mobile ? 'M.webp' : '2026.webp')), `${viewport.name}: wrong hero assets`);
    assert.ok(heroAssets.pause, `${viewport.name}: transition control missing`);
    assert.equal(heroAssets.symbols, 6, `${viewport.name}: movement symbols missing`);
    await capture(viewport.name);
    const initialSlide = await evaluate(`document.querySelector('[data-slide][aria-hidden="false"]')?.getAttribute('data-slide')`);
    await new Promise(resolve => setTimeout(resolve, 3700));
    const advancedSlide = await evaluate(`document.querySelector('[data-slide][aria-hidden="false"]')?.getAttribute('data-slide')`);
    assert.notEqual(advancedSlide, initialSlide, `${viewport.name}: hero did not advance after its 3.5-second step`);
    if (viewport.mobile) {
      const menu = await evaluate(`(async () => {
        const button = document.querySelector('button[aria-label="메뉴 열기"]');
        button?.click();
        for (let i = 0; i < 20 && !document.querySelector('#renewal-menu'); i++) {
          await new Promise(resolve => setTimeout(resolve, 50));
        }
        return { expanded: button?.getAttribute('aria-expanded'), links: document.querySelectorAll('#renewal-menu a').length };
      })()`);
      assert.equal(menu.expanded, 'true', 'mobile menu did not open');
      assert.equal(menu.links, 7, 'mobile menu must expose all seven sections');
      await evaluate(`document.querySelector('button[aria-label="메뉴 닫기"]')?.click()`);
    }
    for (const sectionId of ['renewal-about', 'renewal-features', 'renewal-impact', 'renewal-use', 'renewal-partner', 'renewal-journal', 'renewal-press']) {
      const section = await evaluate(`(() => {
        const element = document.getElementById(${JSON.stringify(sectionId)});
        element?.scrollIntoView();
        const heading = element?.querySelector('h2');
        const rect = heading?.getBoundingClientRect();
        return {
          heading: heading?.textContent,
          headingTop: rect?.top,
          headingBottom: rect?.bottom,
          navBottom: document.querySelector('header')?.getBoundingClientRect().bottom,
          scrollWidth: document.documentElement.scrollWidth,
        };
      })()`);
      assert.ok(section.heading, `${viewport.name}/${sectionId}: section heading missing`);
      assert.ok(section.headingTop >= section.navBottom, `${viewport.name}/${sectionId}: heading covered by navigation`);
      assert.ok(section.headingBottom <= viewport.height, `${viewport.name}/${sectionId}: heading outside viewport`);
      assert.ok(section.scrollWidth <= viewport.width, `${viewport.name}/${sectionId}: horizontal overflow`);
    }
    await evaluate(`document.querySelector('#renewal-impact')?.scrollIntoView()`);
    await capture(`${viewport.name}-impact`);
    await evaluate(`document.querySelector('#renewal-journal')?.scrollIntoView()`);
    await capture(`${viewport.name}-stories`);
    await evaluate(`document.querySelector('#renewal-press')?.scrollIntoView()`);
    await capture(`${viewport.name}-press`);
    console.log(`${viewport.name}: ${ready.width}px, overflow ${ready.scrollWidth}px, hero loaded, navigation correct, screenshots saved`);
  }
  for (const { selector, path, heading, screenshot } of [
    { selector: '#renewal-use a[href="/waitlist"]', path: '/waitlist', heading: '모스픽 이용 신청', screenshot: 'mobile-390-waitlist' },
    { selector: '#renewal-partner a[href="/contact"]', path: '/contact', heading: '기관·기업 협업 문의', screenshot: 'mobile-390-contact' },
  ]) {
    await send('Page.navigate', { url: `${base}/home/renewal` });
    const destination = await evaluate(`(async () => {
      for (let i = 0; i < 100 && !document.querySelector(${JSON.stringify(selector)}); i++) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      const link = document.querySelector(${JSON.stringify(selector)});
      if (!link) return { error: 'CTA missing' };
      link.click();
      for (let i = 0; i < 100; i++) {
        if (location.pathname === ${JSON.stringify(path)} && document.querySelector('h1')?.textContent?.includes(${JSON.stringify(heading)})) break;
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      return { path: location.pathname, heading: document.querySelector('h1')?.textContent ?? '' };
    })()`);
    assert.equal(destination.path, path, `${path}: CTA did not navigate`);
    assert.match(destination.heading, new RegExp(heading), `${path}: form heading missing`);
    await capture(screenshot);
    console.log(`${path}: CTA click navigated to the form; no form submission`);
  }
  for (const { path, name, heading } of [
    { path: '/home/renewal/stories', name: 'mobile-390-story-list', heading: '문제를 듣고, 만들고,' },
    { path: '/home/renewal/stories/250708', name: 'mobile-390-story-detail', heading: '국내에서 사용 과정을 살펴본 기록' },
  ]) {
    await send('Page.navigate', { url: `${base}${path}` });
    const state = await evaluate(`(async () => {
      for (let i = 0; i < 100; i++) {
        if (document.querySelector('h1')?.textContent?.includes(${JSON.stringify(heading)})) break;
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      return { heading: document.querySelector('h1')?.textContent ?? '', width: innerWidth, scrollWidth: document.documentElement.scrollWidth };
    })()`);
    assert.ok(state.heading.includes(heading), `${path}: heading missing`);
    assert.equal(state.width, 390, `${path}: wrong viewport`);
    assert.ok(state.scrollWidth <= 390, `${path}: horizontal overflow`);
    await capture(name);
    if (name === 'mobile-390-story-detail') {
      await evaluate(`document.querySelector('article')?.lastElementChild?.scrollIntoView()`);
      await capture('mobile-390-story-detail-source');
    }
    console.log(`${path}: mobile story rendered without overflow, screenshot saved`);
  }
  socket.close();
} finally {
  child.kill('SIGTERM');
  if (child.exitCode === null) await new Promise(resolve => child.once('exit', resolve));
  await rm(profile, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
}
