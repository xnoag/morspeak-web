// 비밀번호 해시 — Swift 쪽(Morspeak/6. Utils/PasswordHash.swift)과 파라미터가
// 정확히 일치해야 한다. 하나만 달라도 로그인이 전부 실패한다.
//
//   PBKDF2-HMAC-SHA256 / iterations 200_000 / keyLength 32 / salt 16바이트
//   salt·hash 는 base64 문자열로 저장
//
// ⚠️ 4자리 비밀번호는 조합이 1만 개뿐이라 해시값을 손에 넣으면 단시간에 원문이 나온다.
//    해시화는 "평문 그대로 노출" 을 막는 것이지 짧은 비밀번호를 안전하게 만들지 않는다.

import { pbkdf2Sync, randomBytes, timingSafeEqual } from 'node:crypto';

export const ITERATIONS = 200_000;
export const KEY_LENGTH = 32;
export const SALT_LENGTH = 16;
export const DIGEST = 'sha256';

export function derive(password, saltBuf) {
  return pbkdf2Sync(Buffer.from(password, 'utf8'), saltBuf, ITERATIONS, KEY_LENGTH, DIGEST);
}

/** 저장용 { salt, hash } (둘 다 base64) */
export function make(password) {
  const salt = randomBytes(SALT_LENGTH);
  return {
    salt: salt.toString('base64'),
    hash: derive(password, salt).toString('base64'),
  };
}

export function verify(password, saltBase64, hashBase64) {
  const salt = Buffer.from(saltBase64, 'base64');
  const expected = Buffer.from(hashBase64, 'base64');
  const actual = derive(password, salt);
  if (actual.length !== expected.length) return false;
  return timingSafeEqual(actual, expected);
}

/**
 * 운영자가 보호자에게 전화·메일로 읽어줄 임시 비밀번호를 만든다.
 * 숫자 6자리 — 0/O, 1/l 처럼 헷갈리는 문자가 없고 전화로 읽어주기 쉽다.
 * (현재 앱의 최소 길이는 4자리지만 임시 비밀번호는 6자리로 준다)
 */
export function makeTempPassword() {
  const n = randomBytes(4).readUInt32BE(0) % 1_000_000;
  return String(n).padStart(6, '0');
}
