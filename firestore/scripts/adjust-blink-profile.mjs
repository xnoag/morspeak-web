// 환자 한 명의 깜빡임 감지 설정을 원격으로 조정한다.
//
// 왜 (2026-09-11)
//   승일희망요양병원 김옥순님이 "눈깜빡임으로는 반영이 안 된다" 는 상태로 며칠을 보냈다.
//   원인: 임계값 학습이 **통과한 깜빡임만** 기록해 기준값이 한 번 올라가면 안 내려온다.
//   분석: ~/knowledge/notes/깜빡임-임계값-학습이-실패를-못-본다.md
//
// ⚠️ 원격으로 **즉시** 듣는 값은 하나뿐이다 — 앱 코드를 읽고 확인했다.
//
//   minBlinkOverride    ✅ 즉시   BlinkProfileStore.startRemoteListener 가 구독한다
//   dotDashBoundary     ✅ 즉시   〃
//   blinkTimerInterval  ✅ 즉시   〃
//   enterTh / peakBuffer ⚠️ 앱 재시작 후   리스너 화이트리스트에 없다.
//                            loadRemote() 가 시작할 때만 받고, 그것도
//                            updatedAt 이 기기 값보다 커야 한다
//   enterThOverride     ❌ 안 먹는다   BlinkProfile 에 선언만 있고 감지 코드가 안 읽는다
//
//   → **임계값을 바로 낮추는 길은 기기에서 「눈 깜빡임 민감도」를 내리는 것뿐이다.**
//     (완전민감 ×0.45 · 민감 ×0.60 · 보통 ×0.78 · 둔감 ×0.95 · 완전둔감 ×1.10)
//
// 기본은 미리보기다. 실제로 쓰려면 --apply.
//
//   FB_API_KEY=… FB_APP_ID=… node adjust-blink-profile.mjs HDU8B6
//   … node adjust-blink-profile.mjs HDU8B6 --minblink 0.05 --apply
//   … node adjust-blink-profile.mjs HDU8B6 --reset-peaks --apply   (앱 재시작 필요)
//   … node adjust-blink-profile.mjs HDU8B6 --restore <백업파일>
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { getFirestore, doc, getDoc, updateDoc } from 'firebase/firestore';
import { writeFileSync, readFileSync } from 'node:fs';

const argv = process.argv.slice(2);
const code = argv.find((a) => !a.startsWith('-'));
const flag = (n) => { const i = argv.indexOf(n); return i < 0 ? null : argv[i + 1]; };
const has = (n) => argv.includes(n);
const APPLY = has('--apply');
if (!code) { console.error('환자 채팅코드를 주세요. 예: HDU8B6'); process.exit(1); }

const app = initializeApp({
  apiKey: process.env.FB_API_KEY,
  authDomain: 'morspeak-a5e46.firebaseapp.com',
  projectId: 'morspeak-a5e46',
  appId: process.env.FB_APP_ID,
});
const db = getFirestore(app);
await signInAnonymously(getAuth(app));

const ref = doc(db, 'blinkProfiles', code);
const snap = await getDoc(ref);
if (!snap.exists()) { console.error(`blinkProfiles/${code} 가 없습니다`); process.exit(1); }
const cur = snap.data();

// 되돌릴 수 있게 먼저 통째로 받아 둔다
const backup = `/tmp/blinkProfile-${code}-${Date.now()}.json`;
writeFileSync(backup, JSON.stringify(cur, null, 2));

const pb = cur.peakBuffer || [];
console.log(`■ ${code} 현재 상태   (백업: ${backup})`);
console.log(`  enterTh          ${cur.enterTh}`);
console.log(`  peakBuffer       ${JSON.stringify(pb.map((v) => +v.toFixed(2)))}`);
console.log(`  minBlinkOverride ${cur.minBlinkOverride}`);
console.log(`  dotDashBoundary  ${cur.dotDashBoundary}`);
const weakest = pb.length ? Math.min(...pb) : null;
if (weakest !== null) {
  console.log(`\n  가장 약한 깜빡임 ${weakest.toFixed(2)} — 감도별 실제 임계값과 비교하면`);
  for (const [name, m] of [['완전민감', 0.45], ['민감', 0.60], ['보통', 0.78], ['둔감', 0.95], ['완전둔감', 1.10]]) {
    const th = Math.min(Math.max(cur.enterTh * m, 0.10), 0.55);
    console.log(`    ${name.padEnd(5)} ×${m}  →  ${th.toFixed(2)}  ${weakest > th ? '통과' : '❌ 미달'}`);
  }
}

if (has('--restore')) {
  const from = JSON.parse(readFileSync(flag('--restore'), 'utf8'));
  console.log(`\n되돌리기: ${flag('--restore')}`);
  if (!APPLY) { console.log('미리보기입니다. 실제로 되돌리려면 --apply'); process.exit(0); }
  await updateDoc(ref, from);
  console.log('되돌렸습니다.');
  process.exit(0);
}

const patch = {};
const mb = flag('--minblink');
if (mb) patch.minBlinkOverride = Number(mb);
const et = flag('--enterth');
if (et) patch.enterTh = Number(et);

// 학습 버퍼를 지금 실력에 맞춰 다시 깐다.
// 안 하면 다음 깜빡임 한 번에 recordBlink() 가 옛 평균으로 되돌려 놓는다
//   enterTh = clamp(mean(peakBuffer) × 0.70, 0.20 … 0.55)
if (has('--reset-peaks')) {
  if (!pb.length) { console.error('peakBuffer 가 비어 있어 다시 깔 수 없습니다'); process.exit(1); }
  const seed = Array(5).fill(+weakest.toFixed(4));
  patch.peakBuffer = seed;
  patch.enterTh = Math.min(Math.max(weakest * 0.70, 0.20), 0.55);
}
// loadRemote() 는 updatedAt 이 기기 값보다 커야 받아준다 (CFAbsoluteTime)
if (patch.enterTh !== undefined || patch.peakBuffer !== undefined) {
  patch.updatedAt = (cur.updatedAt || 0) + 60;
}

if (!Object.keys(patch).length) { console.log('\n바꿀 값을 주지 않았습니다 — 조회만 했습니다.'); process.exit(0); }
console.log(`\n■ 바꿀 것\n${JSON.stringify(patch, null, 2)}`);
if (patch.enterTh !== undefined || patch.peakBuffer !== undefined) {
  console.log('\n⚠️ enterTh·peakBuffer 는 **앱을 껐다 켜야** 반영됩니다.');
}
if (!APPLY) { console.log('\n미리보기입니다. 실제로 쓰려면 --apply'); process.exit(0); }
await updateDoc(ref, patch);
console.log(`\n적용했습니다. 되돌리려면:\n  node adjust-blink-profile.mjs ${code} --restore ${backup} --apply`);
process.exit(0);
