'use client';
import { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useReceiptSession } from '@/lib/useReceiptSession';
import { watchBudgetItems, watchEvidenceFiles, uploadEvidenceFile, deleteEvidenceFile, updateBudgetItem, type BudgetItemDoc, type EvidenceFileDoc } from '@/lib/receipts';
import { getRequiredDocs, computeItemStatus, needsReclassifyNote, EVIDENCE_DOC_TYPES, type RequiredDoc } from '@/lib/receiptRules';

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

function isImageFile(name: string) {
  return /\.(png|jpe?g|gif|webp|heic)$/i.test(name);
}

function FileThumb({ file, onDelete }: { file: EvidenceFileDoc; onDelete: () => void }) {
  const isImg = isImageFile(file.fileName);
  return (
    <a href={file.downloadUrl} target="_blank" rel="noreferrer" title={file.fileName}
      style={{ position: 'relative', display: 'block', width: 84, height: 84, borderRadius: 8, overflow: 'hidden', border: '1px solid #E5E5EA', background: '#F7F7F8', flexShrink: 0 }}>
      {isImg ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={file.downloadUrl} alt={file.fileName} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
      ) : (
        <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4, padding: 4, boxSizing: 'border-box' }}>
          <span style={{ fontSize: 22 }}>📄</span>
          <span style={{ fontSize: 9, color: '#8E8E93', textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%' }}>{file.fileName}</span>
        </div>
      )}
      <button onClick={e => { e.preventDefault(); e.stopPropagation(); onDelete(); }}
        style={{ position: 'absolute', top: 3, right: 3, width: 18, height: 18, borderRadius: 9, border: 'none', background: 'rgba(0,0,0,0.55)', color: '#fff', fontSize: 11, lineHeight: '18px', cursor: 'pointer', padding: 0 }}>
        ×
      </button>
    </a>
  );
}

