// Play 「데이터 보안」 CSV 를 채운다.
//
// ## 왜 CSV 인가
// 설문이 데이터 유형 9개 × 4문항이라 화면에서 클릭으로 하면 오래 걸리고 잘 틀린다.
// Play Console 이 「CSV 파일로 내보내기 / CSV에서 가져오기」를 제공하므로 그쪽이 확실하다.
//
// ## 답의 근거
// morspeak-patient-android/PLAY-DATA-SAFETY.md — 코드에서 뽑은 사실.
//   · 카메라·마이크는 기기 밖으로 안 나간다 → 사진·동영상·오디오 수집 없음
//   · 위치는 Open-Meteo 로 나간다(날씨). 권한을 안 줘도 앱이 도니 선택사항이다
//   · 광고·애널리틱스 SDK 없음 → 광고 목적 없음
//   · 제3자에게 데이터를 넘기지 않는다 → 전부 '수집됨'이고 '공유됨' 아님
//     (Firebase 는 처리자이지 제3자 공유가 아니다)
//
//   node fill-data-safety-csv.mjs <입력csv> <출력csv>
import { readFileSync, writeFileSync } from 'node:fs';

const [, , IN, OUT] = process.argv;
if (!IN || !OUT) { console.error('사용법: node fill-data-safety-csv.mjs <입력> <출력>'); process.exit(1); }

// 유형별: [필수인가, 목적들]
// 필수(REQUIRED) = 사용자가 끌 수 없다 / 선택(OPTIONAL) = 끌 수 있다
const TYPES = {
  PSL_NAME:                   { required: true,  purposes: ['PSL_APP_FUNCTIONALITY'] },
  PSL_USER_ACCOUNT:           { required: true,  purposes: ['PSL_APP_FUNCTIONALITY', 'PSL_ACCOUNT_MANAGEMENT'] },
  PSL_PHONE:                  { required: true,  purposes: ['PSL_APP_FUNCTIONALITY'] },
  PSL_OTHER_PERSONAL:         { required: true,  purposes: ['PSL_APP_FUNCTIONALITY'] },
  // 위치는 날씨 위젯 전용이고 권한을 안 줘도 앱이 돈다 → 선택사항
  PSL_APPROX_LOCATION:        { required: false, purposes: ['PSL_APP_FUNCTIONALITY'] },
  PSL_OTHER_MESSAGES:         { required: true,  purposes: ['PSL_APP_FUNCTIONALITY'] },
  // 사용 통계 — 보호자 대시보드가 본다. 우리 서버에 쌓는 애널리틱스다
  PSL_USER_INTERACTION:       { required: true,  purposes: ['PSL_APP_FUNCTIONALITY', 'PSL_ANALYTICS'] },
  PSL_USER_GENERATED_CONTENT: { required: true,  purposes: ['PSL_APP_FUNCTIONALITY'] },
  // FCM 토큰 — 보호자 알림 전달용
  PSL_DEVICE_ID:              { required: true,  purposes: ['PSL_APP_FUNCTIONALITY'] },
};

const lines = readFileSync(IN, 'utf8').split(/\r?\n/);
let filled = 0;

const out = lines.map((line, idx) => {
  if (idx === 0 || !line.trim()) return line;
  // 앞 4개 필드만 다루면 된다. 5번째(라벨)에 콤마·따옴표가 있어 split 은 제한적으로 쓴다
  const m = line.match(/^([^,]*),([^,]*),([^,]*),([^,]*),(.*)$/);
  if (!m) return line;
  const [, qid, rid, , req, label] = m;

  const t = Object.keys(TYPES).find((k) => qid.includes(`:${k}:`));
  if (!t) return line;
  const cfg = TYPES[t];
  let v = null;

  if (qid.endsWith(':PSL_DATA_USAGE_COLLECTION_AND_SHARING')) {
    // 수집만 한다. 제3자 공유 없음
    v = rid === 'PSL_DATA_USAGE_ONLY_COLLECTED' ? 'true' : 'false';
  } else if (qid.endsWith(':PSL_DATA_USAGE_EPHEMERAL')) {
    // 서버에 남으므로 임시 처리 아님
    v = 'false';
  } else if (qid.endsWith(':DATA_USAGE_USER_CONTROL')) {
    const wantRequired = rid === 'PSL_DATA_USAGE_USER_CONTROL_REQUIRED';
    v = (wantRequired === cfg.required) ? 'true' : 'false';
  } else if (qid.endsWith(':DATA_USAGE_COLLECTION_PURPOSE')) {
    v = cfg.purposes.includes(rid) ? 'true' : 'false';
  }

  if (v === null) return line;
  filled++;
  return `${qid},${rid},${v},${req},${label}`;
});

writeFileSync(OUT, out.join('\n'));
console.log(`${filled}개 답을 채웠다 → ${OUT}`);
