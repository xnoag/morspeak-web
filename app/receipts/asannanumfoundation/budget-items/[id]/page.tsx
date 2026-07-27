'use client';
import { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useReceiptSession } from '@/lib/useReceiptSession';
import { watchBudgetItems, watchEvidenceFiles, uploadEvidenceFile, deleteEvidenceFile, type BudgetItemDoc, type EvidenceFileDoc } from '@/lib/receipts';
import { getRequiredDocs, computeItemStatus, needsReclassifyNote, EVIDENCE_DOC_TYPES } from '@/lib/receiptRules';

const F = "-apple-system,'SF Pro Display',BlinkMacSystemFont,'Helvetica Neue',sans-serif";

type PayLine = { label: string; amount: string };

function PayslipGenerator({ orgId, itemId, orgName, defaultTotal, uploadedBy }: {
  orgId: string; itemId: string; orgName: string; defaultTotal: number; uploadedBy: string;
}) {
  const previewRef = useRef<HTMLDivElement>(null);
  const [name, setName] = useState('');
  const [title, setTitle] = useState('사업책임자');
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');
  const [payDate, setPayDate] = useState('');
  const [pays, setPays] = useState<PayLine[]>([{ label: '기본급', amount: String(defaultTotal || '') }]);
  const [deductions, setDeductions] = useState<PayLine[]>([]);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);

  const num = (s: string) => Number(s.replace(/[^0-9]/g, '')) || 0;
  const payTotal = pays.reduce((s, p) => s + num(p.amount), 0);
  const deductionTotal = deductions.reduce((s, p) => s + num(p.amount), 0);
  const netPay = payTotal - deductionTotal;

  const updateLine = (list: PayLine[], set: (v: PayLine[]) => void, i: number, patch: Partial<PayLine>) => {
    set(list.map((l, idx) => idx === i ? { ...l, ...patch } : l));
  };

  const generate = async () => {
    if (!previewRef.current || !name.trim()) return;
    setBusy(true);
    try {
      const { toBlob } = await import('html-to-image');
      const blob = await toBlob(previewRef.current, { pixelRatio: 2, backgroundColor: '#ffffff' });
      if (!blob) return;
      const file = new File([blob], `급여명세서_${name.trim()}_${payDate || periodEnd || ''}.png`, { type: 'image/png' });
      await uploadEvidenceFile(orgId, itemId, file, 'payslip', uploadedBy, `${name.trim()} 급여명세서 자동생성`);
      setOpen(false);
    } finally {
      setBusy(false);
    }
  };

  if (!open) {
    return (
      <button onClick={() => setOpen(true)}
        style={{ padding: '9px 16px', borderRadius: 9, border: '1.5px solid #1C1C1E', background: '#fff', color: '#1C1C1E', fontSize: 13, fontWeight: 600, cursor: 'pointer', marginBottom: 16 }}>
        📄 급여명세서 생성
      </button>
    );
  }

  return (
    <div style={{ background: '#fff', borderRadius: 14, padding: 20, marginBottom: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#1C1C1E' }}>급여명세서 생성</div>
        <button onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', color: '#8E8E93', fontSize: 12, cursor: 'pointer' }}>닫기</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        {/* 입력 폼 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <label style={lbl}>담당자 성명<input value={name} onChange={e => setName(e.target.value)} style={inp} /></label>
            <label style={lbl}>직위<input value={title} onChange={e => setTitle(e.target.value)} style={inp} /></label>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
            <label style={lbl}>사업기간 시작<input type="date" value={periodStart} onChange={e => setPeriodStart(e.target.value)} style={inp} /></label>
            <label style={lbl}>사업기간 종료<input type="date" value={periodEnd} onChange={e => setPeriodEnd(e.target.value)} style={inp} /></label>
            <label style={lbl}>지급일<input type="date" value={payDate} onChange={e => setPayDate(e.target.value)} style={inp} /></label>
          </div>

          <div style={{ fontSize: 12, color: '#8E8E93', marginTop: 6 }}>지급 내역</div>
          {pays.map((p, i) => (
            <div key={i} style={{ display: 'flex', gap: 8 }}>
              <input value={p.label} onChange={e => updateLine(pays, setPays, i, { label: e.target.value })} placeholder="항목명" style={{ ...inp, flex: 1 }} />
              <input value={p.amount} onChange={e => updateLine(pays, setPays, i, { amount: e.target.value })} placeholder="금액" style={{ ...inp, width: 120 }} />
              <button onClick={() => setPays(pays.filter((_, idx) => idx !== i))} style={{ background: 'none', border: 'none', color: '#CC2200', cursor: 'pointer' }}>✕</button>
            </div>
          ))}
          <button onClick={() => setPays([...pays, { label: '', amount: '' }])} style={{ ...miniBtn, alignSelf: 'flex-start' }}>+ 지급 항목</button>

          <div style={{ fontSize: 12, color: '#8E8E93', marginTop: 6 }}>공제 내역 (선택)</div>
          {deductions.map((p, i) => (
            <div key={i} style={{ display: 'flex', gap: 8 }}>
              <input value={p.label} onChange={e => updateLine(deductions, setDeductions, i, { label: e.target.value })} placeholder="항목명 (예: 소득세)" style={{ ...inp, flex: 1 }} />
              <input value={p.amount} onChange={e => updateLine(deductions, setDeductions, i, { amount: e.target.value })} placeholder="금액" style={{ ...inp, width: 120 }} />
              <button onClick={() => setDeductions(deductions.filter((_, idx) => idx !== i))} style={{ background: 'none', border: 'none', color: '#CC2200', cursor: 'pointer' }}>✕</button>
            </div>
          ))}
          <button onClick={() => setDeductions([...deductions, { label: '', amount: '' }])} style={{ ...miniBtn, alignSelf: 'flex-start' }}>+ 공제 항목</button>

          <button onClick={generate} disabled={busy || !name.trim()}
            style={{ marginTop: 10, padding: '10px 0', borderRadius: 9, border: 'none', background: '#1C1C1E', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', opacity: busy || !name.trim() ? 0.6 : 1 }}>
            {busy ? '생성 중…' : '생성해서 증빙파일로 첨부'}
          </button>
        </div>

        {/* 미리보기 */}
        <div>
          <div ref={previewRef} style={{ background: '#fff', border: '1px solid #E5E5EA', padding: 28, fontFamily: F }}>
            <div style={{ textAlign: 'center', fontSize: 18, fontWeight: 700, color: '#1C1C1E', marginBottom: 20 }}>급 여 명 세 서</div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, marginBottom: 16 }}>
              <tbody>
                <tr><td style={pslabel}>소속</td><td style={psval}>{orgName}</td><td style={pslabel}>성명</td><td style={psval}>{name || '-'}</td></tr>
                <tr><td style={pslabel}>직위</td><td style={psval}>{title || '-'}</td><td style={pslabel}>지급일</td><td style={psval}>{payDate || '-'}</td></tr>
                <tr><td style={pslabel}>사업기간</td><td style={psval} colSpan={3}>{periodStart || '-'} ~ {periodEnd || '-'}</td></tr>
              </tbody>
            </table>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr><th style={psth}>지급 항목</th><th style={psth}>금액</th><th style={psth}>공제 항목</th><th style={psth}>금액</th></tr>
              </thead>
              <tbody>
                {Array.from({ length: Math.max(pays.length, deductions.length, 1) }).map((_, i) => (
                  <tr key={i}>
                    <td style={psval}>{pays[i]?.label || ''}</td>
                    <td style={{ ...psval, textAlign: 'right' }}>{pays[i] ? num(pays[i].amount).toLocaleString() : ''}</td>
                    <td style={psval}>{deductions[i]?.label || ''}</td>
                    <td style={{ ...psval, textAlign: 'right' }}>{deductions[i] ? num(deductions[i].amount).toLocaleString() : ''}</td>
                  </tr>
                ))}
                <tr><td style={{ ...psval, fontWeight: 700 }}>지급 합계</td><td style={{ ...psval, textAlign: 'right', fontWeight: 700 }}>{payTotal.toLocaleString()}</td>
                    <td style={{ ...psval, fontWeight: 700 }}>공제 합계</td><td style={{ ...psval, textAlign: 'right', fontWeight: 700 }}>{deductionTotal.toLocaleString()}</td></tr>
              </tbody>
            </table>
            <div style={{ marginTop: 16, textAlign: 'right', fontSize: 15, fontWeight: 800, color: '#1C1C1E' }}>
              실지급액 {netPay.toLocaleString()}원
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const lbl: React.CSSProperties = { fontSize: 12, color: '#8E8E93', display: 'block' };
const inp: React.CSSProperties = { display: 'block', width: '100%', marginTop: 4, padding: '8px 10px', borderRadius: 8, border: '1.5px solid #E5E5EA', fontSize: 13, fontFamily: F, boxSizing: 'border-box' };
const pslabel: React.CSSProperties = { border: '1px solid #E5E5EA', padding: '7px 10px', background: '#F7F7F8', color: '#8E8E93', width: '15%' };
const psval: React.CSSProperties = { border: '1px solid #E5E5EA', padding: '7px 10px', color: '#1C1C1E' };
const psth: React.CSSProperties = { border: '1px solid #E5E5EA', padding: '7px 10px', background: '#F7F7F8', color: '#8E8E93', fontWeight: 600, fontSize: 12 };
const miniBtn: React.CSSProperties = { padding: '5px 10px', borderRadius: 7, border: '1px solid #E5E5EA', background: '#fff', color: '#1C1C1E', fontSize: 12, cursor: 'pointer' };

function UploadForm({ orgId, itemId, uploadedBy }: { orgId: string; itemId: string; uploadedBy: string }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [docType, setDocType] = useState(EVIDENCE_DOC_TYPES[0].key);
  const [memo, setMemo] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file) return;
    setBusy(true);
    await uploadEvidenceFile(orgId, itemId, file, docType, uploadedBy, memo.trim());
    setMemo('');
    if (fileRef.current) fileRef.current.value = '';
    setBusy(false);
  };

  return (
    <form onSubmit={submit} style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', background: '#F7F7F8', borderRadius: 10, padding: 12 }}>
      <select value={docType} onChange={e => setDocType(e.target.value)} style={{ padding: '7px 10px', borderRadius: 8, border: '1.5px solid #E5E5EA', fontSize: 13, fontFamily: F }}>
        {EVIDENCE_DOC_TYPES.map(d => <option key={d.key} value={d.key}>{d.label}</option>)}
      </select>
      <input ref={fileRef} type="file" accept="image/*,.pdf" style={{ fontSize: 13 }} />
      <input value={memo} onChange={e => setMemo(e.target.value)} placeholder="메모(개인카드/현금 사유 등)" style={{ flex: 1, minWidth: 160, padding: '7px 10px', borderRadius: 8, border: '1.5px solid #E5E5EA', fontSize: 13, fontFamily: F }} />
      <button type="submit" disabled={busy} style={{ padding: '8px 14px', borderRadius: 8, border: 'none', background: '#1C1C1E', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
        {busy ? '업로드 중…' : '첨부'}
      </button>
    </form>
  );
}

export default function BudgetItemDetailPage() {
  const params = useParams<{ id: string }>();
  const { org, user } = useReceiptSession();
  const [item, setItem] = useState<BudgetItemDoc | null | undefined>(undefined);
  const [files, setFiles] = useState<EvidenceFileDoc[]>([]);

  useEffect(() => {
    if (!org) return;
    return watchBudgetItems(org.id, all => setItem(all.find(i => i.id === params.id) ?? null));
  }, [org, params.id]);

  useEffect(() => {
    if (!org) return;
    return watchEvidenceFiles(org.id, params.id, setFiles);
  }, [org, params.id]);

  if (!org || item === undefined) return <div style={{ padding: 40, fontFamily: F, color: '#8E8E93', fontSize: 13 }}>불러오는 중…</div>;
  if (item === null) return <div style={{ padding: 40, fontFamily: F, color: '#8E8E93', fontSize: 13 }}>세목을 찾을 수 없습니다.</div>;

  const required = getRequiredDocs(item);
  const attachedKeys = files.map(f => f.docType);
  const status = computeItemStatus(item, attachedKeys);
  const reclassifyNote = needsReclassifyNote(item);

  return (
    <div style={{ minHeight: '100vh', background: '#F7F7F8', fontFamily: F, padding: '32px 24px' }}>
      <div style={{ maxWidth: 800, margin: '0 auto' }}>
        <Link href="/receipts/asannanumfoundation/budget-items" style={{ fontSize: 13, color: '#8E8E93', textDecoration: 'none' }}>← 예산 세목 목록</Link>

        <div style={{ background: '#fff', borderRadius: 14, padding: 20, marginTop: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: 12, color: '#8E8E93' }}>{item.항} · {item.목}</div>
              <h1 style={{ fontSize: 18, fontWeight: 700, color: '#1C1C1E', margin: '4px 0' }}>{item.세목}</h1>
              <div style={{ fontSize: 14, color: '#1C1C1E' }}>{item.금액.toLocaleString()}원</div>
            </div>
            <span style={{ padding: '4px 10px', borderRadius: 8, fontSize: 12, fontWeight: 700,
              background: status.status === '완료' ? '#D4F5DF' : status.status === '부분완료' ? '#FFF9D4' : '#FFE0DE',
              color: status.status === '완료' ? '#1A8C3A' : status.status === '부분완료' ? '#B07800' : '#CC2200' }}>
              {status.status}
            </span>
          </div>
          {status.warning && <div style={{ marginTop: 10, fontSize: 12, color: '#CC2200' }}>⚠️ {status.warning}</div>}
          {reclassifyNote && <div style={{ marginTop: 10, fontSize: 12, color: '#B07800' }}>ℹ️ {reclassifyNote}</div>}
        </div>

        <div style={{ background: '#fff', borderRadius: 14, padding: 20, marginTop: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#1C1C1E', marginBottom: 10 }}>필요서류 체크리스트</div>
          {required.length === 0 && <div style={{ fontSize: 13, color: '#8E8E93' }}>필수 서류 규정이 없는 항목입니다.</div>}
          {required.map(d => {
            const done = attachedKeys.includes(d.key);
            return (
              <div key={d.key} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', fontSize: 13 }}>
                <span>{done ? '✅' : '⬜️'}</span>
                <span style={{ color: done ? '#1C1C1E' : '#8E8E93' }}>{d.label}</span>
              </div>
            );
          })}
        </div>

        {item.항 === '인건비' && (
          <div style={{ marginTop: 16 }}>
            <PayslipGenerator orgId={org.id} itemId={item.id} orgName={org.name} defaultTotal={item.금액} uploadedBy={user?.email ?? user?.uid ?? ''} />
          </div>
        )}

        <div style={{ background: '#fff', borderRadius: 14, padding: 20, marginTop: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#1C1C1E', marginBottom: 10 }}>첨부파일</div>
          <UploadForm orgId={org.id} itemId={item.id} uploadedBy={user?.email ?? user?.uid ?? ''} />
          <div style={{ marginTop: 12 }}>
            {files.map(f => (
              <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderTop: '1px solid #F2F2F7', fontSize: 13 }}>
                <a href={f.downloadUrl} target="_blank" rel="noreferrer" style={{ color: '#1A73E8', flex: 1 }}>{f.fileName}</a>
                <span style={{ color: '#8E8E93', fontSize: 12 }}>{EVIDENCE_DOC_TYPES.find(d => d.key === f.docType)?.label ?? f.docType}</span>
                {f.memo && <span style={{ color: '#8E8E93', fontSize: 12 }}>· {f.memo}</span>}
                <button onClick={() => deleteEvidenceFile(org.id, item.id, f)} style={{ background: 'none', border: 'none', color: '#CC2200', fontSize: 12, cursor: 'pointer' }}>삭제</button>
              </div>
            ))}
            {files.length === 0 && <div style={{ fontSize: 13, color: '#8E8E93', padding: '8px 0' }}>첨부된 파일이 없습니다.</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
