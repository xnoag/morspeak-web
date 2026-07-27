'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import * as XLSX from 'xlsx';
import { useReceiptSession } from '@/lib/useReceiptSession';
import { watchBudgetItems, addBudgetItem, addBudgetItemsBulk, updateBudgetItem, deleteBudgetItem, getAllEvidenceDocTypes, type BudgetItemDoc } from '@/lib/receipts';
import { getRequiredDocs, computeItemStatus, type ContractType, type OpsExpenseType, type ExecutionStatus, type ItemStatus } from '@/lib/receiptRules';

const F = "-apple-system,'SF Pro Display',BlinkMacSystemFont,'Helvetica Neue',sans-serif";
const CATEGORIES = ['외주용역비', '물품구매비', 'SW 구독료', '운영비', '인건비', '예비비'];
const EXECUTION_STATUSES: ExecutionStatus[] = ['미집행', '집행중', '집행완료'];

const STATUS_STYLE: Record<ItemStatus, { bg: string; color: string }> = {
  '완료':   { bg: '#D4F5DF', color: '#1A8C3A' },
  '부분완료': { bg: '#FFF9D4', color: '#B07800' },
  '미비':   { bg: '#FFE0DE', color: '#CC2200' },
};

const EXEC_STYLE: Record<ExecutionStatus, { bg: string; color: string }> = {
  '집행완료': { bg: '#E3F0FF', color: '#1A73E8' },
  '집행중':   { bg: '#FFF3DA', color: '#B07800' },
  '미집행':   { bg: '#F2F2F7', color: '#8E8E93' },
};

