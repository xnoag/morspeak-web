'use client';
import { useEffect, useState } from 'react';
import { collection, deleteDoc, doc, onSnapshot, updateDoc, Timestamp } from 'firebase/firestore';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { db } from '@/lib/firebase';

const F = "-apple-system,'SF Pro Display',BlinkMacSystemFont,'Helvetica Neue',sans-serif";
const PW = '3578';

type Entry = {
  id: string;
  name: string;
  phone: string;
  note?: string;
  contacted?: boolean;
  createdAt?: Timestamp;
};

const fmtDate = (ts?: Timestamp) => {
  if (!ts) return '—';
  return ts.toDate().toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });
};

export default function WaitlistAdminPage() {
  const [pw, setPw] = useState('');
  const [authed, setAuthed] = useState(false);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [memoDrafts, setMemoDrafts] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!authed) return;
    signInAnonymously(getAuth()).catch(() => {});
    return onSnapshot(collection(db, 'waitlist'), snap => {
      const rows = snap.docs
        .map(d => ({ id: d.id, ...d.data() } as Entry))
        .sort((a, b) => (a.createdAt?.seconds ?? 0) - (b.createdAt?.seconds ?? 0));
      setEntries(rows);
    });
  }, [authed]);

  const toggleContacted = async (e: Entry) => {
    await updateDoc(doc(db, 'waitlist', e.id), { contacted: !e.contacted });
  };

  const saveNote = async (id: string) => {
    const note = (memoDrafts[id] ?? '').trim();
    await updateDoc(doc(db, 'waitlist', id), { note });
  };

  const remove = async (id: string) => {
    if (!confirm('이 신청을 삭제할까요?')) return;
    await deleteDoc(doc(db, 'waitlist', id));
  };

  if (!authed) return (
    <div style={{ minHeight: '100svh', background: '#F5F5F7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: F }}>
      <div style={{ background: '#fff', borderRadius: 16, padding: '32px 28px', width: 300, boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>
        <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>🔒 웨이팅 리스트 관리</div>
        <input type="password" value={pw} onChange={e => setPw(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && pw === PW && setAuthed(true)}
          placeholder="비밀번호" autoFocus
          style={{ width: '100%', padding: '12px 14px', border: '1.5px solid #E5E5EA', borderRadius: 10, fontSize: 15, fontFamily: F, outline: 'none', boxSizing: 'border-box', marginBottom: 12 }} />
        <button onClick={() => pw === PW && setAuthed(true)}
          style={{ width: '100%', padding: '12px', borderRadius: 10, border: 'none', background: '#1C1C1E', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: F }}>
          확인
        </button>
      </div>
    </div>
  );

  const waiting = entries.filter(e => !e.contacted);
  const contacted = entries.filter(e => e.contacted);

  const renderEntry = (e: Entry, position?: number) => (
    <div key={e.id} style={{ background: '#fff', borderRadius: 14, padding: '14px 16px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', marginBottom: 8, opacity: e.contacted ? 0.6 : 1 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12, marginBottom: 10 }}>
        {position != null && (
          <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#1C1C1E', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, flexShrink: 0 }}>{position}</div>
        )}
        <div style={{ flex: 1, minWidth: 140 }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: '#1C1C1E' }}>{e.name}</div>
          <div style={{ fontSize: 13, color: '#8E8E93' }}>{e.phone} · {fmtDate(e.createdAt)}</div>
        </div>
        <button onClick={() => toggleContacted(e)}
          style={{ padding: '8px 12px', borderRadius: 8, border: 'none', background: e.contacted ? '#E5E5EA' : '#EAF6EC', color: e.contacted ? '#6E6E73' : '#1A8C3A', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: F }}>
          {e.contacted ? '연락완료 ✓' : '연락함으로 표시'}
        </button>
        <button onClick={() => remove(e.id)}
          style={{ padding: '8px 12px', borderRadius: 8, border: 'none', background: '#FDEBEC', color: '#D92D20', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: F }}>
          삭제
        </button>
      </div>
      <textarea
        value={memoDrafts[e.id] ?? e.note ?? ''}
        onChange={ev => setMemoDrafts(p => ({ ...p, [e.id]: ev.target.value }))}
        onBlur={() => saveNote(e.id)}
        placeholder="메모 (문의 내용, 연락 결과 등)"
        rows={2}
        style={{ width: '100%', padding: '8px 10px', border: '1.5px solid #E5E5EA', borderRadius: 8, fontSize: 13, fontFamily: F, outline: 'none', resize: 'vertical', boxSizing: 'border-box', color: '#1C1C1E' }}
      />
    </div>
  );

  return (
    <div style={{ minHeight: '100svh', background: '#F5F5F7', fontFamily: F, padding: '24px 16px 60px' }}>
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: '#1C1C1E', marginBottom: 4 }}>웨이팅 리스트</h1>
        <p style={{ fontSize: 14, color: '#8E8E93', marginBottom: 20 }}>대기 중 {waiting.length}명 · 연락완료 {contacted.length}명</p>

        <div style={{ marginBottom: 24 }}>
          {waiting.length === 0 ? (
            <div style={{ background: '#fff', borderRadius: 16, padding: 32, textAlign: 'center', color: '#AEAEB2', fontSize: 15 }}>
              대기 중인 신청이 없습니다.
            </div>
          ) : waiting.map((e, i) => renderEntry(e, i + 1))}
        </div>

        {contacted.length > 0 && (
          <>
            <p style={{ fontSize: 13, fontWeight: 600, color: '#8E8E93', marginBottom: 8 }}>연락완료</p>
            {contacted.map(e => renderEntry(e))}
          </>
        )}
      </div>
    </div>
  );
}
