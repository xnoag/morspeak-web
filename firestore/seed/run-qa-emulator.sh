#!/usr/bin/env bash
# QA 용 에뮬레이터를 띄우고 테스트 계정을 심은 뒤 **계속 떠 있게** 한다.
#
# emulators:exec 는 스크립트가 끝나면 에뮬레이터를 내려서 QA 중에 쓸 수 없다.
# 그래서 start 로 띄우고, 준비되면 시드를 한 번 돌린다.
#
#   firestore  8080   auth  9099   UI  4000
#   iOS 시뮬레이터는 127.0.0.1 로, 안드로이드 에뮬레이터는 10.0.2.2 로 붙는다.
#
# 끄려면 이 스크립트를 ⌃C 하거나 pkill -f "firebase emulators".
set -uo pipefail
cd "$(dirname "$0")/../.."

export PATH="/opt/homebrew/opt/openjdk/bin:$PATH"

echo "에뮬레이터 시작…"
firebase emulators:start --only firestore,auth --project morspeak-a5e46 > /tmp/qa-emulator.log 2>&1 &
EMU_PID=$!

# Firestore 가 응답할 때까지 기다린다
for _ in $(seq 1 60); do
  if curl -s -o /dev/null "http://127.0.0.1:8080/" 2>/dev/null; then break; fi
  sleep 1
done

if ! curl -s -o /dev/null "http://127.0.0.1:8080/" 2>/dev/null; then
  echo "❌ 에뮬레이터가 뜨지 않았다. /tmp/qa-emulator.log 확인"
  kill $EMU_PID 2>/dev/null
  exit 1
fi

echo "테스트 계정 심는 중…"
FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 \
FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099 \
GCLOUD_PROJECT=morspeak-a5e46 \
  node firestore/seed/seed-emulator.mjs

echo
echo "준비 완료. 에뮬레이터가 떠 있다 (PID $EMU_PID)"
echo "  Firestore 127.0.0.1:8080 / Auth 127.0.0.1:9099 / UI http://127.0.0.1:4000"
echo "  끄려면 ⌃C"
wait $EMU_PID