function AddPanel({ orgId, onDone }: { orgId: string; onDone: () => void }) {
  const [항, set항] = useState(CATEGORIES[0]);
  const [목, set목] = useState('');
  const [세목, set세목] = useState('');
  const [금액, set금액] = useState('');
  const [계약형태, set계약형태] = useState<ContractType>('업체');
  const [지출유형, set지출유형] = useState<OpsExpenseType>('일반');
  const [집행상태, set집행상태] = useState<ExecutionStatus>('미집행');
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [csvStatus, setCsvStatus] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = Number(금액.replace(/[^0-9]/g, ''));
    if (!목.trim() || !세목.trim() || !amount) return;
    setSaving(true);
    await addBudgetItem(orgId, {
      항, 목: 목.trim(), 세목: 세목.trim(), 금액: amount, 집행상태,
      ...(항 === '외주용역비' ? { 계약형태 } : {}),
      ...(항 === '운영비' ? { 지출유형 } : {}),
    });
    set목(''); set세목(''); set금액('');
    setSaving(false);
  };

  const onFile = async (file: File) => {
    setCsvStatus('읽는 중…');
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: 'array' });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });
    const items = rows.map(r => ({
      항: String(r['항'] ?? '').trim(),
      목: String(r['목'] ?? '').trim(),
      세목: String(r['세목'] ?? '').trim(),
      금액: Number(String(r['금액'] ?? '0').replace(/[^0-9]/g, '')) || 0,
      집행상태: (EXECUTION_STATUSES.includes(String(r['집행상태'] ?? '') as ExecutionStatus) ? String(r['집행상태']) : '미집행') as ExecutionStatus,
    })).filter(it => it.항 && it.세목 && it.금액);
    if (!items.length) { setCsvStatus('유효한 행이 없습니다 (항/목/세목/금액 컬럼 확인)'); return; }
    await addBudgetItemsBulk(orgId, items);
    setCsvStatus(`${items.length}건 등록 완료`);
    if (fileRef.current) fileRef.current.value = '';
    onDone();
  };

  return (
    <div style={{ background: '#fff', borderRadius: 14, padding: 20, marginBottom: 20 }}>
      <form onSubmit={submit} style={{ display: 'grid', gridTemplateColumns: '130px 1fr 1.3fr 120px 110px 100px', gap: 10, alignItems: 'end' }}>
        <label style={lbl}>항
          <select value={항} onChange={e => set항(e.target.value)} style={sel}>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>
        <label style={lbl}>목
          <input value={목} onChange={e => set목(e.target.value)} style={inp} />
        </label>
        <label style={lbl}>세목
          <input value={세목} onChange={e => set세목(e.target.value)} style={inp} />
        </label>
        <label style={lbl}>금액
          <input value={금액} onChange={e => set금액(e.target.value)} placeholder="숫자만" style={inp} />
        </label>
        <label style={lbl}>집행상태
          <select value={집행상태} onChange={e => set집행상태(e.target.value as ExecutionStatus)} style={sel}>
            {EXECUTION_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </label>
        <button type="submit" disabled={saving} style={{ padding: '9px 0', borderRadius: 9, border: 'none', background: '#1C1C1E', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>추가</button>

        {항 === '외주용역비' && (
          <label style={{ ...lbl, gridColumn: '1 / span 2' }}>계약형태
            <select value={계약형태} onChange={e => set계약형태(e.target.value as ContractType)} style={sel}>
              <option value="업체">업체</option><option value="개인">개인</option>
            </select>
          </label>
        )}
        {항 === '운영비' && (
          <label style={{ ...lbl, gridColumn: '1 / span 2' }}>지출유형
            <select value={지출유형} onChange={e => set지출유형(e.target.value as OpsExpenseType)} style={sel}>
              <option value="일반">일반</option><option value="행사성">행사성</option>
            </select>
          </label>
        )}
      </form>

      <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid #F2F2F7', display: 'flex', alignItems: 'center', gap: 12 }}>
        <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" onChange={e => { const f = e.target.files?.[0]; if (f) onFile(f); }} style={{ fontSize: 13 }} />
        <span style={{ fontSize: 12, color: '#8E8E93' }}>{csvStatus || 'CSV/Excel 일괄 업로드: 항, 목, 세목, 금액 컬럼 필요 (집행상태 컬럼 선택, 없으면 미집행)'}</span>
      </div>
    </div>
  );
}

const lbl: React.CSSProperties = { fontSize: 12, color: '#8E8E93' };
const inp: React.CSSProperties = { display: 'block', width: '100%', marginTop: 4, padding: '8px 10px', borderRadius: 8, border: '1.5px solid #E5E5EA', fontSize: 13, fontFamily: F, boxSizing: 'border-box' };
const sel: React.CSSProperties = { ...inp };

export default function BudgetItemsPage() {
  const { userLoading, user, orgsLoading, org } = useReceiptSession();
  const router = useRouter();
  const [items, setItems] = useState<BudgetItemDoc[] | null>(null);
  const [statusByItem, setStatusByItem] = useState<Record<string, ReturnType<typeof computeItemStatus>>>({});
  const [showAdd, setShowAdd] = useState(false);

  useEffect(() => {
    if (!userLoading && !user) router.replace('/receipts/asannanumfoundation/login');
  }, [userLoading, user, router]);

  useEffect(() => {
    if (org) return watchBudgetItems(org.id, setItems);
  }, [org]);

  useEffect(() => {
    if (!items || !org) return;
    let cancelled = false;
    (async () => {
      const entries = await Promise.all(items.map(async it => {
        const docTypes = await getAllEvidenceDocTypes(org.id, it.id);
        return [it.id, computeItemStatus(it, docTypes)] as const;
      }));
      if (!cancelled) setStatusByItem(Object.fromEntries(entries));
    })();
    return () => { cancelled = true; };
  }, [items, org]);

  if (userLoading || orgsLoading || !org) return <div style={{ padding: 40, fontFamily: F, color: '#8E8E93', fontSize: 13 }}>불러오는 중…</div>;

  const grandTotal = (items ?? []).reduce((s, it) => s + it.금액, 0);
  const grouped = CATEGORIES.map(cat => ({
    cat,
    items: (items ?? []).filter(it => it.항 === cat),
  })).filter(g => g.items.length > 0);
  const otherCats = [...new Set((items ?? []).map(it => it.항).filter(c => !CATEGORIES.includes(c)))];
  for (const cat of otherCats) grouped.push({ cat, items: (items ?? []).filter(it => it.항 === cat) });

  return (
    <div style={{ minHeight: '100vh', background: '#F7F7F8', fontFamily: F, padding: '32px 40px' }}>
      <div style={{ maxWidth: 1180, margin: '0 auto' }}>
        <Link href="/receipts/asannanumfoundation" style={{ fontSize: 13, color: '#8E8E93', textDecoration: 'none' }}>← 대시보드</Link>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', margin: '8px 0 20px' }}>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: '#1C1C1E', margin: 0 }}>예산 세목 관리</h1>
            <p style={{ fontSize: 13, color: '#8E8E93', marginTop: 4 }}>{items?.length ?? 0}건 · 총 {grandTotal.toLocaleString()}원</p>
          </div>
          <button onClick={() => setShowAdd(v => !v)}
            style={{ padding: '9px 18px', borderRadius: 9, border: 'none', background: '#1C1C1E', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            {showAdd ? '닫기' : '+ 세목 추가'}
          </button>
        </div>

        {showAdd && <AddPanel orgId={org.id} onDone={() => {}} />}

        {grouped.map(({ cat, items: catItems }) => {
          const subtotal = catItems.reduce((s, it) => s + it.금액, 0);
          return (
            <div key={cat} style={{ background: '#fff', borderRadius: 14, overflow: 'hidden', marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', background: '#FAFAFA', borderBottom: '1px solid #F0F0F2' }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: '#1C1C1E' }}>{cat} <span style={{ fontWeight: 400, color: '#8E8E93', fontSize: 12 }}>· {catItems.length}건</span></span>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#1C1C1E' }}>{subtotal.toLocaleString()}원</span>
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ color: '#8E8E93', textAlign: 'left' }}>
                    <th style={{ ...th, width: '18%' }}>목</th>
                    <th style={{ ...th, width: '26%' }}>세목</th>
                    <th style={{ ...th, width: '13%' }}>금액</th>
                    <th style={{ ...th, width: '13%' }}>집행상태</th>
                    <th style={{ ...th, width: '11%' }}>증빙상태</th>
                    <th style={{ ...th, width: '11%' }}>필요서류</th>
                    <th style={{ ...th, width: '8%' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {catItems.map(it => {
                    const st = statusByItem[it.id];
                    return (
                      <tr key={it.id} style={{ borderTop: '1px solid #F2F2F7' }}>
                        <td style={td}>{it.목}</td>
                        <td style={td}>
                          <Link href={`/receipts/asannanumfoundation/budget-items/${it.id}`} style={{ color: '#1C1C1E', fontWeight: 500 }}>{it.세목}</Link>
                          {it.항 === '외주용역비' && (
                            <select value={it.계약형태 ?? '업체'}
                              onChange={e => updateBudgetItem(org.id, it.id, { 계약형태: e.target.value as ContractType })}
                              style={miniSel}>
                              <option value="업체">업체 계약</option><option value="개인">개인 계약</option>
                            </select>
                          )}
                          {it.항 === '운영비' && (
                            <select value={it.지출유형 ?? '일반'}
                              onChange={e => updateBudgetItem(org.id, it.id, { 지출유형: e.target.value as OpsExpenseType })}
                              style={miniSel}>
                              <option value="일반">일반 지출</option><option value="행사성">행사성 지출</option>
                            </select>
                          )}
                        </td>
                        <td style={td}>{it.금액.toLocaleString()}원</td>
                        <td style={td}>
                          <select
                            value={it.집행상태 ?? '미집행'}
                            onChange={e => updateBudgetItem(org.id, it.id, { 집행상태: e.target.value as ExecutionStatus })}
                            style={{
                              padding: '3px 8px', borderRadius: 7, fontSize: 11, fontWeight: 700, border: 'none', cursor: 'pointer',
                              background: EXEC_STYLE[it.집행상태 ?? '미집행'].bg, color: EXEC_STYLE[it.집행상태 ?? '미집행'].color,
                            }}>
                            {EXECUTION_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                          </select>
                        </td>
                        <td style={td}>
                          {st && (
                            <span style={{ padding: '3px 9px', borderRadius: 7, fontSize: 11, fontWeight: 700, background: STATUS_STYLE[st.status].bg, color: STATUS_STYLE[st.status].color }}>
                              {st.status}{st.warning ? ' ⚠️' : ''}
                            </span>
                          )}
                        </td>
                        <td style={td}>{getRequiredDocs(it).length}종</td>
                        <td style={td}>
                          <button onClick={() => deleteBudgetItem(org.id, it.id)} style={{ background: 'none', border: 'none', color: '#CC2200', fontSize: 12, cursor: 'pointer' }}>삭제</button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          );
        })}

        {items && items.length === 0 && (
          <div style={{ background: '#fff', borderRadius: 14, padding: 40, textAlign: 'center', color: '#8E8E93', fontSize: 13 }}>
            등록된 예산 세목이 없습니다. 위 &apos;+ 세목 추가&apos;로 등록해주세요.
          </div>
        )}
      </div>
    </div>
  );
}

const th: React.CSSProperties = { padding: '10px 20px', fontWeight: 600, fontSize: 12 };
const td: React.CSSProperties = { padding: '12px 20px', color: '#1C1C1E' };
const miniSel: React.CSSProperties = { display: 'block', marginTop: 4, padding: '2px 6px', borderRadius: 6, border: '1px solid #E5E5EA', background: '#fff', color: '#8E8E93', fontSize: 11, fontFamily: F, cursor: 'pointer' };
