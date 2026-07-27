'use client';
import { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useReceiptSession } from '@/lib/useReceiptSession';
import { watchBudgetItems, watchEvidenceFiles, uploadEvidenceFile, deleteEvidenceFile, type BudgetItemDoc, type EvidenceFileDoc } from '@/lib/receipts';
import { getRequiredDocs, computeItemStatus, needsReclassifyNote, EVIDENCE_DOC_TYPES } from '@/lib/receiptRules';

const F = "-apple-system,'SF Pro Display',BlinkMacSystemFont,'Helvetica Neue',sans-serif";

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
