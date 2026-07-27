'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useReceiptSession } from '@/lib/useReceiptSession';
import { createOrg, watchBudgetItems, getAllEvidenceDocTypes, updateOrgTotalBudget, type BudgetItemDoc, type Org } from '@/lib/receipts';
import { computeItemStatus } from '@/lib/receiptRules';
import { logout } from '@/lib/receiptAuth';

const F = "-apple-system,'SF Pro Display',BlinkMacSystemFont,'Helvetica Neue',sans-serif";
const CATEGORY_ORDER = ['외주용역비', '물품구매비', 'SW 구독료', '운영비', '인건비', '예비비'];

function CreateOrgForm() {
  const { user } = useReceiptSession();
  const router = useRouter();
  const [name, setName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [totalBudget, setTotalBudget] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !name.trim()) return;
    setLoading(true);
    await createOrg(user.uid, user.email ?? '', name.trim(), businessName.trim(), Number(totalBudget.replace(/[^0-9]/g, '')) || 0);
    router.refresh();
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F7F7F8', fontFamily: F }}>
      <form onSubmit={submit} style={{ width: 380, background: '#fff', borderRadius: 16, padding: 32, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
        <h1 style={{ fontSize: 18, fontWeight: 700, color: '#1C1C1E', margin: 0 }}>조직 만들기</h1>
        <p style={{ fontSize: 13, color: '#8E8E93', marginTop: 4 }}>참여 팀 이름으로 워크스페이스를 만들어주세요.</p>
        <input required placeholder="팀/기관명 (예: 모스픽)" value={name} onChange={e => setName(e.target.value)}
          style={{ width: '100%', marginTop: 20, padding: '11px 14px', borderRadius: 10, border: '1.5px solid #E5E5EA', fontSize: 14, fontFamily: F, boxSizing: 'border-box' }} />
        <input placeholder="사업명 (선택)" value={businessName} onChange={e => setBusinessName(e.target.value)}
          style={{ width: '100%', marginTop: 10, padding: '11px 14px', borderRadius: 10, border: '1.5px solid #E5E5EA', fontSize: 14, fontFamily: F, boxSizing: 'border-box' }} />
        <input placeholder="총사업비 (숫자만, 선택)" value={totalBudget} onChange={e => setTotalBudget(e.target.value)}
          style={{ width: '100%', marginTop: 10, padding: '11px 14px', borderRadius: 10, border: '1.5px solid #E5E5EA', fontSize: 14, fontFamily: F, boxSizing: 'border-box' }} />
        <button type="submit" disabled={loading}
          style={{ width: '100%', marginTop: 16, padding: '11px 0', borderRadius: 10, border: 'none', background: '#1C1C1E', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', opacity: loading ? 0.6 : 1 }}>
          {loading ? '생성 중…' : '조직 만들기'}
        </button>
      </form>
    </div>
  );
}

function TotalBudgetEditor({ orgId, totalBudget }: { orgId: string; totalBudget: number }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(String(totalBudget || ''));

  const save = async () => {
    await updateOrgTotalBudget(orgId, Number(value.replace(/[^0-9]/g, '')) || 0);
    setEditing(false);
  };

  if (editing) {
    return (
      <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
        <input autoFocus value={value} onChange={e => setValue(e.target.value)}
          style={{ width: 130, padding: '4px 8px', borderRadius: 6, border: '1.5px solid #E5E5EA', fontSize: 12, fontFamily: F }} />
        <button onClick={save} style={{ fontSize: 12, color: '#1A73E8', background: 'none', border: 'none', cursor: 'pointer' }}>저장</button>
      </span>
    );
  }
  return (
    <button onClick={() => setEditing(true)} style={{ fontSize: 12, color: '#8E8E93', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>
      총사업비 {totalBudget ? '수정' : '입력'}
    </button>
  );
}

function Dashboard({ org }: { org: Org }) {
  const [items, setItems] = useState<BudgetItemDoc[] | null>(null);
  const [statusByItem, setStatusByItem] = useState<Record<string, ReturnType<typeof computeItemStatus>>>({});

  useEffect(() => watchBudgetItems(org.id, setItems), [org.id]);

  useEffect(() => {
    if (!items) return;
    let cancelled = false;
    (async () => {
      const entries = await Promise.all(items.map(async it => {
        const docTypes = await getAllEvidenceDocTypes(org.id, it.id);
        return [it.id, computeItemStatus(it, docTypes)] as const;
      }));
      if (!cancelled) setStatusByItem(Object.fromEntries(entries));
    })();
    return () => { cancelled = true; };
  }, [items, org.id]);

  const total = items?.length ?? 0;
  const done = items?.filter(it => statusByItem[it.id]?.status === '완료').length ?? 0;
  const rate = total ? Math.round((done / total) * 100) : 0;
  const missingItems = items?.filter(it => statusByItem[it.id] && statusByItem[it.id].status !== '완료') ?? [];

  const registered = (items ?? []).reduce((s, it) => s + it.금액, 0);
  const executed = (items ?? []).filter(it => it.집행상태 === '집행완료').reduce((s, it) => s + it.금액, 0);
  const inProgress = (items ?? []).filter(it => it.집행상태 === '집행중').reduce((s, it) => s + it.금액, 0);
  const totalBudget = org.totalBudget ?? 0;
  const spentRate = totalBudget ? Math.min(100, Math.round((executed / totalBudget) * 100)) : 0;
  const remaining = totalBudget - executed;

  const byCategory = CATEGORY_ORDER
    .map(cat => ({
      cat,
      amount: (items ?? []).filter(it => it.항 === cat && it.집행상태 === '집행완료').reduce((s, it) => s + it.금액, 0),
    }))
    .filter(c => c.amount > 0);

  return (
    <div style={{ minHeight: '100vh', background: '#F7F7F8', fontFamily: F, padding: '32px 24px' }}>
      <div style={{ maxWidth: 960, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: '#1C1C1E', margin: 0 }}>{org.name}</h1>
            <p style={{ fontSize: 13, color: '#8E8E93', marginTop: 2 }}>아산나눔재단 증빙자료 아카이빙</p>
          </div>
          <button onClick={() => logout()} style={{ fontSize: 13, color: '#8E8E93', background: 'none', border: 'none', cursor: 'pointer' }}>로그아웃</button>
        </div>

        <div style={{ marginTop: 24, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div style={{ background: '#fff', borderRadius: 14, padding: 24 }}>
            <div style={{ fontSize: 32, fontWeight: 800, color: '#1C1C1E' }}>{rate}%</div>
            <div style={{ fontSize: 12, color: '#8E8E93' }}>증빙 완료율 ({done}/{total})</div>
          </div>

          <div style={{ background: '#fff', borderRadius: 14, padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#1C1C1E' }}>{executed.toLocaleString()}원</div>
              <TotalBudgetEditor orgId={org.id} totalBudget={totalBudget} />
            </div>
            <div style={{ fontSize: 12, color: '#8E8E93', marginTop: 2 }}>
              {totalBudget ? `총 예산 ${totalBudget.toLocaleString()}원 중 집행완료 (${spentRate}%)` : '집행완료 세목 금액 합계'}
            </div>
            {totalBudget > 0 && (
              <>
                <div style={{ marginTop: 10, height: 6, borderRadius: 3, background: '#F2F2F7', overflow: 'hidden' }}>
                  <div style={{ width: `${spentRate}%`, height: '100%', background: remaining < 0 ? '#CC2200' : '#1C1C1E' }} />
                </div>
                <div style={{ fontSize: 11, color: remaining < 0 ? '#CC2200' : '#8E8E93', marginTop: 6 }}>
                  {remaining < 0 ? `예산 초과 ${Math.abs(remaining).toLocaleString()}원` : `잔여 ${remaining.toLocaleString()}원`}
                </div>
              </>
            )}
            {(inProgress > 0 || registered !== executed) && (
              <div style={{ fontSize: 11, color: '#B07800', marginTop: 4 }}>
                집행중 {inProgress.toLocaleString()}원 별도 · 전체 등록액 {registered.toLocaleString()}원
              </div>
            )}
          </div>
        </div>

        <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end' }}>
          <Link href="/receipts/asannanumfoundation/budget-items"
            style={{ padding: '10px 18px', borderRadius: 10, background: '#1C1C1E', color: '#fff', fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>
            예산 세목 관리
          </Link>
        </div>

        {byCategory.length > 0 && (
          <div style={{ marginTop: 20, background: '#fff', borderRadius: 14, padding: 20 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#1C1C1E', marginBottom: 12 }}>항목별 집행 금액</div>
            {byCategory.map(({ cat, amount }) => (
              <div key={cat} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '6px 0' }}>
                <span style={{ fontSize: 13, color: '#1C1C1E', width: 100 }}>{cat}</span>
                <div style={{ flex: 1, height: 8, borderRadius: 4, background: '#F2F2F7', overflow: 'hidden' }}>
                  <div style={{ width: `${executed ? Math.round((amount / executed) * 100) : 0}%`, height: '100%', background: '#1C1C1E' }} />
                </div>
                <span style={{ fontSize: 12, color: '#8E8E93', width: 110, textAlign: 'right' }}>{amount.toLocaleString()}원</span>
              </div>
            ))}
          </div>
        )}

        {missingItems.length > 0 && (
          <div style={{ marginTop: 20, background: '#fff', borderRadius: 14, padding: 20 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#1C1C1E', marginBottom: 12 }}>미비 항목 ({missingItems.length})</div>
            {missingItems.map(it => {
              const st = statusByItem[it.id];
              return (
                <Link key={it.id} href={`/receipts/asannanumfoundation/budget-items/${it.id}`}
                  style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderTop: '1px solid #F2F2F7', textDecoration: 'none', color: '#1C1C1E' }}>
                  <span style={{ fontSize: 13 }}>{it.항} · {it.세목}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: st?.status === '부분완료' ? '#B07800' : '#CC2200' }}>
                    {st?.status}{st?.warning ? ' ⚠️' : ''}
                  </span>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default function ReceiptsHome() {
  const { userLoading, user, orgsLoading, org } = useReceiptSession();
  const router = useRouter();

  useEffect(() => {
    if (!userLoading && !user) router.replace('/receipts/asannanumfoundation/login');
  }, [userLoading, user, router]);

  if (userLoading || !user || orgsLoading) {
    return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: F, color: '#8E8E93', fontSize: 13 }}>불러오는 중…</div>;
  }
  if (!org) return <CreateOrgForm />;
  return <Dashboard org={org} />;
}
