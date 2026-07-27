// 아산나눔재단 증빙자료 아카이빙 — 이메일 매직링크 인증
import {
  sendSignInLinkToEmail, isSignInWithEmailLink, signInWithEmailLink, signOut,
} from 'firebase/auth';
import { auth } from './firebase';

const STORAGE_KEY = 'receiptsLoginEmail';

function loginUrl() {
  return `${window.location.origin}/receipts/asannanumfoundation/login/finish`;
}

export async function sendLoginLink(email: string): Promise<void> {
  await sendSignInLinkToEmail(auth, email, {
    url: loginUrl(),
    handleCodeInApp: true,
  });
  window.localStorage.setItem(STORAGE_KEY, email);
}

export async function completeLoginFromLink(): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!isSignInWithEmailLink(auth, window.location.href)) {
    return { ok: false, error: 'invalid-link' };
  }
  let email = window.localStorage.getItem(STORAGE_KEY);
  if (!email) {
    email = window.prompt('로그인에 사용한 이메일 주소를 다시 입력해주세요');
  }
  if (!email) return { ok: false, error: 'no-email' };
  try {
    await signInWithEmailLink(auth, email, window.location.href);
    window.localStorage.removeItem(STORAGE_KEY);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'unknown' };
  }
}

export async function logout(): Promise<void> {
  await signOut(auth);
}
