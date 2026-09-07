'use client';

/**
 * 문의 관리 — /contact 기관 문의 + /eng·/jpn 소식 구독.
 *
 * 왜 있나
 *   두 폼이 **아무 데도 보내지 않고 성공 화면만 띄우고 있었다** (2026-09-07 발견).
 *   기관이 문의를 남기면 사라지는데 상대는 접수된 줄 알았다. 폼을 Firestore
 *   `inquiries` 에 쓰도록 고치면서, 볼 곳이 필요해서 만들었다.
 *
 * 규격은 /waitlist/admin 과 같게 맞췄다 — 대표가 이미 쓰는 화면이라 새 어법을
 * 만들지 않는다(비밀번호 게이트 · #F5F5F7 배경 · 흰 카드 · 같은 폰트 스택).
 *
 * ⚠️ 비밀번호 게이트는 **보안이 아니다.** 클라이언트 코드에 그대로 들어 있고
 *    `inquiries` 는 규칙상 누구나 읽을 수 있다(관리자 목록 조회 때문). 담당자명·
 *    전화번호가 들어오므로 Firestore 보안 2단계에서 이 컬렉션을 같이 조여야 한다.
 *    기존 /waitlist/admin 과 같은 수준이라는 뜻일 뿐이다.
 */

import { useEffect, useState } from 'react';
import { collection, deleteDoc, doc, onSnapshot, updateDoc, Timestamp } from 'firebase/firestore';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { db } from '@/lib/firebase';

const F = "-apple-system,'SF Pro Display',BlinkMacSystemFont,'Helvetica Neue',sans-serif";
const PW = '3578';

type Inquiry = {
  id: string;
  kind?: 'contact' | 'newsletter';
  organization?: string;
  name?: string;
  phone?: string;
  email?: string;
  message?: string;
  locale?: string;
  handled?: boolean;
  note?: string;
  createdAt?: Timestamp;
};

const fmtDate = (ts?: Timestamp) => {
  if (!ts) return '—';
  return ts.toDate().toLocaleString('ko-KR', {
    month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });
};

const LOCALE_LABEL: Record<string, string> = { ko: '한국어', en: 'English', ja: '日本語' };

