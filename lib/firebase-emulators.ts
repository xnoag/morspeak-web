import type { FirebaseApp } from 'firebase/app';
import { connectAuthEmulator, getAuth } from 'firebase/auth';
import { connectFirestoreEmulator, getFirestore } from 'firebase/firestore';

const connected = new WeakSet<FirebaseApp>();

// 운영 빌드에서는 비활성. 합성 QA가 실제 저장소·환자 기기에 닿지 않게 한다.
export function connectLocalEmulators(app: FirebaseApp) {
  if (process.env.NODE_ENV !== 'development' || process.env.NEXT_PUBLIC_FIREBASE_EMULATORS !== '1' || connected.has(app)) return;
  if (!app.options.projectId?.startsWith('demo-')) throw new Error('로컬 QA는 demo- 프로젝트만 허용합니다.');
  connectAuthEmulator(getAuth(app), 'http://127.0.0.1:19099', { disableWarnings: true });
  connectFirestoreEmulator(getFirestore(app), '127.0.0.1', 18080);
  connected.add(app);
}
