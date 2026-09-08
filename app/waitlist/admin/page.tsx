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
  patientName?: string;
  diagnosis?: string;
  relationship?: string;
  region?: string;
  commMethod?: string;
  movements?: string[];
  preferredDate?: string;
  referralSource?: string;
  referralDetail?: string;
  note?: string;
  contacted?: boolean;
  createdAt?: Timestamp;
};

const fmtDate = (ts?: Timestamp) => {
  if (!ts) return '—';
  return ts.toDate().toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const MOVEMENT_LABELS: Record<string, string> = {
  finger: '손가락', blink: '눈 깜빡임', eyebrow: '눈썹', mouth: '입 벌림', blow: '바람 불기',
};

function fmtMonday(iso: string) {
  const [, m, day] = iso.split('-').map(Number);
  return `${m}월 ${day}일 (월)`;
}

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
        <div style={{ flex: 1, minWidth: 180 }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: '#1C1C1E' }}>
            {e.patientName || '(환우명 없음)'}
            {e.diagnosis && <span style={{ fontSize: 12, fontWeight: 400, color: '#8E8E93' }}> · {e.diagnosis}</span>}
          </div>
          <div style={{ fontSize: 13, color: '#8E8E93' }}>
            신청인 {e.name}{e.relationship ? `(${e.relationship})` : ''} · {e.phone} · {e.region ?? ''} · {fmtDate(e.createdAt)}
          </div>
          {/* 유입 경로 — 수집만 하고 여기 안 보이면 아무도 못 본다.
              「기타」면 직접 적은 내용을 괄호로 붙인다 */}
          {e.referralSource && (
            <div style={{ fontSize: 12, color: '#8E5A00', marginTop: 4 }}>
              알게 된 경로: {e.referralSource}
              {e.referralDetail ? ` (${e.referralDetail})` : ''}
            </div>
          )}
          {(e.commMethod || (e.movements && e.movements.length > 0)) && (
            <div style={{ fontSize: 12, color: '#3255A8', marginTop: 4 }}>
              {e.commMethod && <span>소통방법: {e.commMethod}</span>}
              {e.movements && e.movements.length > 0 && (
                <span>{e.commMethod ? ' · ' : ''}가능한 움직임: {e.movements.map(k => MOVEMENT_LABELS[k] ?? k).join(', ')}</span>
              )}
            </div>
          )}
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
          ) : (() => {
            // 안내 순번은 날짜별 배치(2주 간격 월요일)마다 따로 매겨야 실제 안내 순서와 맞으므로,
            // preferredDate로 묶어서 그룹별로 보여준다. 날짜를 아직 안 고른 옛 신청은 맨 뒤로.
            const groups = waiting.reduce<Record<string, Entry[]>>((acc, e) => {
              const key = e.preferredDate || '미지정';
              (acc[key] ??= []).push(e);
              return acc;
            }, {});
            const dateKeys = Object.keys(groups).sort((a, b) => a === '미지정' ? 1 : b === '미지정' ? -1 : a.localeCompare(b));
            return dateKeys.map((key) => (
              <div key={key} style={{ marginBottom: 20 }}>
                <div style={{ background: '#1C1C1E', borderRadius: 10, padding: '8px 14px', marginBottom: 8 }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: '#fff', margin: 0 }}>
                    {key === '미지정' ? '날짜 미지정' : fmtMonday(key)} · {groups[key].length}명
                  </p>
                </div>
                {groups[key].map((e, i) => renderEntry(e, i + 1))}
              </div>
            ));
          })()}
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