export default function InquiriesAdminPage() {
  const [pw, setPw] = useState('');
  const [authed, setAuthed] = useState(false);
  const [rows, setRows] = useState<Inquiry[]>([]);
  const [memoDrafts, setMemoDrafts] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!authed) return;
    signInAnonymously(getAuth()).catch(() => {});
    return onSnapshot(collection(db, 'inquiries'), (snap) => {
      const list = snap.docs
        .map((d) => ({ id: d.id, ...d.data() } as Inquiry))
        // 최신이 위 — 문의는 온 순서대로 처리하는 게 아니라 새것부터 본다
        .sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0));
      setRows(list);
    });
  }, [authed]);

  const toggleHandled = async (r: Inquiry) => {
    await updateDoc(doc(db, 'inquiries', r.id), { handled: !r.handled });
  };

  const saveNote = async (id: string) => {
    const note = (memoDrafts[id] ?? '').trim();
    await updateDoc(doc(db, 'inquiries', id), { note });
  };

  const remove = async (id: string) => {
    if (!confirm('이 문의를 삭제할까요?')) return;
    await deleteDoc(doc(db, 'inquiries', id));
  };

  if (!authed) return (
    <div style={{ minHeight: '100svh', background: '#F5F5F7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: F }}>
      <div style={{ background: '#fff', borderRadius: 16, padding: '32px 28px', width: 300, boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>
        <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>🔒 문의 관리</div>
        <input
          type="password" value={pw} onChange={(e) => setPw(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && pw === PW && setAuthed(true)}
          placeholder="비밀번호" autoFocus
          style={{ width: '100%', padding: '12px 14px', border: '1.5px solid #E5E5EA', borderRadius: 10, fontSize: 15, fontFamily: F, outline: 'none', boxSizing: 'border-box', marginBottom: 12 }}
        />
        <button
          onClick={() => pw === PW && setAuthed(true)}
          style={{ width: '100%', padding: '12px', borderRadius: 10, border: 'none', background: '#1C1C1E', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: F }}
        >
          확인
        </button>
      </div>
    </div>
  );

  const pending = rows.filter((r) => !r.handled);
  const done = rows.filter((r) => r.handled);

  const renderRow = (r: Inquiry) => (
    <div key={r.id} style={{ background: '#fff', borderRadius: 14, padding: '14px 16px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', marginBottom: 8, opacity: r.handled ? 0.6 : 1 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12, marginBottom: 10 }}>
        <div style={{
          padding: '4px 10px', borderRadius: 999, flexShrink: 0, fontSize: 12, fontWeight: 700,
          background: r.kind === 'newsletter' ? '#EEF2FF' : '#EAF6EC',
          color: r.kind === 'newsletter' ? '#3255A8' : '#1A8C3A',
        }}>
          {r.kind === 'newsletter' ? '소식 구독' : '기관 문의'}
        </div>
        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: '#1C1C1E' }}>
            {r.kind === 'newsletter'
              ? (r.email || '(이메일 없음)')
              : (r.organization || '(기관명 없음)')}
            {r.locale && r.locale !== 'ko' && (
              <span style={{ fontSize: 12, fontWeight: 400, color: '#8E8E93' }}> · {LOCALE_LABEL[r.locale] ?? r.locale}</span>
            )}
          </div>
          <div style={{ fontSize: 13, color: '#8E8E93' }}>
            {[r.name, r.phone, r.kind === 'contact' ? r.email : null, fmtDate(r.createdAt)]
              .filter(Boolean).join(' · ')}
          </div>
        </div>
        <button
          onClick={() => toggleHandled(r)}
          style={{ padding: '8px 12px', borderRadius: 8, border: 'none', background: r.handled ? '#E5E5EA' : '#EAF6EC', color: r.handled ? '#6E6E73' : '#1A8C3A', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: F }}
        >
          {r.handled ? '처리완료 ✓' : '처리함으로 표시'}
        </button>
        <button
          onClick={() => remove(r.id)}
          style={{ padding: '8px 12px', borderRadius: 8, border: 'none', background: '#FDEBEC', color: '#D92D20', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: F }}
        >
          삭제
        </button>
      </div>
      {r.message && (
        <p style={{ fontSize: 14, color: '#1C1C1E', whiteSpace: 'pre-wrap', margin: '0 0 10px', lineHeight: 1.6 }}>
          {r.message}
        </p>
      )}
      <textarea
        value={memoDrafts[r.id] ?? r.note ?? ''}
        onChange={(ev) => setMemoDrafts((p) => ({ ...p, [r.id]: ev.target.value }))}
        onBlur={() => saveNote(r.id)}
        placeholder="메모 (연락 결과 등)"
        rows={2}
        style={{ width: '100%', padding: '8px 10px', border: '1.5px solid #E5E5EA', borderRadius: 8, fontSize: 13, fontFamily: F, outline: 'none', resize: 'vertical', boxSizing: 'border-box', color: '#1C1C1E' }}
      />
    </div>
  );

  return (
    <div style={{ minHeight: '100svh', background: '#F5F5F7', fontFamily: F, padding: '24px 16px 60px' }}>
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: '#1C1C1E', marginBottom: 4 }}>문의 관리</h1>
        <p style={{ fontSize: 14, color: '#8E8E93', marginBottom: 20 }}>
          미처리 {pending.length}건 · 처리완료 {done.length}건
        </p>

        <div style={{ marginBottom: 24 }}>
          {pending.length === 0 ? (
            <div style={{ background: '#fff', borderRadius: 16, padding: 32, textAlign: 'center', color: '#AEAEB2', fontSize: 15 }}>
              미처리 문의가 없습니다.
            </div>
          ) : pending.map(renderRow)}
        </div>

        {done.length > 0 && (
          <>
            <p style={{ fontSize: 13, fontWeight: 600, color: '#8E8E93', marginBottom: 8 }}>처리완료</p>
            {done.map(renderRow)}
          </>
        )}
      </div>
    </div>
  );
}
