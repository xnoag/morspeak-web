'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import * as XLSX from 'xlsx';
import { useReceiptSession } from '@/lib/useReceiptSession';
import { watchBudgetItems, addBudgetItem, addBudgetItemsBulk, deleteBudgetItem, type BudgetItemDoc } from '@/lib/receipts';
import { getRequiredDocs, type ContractType, type OpsExpenseType } from '@/lib/receiptRules';

const F = "-apple-system,'SF Pro Display',BlinkMacSystemFont,'Helvetica Neue',sans-serif";
const CATEGORIES = ['외주용역비', '물품구매비', 'SW 구독료', '운영비', '인건비', '예비비'];

function AddForm({ orgId }: { orgId: string }) {
  const [항, set항] = useState(CATEGORIES[0]);
  const [목, set목] = useState('');
  const [세목, set세목] = useState('');
  const [금액, set금액] = useState('');
  const [계약형태, set계약형태] = useState<ContractType>('업체');
  const [지출유형, set지출유형] = useState<OpsExpenseType>('일반');
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = Number(금액.replace(/[^0-9]/g, ''));
    if (!목.trim() || !세목.trim() || !amount) return;
    setSaving(true);
    await addBudgetItem(orgId, {
      항, 목: 목.trim(), 세목: 세목.trim(), 금액: amount,
      ...(항 === '외주용역비' ? { 계약형태 } : {}),
      ...(항 === '운영비' ? { 지출유형 } : {}),
    });
    set목(''); set세목(''); set금액('');
    setSaving(false);
  };

  return (
    <form onSubmit={submit} style={{ background: '#fff', borderRadius: 14, padding: 20, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr auto', gap: 8, alignItems: 'end' }}>
      <label style={{ fontSize: 12, color: '#8E8E93' }}>항
        <select value={항} onChange={e => set항(e.target.value)} style={sel}>
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </label>
      <label style={{ fontSize: 12, color: '#8E8E93' }}>목
        <input value={목} onChange={e => set목(e.target.value)} style={inp} />
      </label>
      <label style={{ fontSize: 12, color: '#8E8E93' }}>세목
        <input value={세목} onChange={e => set세목(e.target.value)} style={inp} />
      </label>
      <label style={{ fontSize: 12, color: '#8E8E93' }}>금액
        <input value={금액} onChange={e => set금액(e.target.value)} placeholder="숫자만" style={inp} />
      </label>
      {항 === '외주용역비' && (
        <label style={{ fontSize: 12, color: '#8E8E93', gridColumn: '1 / span 2' }}>계약형태
          <select value={계약형태} onChange={e => set계약형태(e.target.value as ContractType)} style={sel}>
            <option value="업체">업체</option><option value="개인">개인</option>
          </select>
        </label>
      )}
      {항 === '운영비' && (
        <label style={{ fontSize: 12, color: '#8E8E93', gridColumn: '1 / span 2' }}>지출유형
          <select value={지출유형} onChange={e => set지출유형(e.target.value as OpsExpenseType)} style={sel}>
            <option value="일반">일반</option><option value="행사성">행사성</option>
          </select>
        </label>
      )}
      <button type="submit" disabled={saving} style={{ padding: '9px 16px', borderRadius: 9, border: 'none', background: '#1C1C1E', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>추가</button>
    </form>
  );
}

const inp: React.CSSProperties = { display: 'block', width: '100%', marginTop: 4, padding: '8px 10px', borderRadius: 8, border: '1.5px solid #E5E5EA', fontSize: 13, fontFamily: F, boxSizing: 'border-box' };
const sel: React.CSSProperties = { ...inp };

function CsvUpload({ orgId }: { orgId: string }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState('');

  const onFile = async (file: File) => {
    setStatus('읽는 중…');
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: 'array' });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });
    const items = rows.map(r => ({
      항: String(r['항'] ?? '').trim(),
      목: String(r['목'] ?? '').trim(),
      세목: String(r['세목'] ?? '').trim(),
      금액: Number(String(r['금액'] ?? '0').replace(/[^0-9]/g, '')) || 0,
    })).filter(it => it.항 && it.세목 && it.금액);
    if (!items.length) { setStatus('유효한 행이 없습니다 (항/목/세목/금액 컬럼 확인)'); return; }
    await addBudgetItemsBulk(orgId, items);
    setStatus(`${items.length}건 등록 완료`);
    if (fileRef.current) fileRef.current.value = '';
  };

  return (
    <div style={{ background: '#fff', borderRadius: 14, padding: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
      <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" onChange={e => { const f = e.target.files?.[0]; if (f) onFile(f); }} style={{ fontSize: 13 }} />
      <span style={{ fontSize: 12, color: '#8E8E93' }}>{status || 'CSV/Excel: 항, 목, 세목, 금액 컬럼 필요'}</span>
    </div>
  );
}

export default function BudgetItemsPage() {
  const { userLoading, user, orgsLoading, org } = useReceiptSession();
  const router = useRouter();
  const [items, setItems] = useState<BudgetItemDoc[] | null>(null);

  useEffect(() => {
    if (!userLoading && !user) router.replace('/receipts/asannanumfoundation/login');
  }, [userLoading, user, router]);

  useEffect(() => {
    if (org) return watchBudgetItems(org.id, setItems);
  }, [org]);

  if (userLoading || orgsLoading || !org) return <div style={{ padding: 40, fontFamily: F, color: '#8E8E93', fontSize: 13 }}>불러오는 중…</div>;

  return (
    <div style={{ minHeight: '100vh', background: '#F7F7F8', fontFamily: F, padding: '32px 24px' }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <Link href="/receipts/asannanumfoundation" style={{ fontSize: 13, color: '#8E8E93', textDecoration: 'none' }}>← 대시보드</Link>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: '#1C1C1E', margin: '8px 0 20px' }}>예산 세목 관리</h1>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
          <AddForm orgId={org.id} />
          <CsvUpload orgId={org.id} />
        </div>

        <div style={{ background: '#fff', borderRadius: 14, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#F7F7F8', color: '#8E8E93', textAlign: 'left' }}>
                <th style={th}>항</th><th style={th}>목</th><th style={th}>세목</th><th style={th}>금액</th><th style={th}>필요서류</th><th style={th}></th>
              </tr>
            </thead>
            <tbody>
              {(items ?? []).map(it => (
                <tr key={it.id} style={{ borderTop: '1px solid #F2F2F7' }}>
                  <td style={td}>{it.항}</td>
                  <td style={td}>{it.목}</td>
                  <td style={td}><Link href={`/receipts/asannanumfoundation/budget-items/${it.id}`} style={{ color: '#1C1C1E' }}>{it.세목}</Link></td>
                  <td style={td}>{it.금액.toLocaleString()}원</td>
                  <td style={td}>{getRequiredDocs(it).length}종</td>
                  <td style={td}>
                    <button onClick={() => deleteBudgetItem(org.id, it.id)} style={{ background: 'none', border: 'none', color: '#CC2200', fontSize: 12, cursor: 'pointer' }}>삭제</button>
                  </td>
                </tr>
              ))}
              {items && items.length === 0 && (
                <tr><td colSpan={6} style={{ ...td, textAlign: 'center', color: '#8E8E93', padding: 24 }}>등록된 예산 세목이 없습니다.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

const th: React.CSSProperties = { padding: '10px 14px', fontWeight: 600, fontSize: 12 };
const td: React.CSSProperties = { padding: '10px 14px', color: '#1C1C1E' };
