import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { test } from 'node:test';

async function freePort() {
  const server = createServer();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  await new Promise(resolve => server.close(resolve));
  return port;
}

test('리뉴얼 홈에서 일곱 영역과 실제 다음 경로를 탐색할 수 있다', { timeout: 120_000 }, async () => {
  const port = await freePort();
  const base = `http://127.0.0.1:${port}`;
  const child = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'dev', '--hostname', '127.0.0.1', '--port', String(port)], {
    cwd: process.cwd(),
    stdio: ['ignore', 'pipe', 'pipe'],
    env: {
      ...process.env,
      NEXT_PUBLIC_FIREBASE_API_KEY: 'synthetic-test-key',
      NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: 'demo-morspeak.test',
      NEXT_PUBLIC_FIREBASE_PROJECT_ID: 'demo-morspeak',
      NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: 'demo-morspeak.appspot.com',
      NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: '123456789',
      NEXT_PUBLIC_FIREBASE_APP_ID: '1:123456789:web:synthetic',
    },
  });
  let logs = '';
  child.stdout.on('data', chunk => { logs += chunk.toString(); });
  child.stderr.on('data', chunk => { logs += chunk.toString(); });
  try {
    let response;
    for (let attempt = 0; attempt < 100; attempt++) {
      if (child.exitCode !== null) throw new Error(`Next dev exited: ${logs}`);
      try {
        response = await fetch(`${base}/home/renewal`);
        if (response.ok) break;
      } catch { /* Wait for the development server. */ }
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    assert.ok(response?.ok, `Renewal did not load: ${logs}`);
    const html = await response.text();
    const sections = ['about', 'features', 'impact', 'use', 'partner', 'journal', 'press'];
    for (const section of sections) {
      assert.match(html, new RegExp(`id="renewal-${section}"`), `${section} section missing`);
      assert.match(html, new RegExp(`href="#renewal-${section}"`), `${section} navigation missing`);
    }
    for (const label of ['모스픽 소개', '솔루션', '일상의 변화', '이용 안내', '협업', '이야기', '언론']) {
      assert.ok(html.includes(label), `${label} content missing`);
    }
    for (const path of ['/waitlist', '/contact', '/articles/250708', '/articles/251124', '/articles/250609', '/article']) {
      assert.ok(html.includes(`href="${path}"`), `${path} link missing`);
      const destination = await fetch(`${base}${path}`);
      assert.equal(destination.status, 200, `${path} did not resolve`);
    }
  } finally {
    child.kill('SIGTERM');
  }
});