function ChecklistRow({ orgId, itemId, doc, files, uploadedBy, onDelete }: {
  orgId: string; itemId: string; doc: RequiredDoc; files: EvidenceFileDoc[]; uploadedBy: string; onDelete: (f: EvidenceFileDoc) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const attached = files.filter(f => f.docType === doc.key);
  const done = attached.length > 0;

  const onPick = async (file: File) => {
    setBusy(true);
    await uploadEvidenceFile(orgId, itemId, file, doc.key, uploadedBy);
    if (fileRef.current) fileRef.current.value = '';
    setBusy(false);
  };

  return (
    <div style={{ padding: '10px 0', borderTop: '1px solid #F2F2F7' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span>{done ? '✅' : '⬜️'}</span>
        <span style={{ flex: 1, fontSize: 13, color: done ? '#1C1C1E' : '#8E8E93' }}>{doc.label}</span>
        <input ref={fileRef} type="file" accept="image/*,.pdf" style={{ display: 'none' }}
          onChange={e => { const f = e.target.files?.[0]; if (f) onPick(f); }} />
        <button onClick={() => fileRef.current?.click()} disabled={busy}
          style={{ padding: '5px 12px', borderRadius: 7, border: '1px solid #E5E5EA', background: '#fff', color: '#1C1C1E', fontSize: 12, cursor: busy ? 'not-allowed' : 'pointer' }}>
          {busy ? '업로드 중…' : attached.length > 0 ? '+ 추가 첨부' : '+ 파일 첨부'}
        </button>
      </div>
      {attached.length > 0 && (
        <div style={{ marginTop: 8, marginLeft: 24, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {attached.map(f => (
            <FileThumb key={f.id} file={f} onDelete={() => onDelete(f)} />
          ))}
        </div>
      )}
    </div>
  );
}

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
  const requiredKeys = new Set(required.map(d => d.key));
  const attachedKeys = files.map(f => f.docType);
  const otherFiles = files.filter(f => !requiredKeys.has(f.docType));
  const status = computeItemStatus(item, attachedKeys);
  const reclassifyNote = needsReclassifyNote(item);

  return (
    <div style={{ minHeight: '100vh', background: '#F7F7F8', fontFamily: F, padding: '32px 24px' }}>
      <div style={{ maxWidth: 800, margin: '0 auto' }}>
        <Link href="/receipts/asannanumfoundation" style={{ fontSize: 13, color: '#8E8E93', textDecoration: 'none' }}>← 메인으로</Link>

        <div style={{ background: '#fff', borderRadius: 14, padding: 20, marginTop: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: 12, color: '#8E8E93' }}>{item.항} · {item.목}</div>
              <h1 style={{ fontSize: 18, fontWeight: 700, color: '#1C1C1E', margin: '4px 0' }}>{item.세목}</h1>
              <div style={{ fontSize: 14, color: '#1C1C1E' }}>{item.금액.toLocaleString()}원</div>
            </div>
            <button
              onClick={() => updateBudgetItem(org.id, item.id, { 수동완료: !item.수동완료 })}
              title={item.수동완료 ? '클릭하면 자동 판정으로 되돌립니다' : '필요서류 없어도 완료로 강제 처리'}
              style={{ padding: '4px 10px', borderRadius: 8, fontSize: 12, fontWeight: 700, border: 'none', cursor: 'pointer',
              background: status.status === '완료' ? '#D4F5DF' : status.status === '부분완료' ? '#FFF9D4' : '#FFE0DE',
              color: status.status === '완료' ? '#1A8C3A' : status.status === '부분완료' ? '#B07800' : '#CC2200' }}>
              {status.status}{status.manual ? ' 📌' : ''}
            </button>
          </div>
          {status.warning && <div style={{ marginTop: 10, fontSize: 12, color: '#CC2200' }}>⚠️ {status.warning}</div>}
          {reclassifyNote && <div style={{ marginTop: 10, fontSize: 12, color: '#B07800' }}>ℹ️ {reclassifyNote}</div>}
        </div>

        <div style={{ background: '#fff', borderRadius: 14, padding: 20, marginTop: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#1C1C1E', marginBottom: 4 }}>필요서류 체크리스트</div>
          <div style={{ fontSize: 12, color: '#8E8E93', marginBottom: 10 }}>항목별로 바로 파일을 첨부하면 자동으로 체크됩니다.</div>
          {required.length === 0 && <div style={{ fontSize: 13, color: '#8E8E93' }}>필수 서류 규정이 없는 항목입니다.</div>}
          {required.map(d => (
            <ChecklistRow key={d.key} orgId={org.id} itemId={item.id} doc={d} files={files}
              uploadedBy={user?.email ?? user?.uid ?? ''} onDelete={f => deleteEvidenceFile(org.id, item.id, f)} />
          ))}
        </div>

        {item.항 === '인건비' && (
          <div style={{ marginTop: 16 }}>
            <PayslipGenerator orgId={org.id} itemId={item.id} orgName={org.name} defaultTotal={item.금액} uploadedBy={user?.email ?? user?.uid ?? ''} />
          </div>
        )}

        <div style={{ background: '#fff', borderRadius: 14, padding: 20, marginTop: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#1C1C1E', marginBottom: 4 }}>기타 서류</div>
          <div style={{ fontSize: 12, color: '#8E8E93', marginBottom: 10 }}>위 체크리스트에 없는 참고 서류를 추가로 첨부할 때 사용하세요.</div>
          <UploadForm orgId={org.id} itemId={item.id} uploadedBy={user?.email ?? user?.uid ?? ''} />
          <div style={{ marginTop: 12, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {otherFiles.map(f => (
              <FileThumb key={f.id} file={f} onDelete={() => deleteEvidenceFile(org.id, item.id, f)} />
            ))}
            {otherFiles.length === 0 && <div style={{ fontSize: 13, color: '#8E8E93', padding: '8px 0' }}>추가 첨부된 기타 서류가 없습니다.</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
