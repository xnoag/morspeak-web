'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useReceiptSession } from '@/lib/useReceiptSession';
import { createOrg, watchBudgetItems, getAllEvidenceDocTypes, type BudgetItemDoc } from '@/lib/receipts';
import { computeItemStatus } from '@/lib/receiptRules';
import { logout } from '@/lib/receiptAuth';

const F = "-apple-system,'SF Pro Display',BlinkMacSystemFont,'Helvetica Neue',sans-serif";

function CreateOrgForm() {
  const { user } = useReceiptSession();
  const router = useRouter();
  const [name, setName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !name.trim()) return;
    setLoading(true);
    await createOrg(user.uid, user.email ?? '', name.trim(), businessName.trim());
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
        <button type="submit" disabled={loading}
          style={{ width: '100%', marginTop: 16, padding: '11px 0', borderRadius: 10, border: 'none', background: '#1C1C1E', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', opacity: loading ? 0.6 : 1 }}>
          {loading ? '생성 중…' : '조직 만들기'}
        </button>
      </form>
    </div>
  );
}

function Dashboard({ orgId, orgName }: { orgId: string; orgName: string }) {
  const [items, setItems] = useState<BudgetItemDoc[] | null>(null);
  const [statusByItem, setStatusByItem] = useState<Record<string, ReturnType<typeof computeItemStatus>>>({});

  useEffect(() => watchBudgetItems(orgId, setItems), [orgId]);

  useEffect(() => {
    if (!items) return;
    let cancelled = false;
    (async () => {
      const entries = await Promise.all(items.map(async it => {
        const docTypes = await getAllEvidenceDocTypes(orgId, it.id);
        return [it.id, computeItemStatus(it, docTypes)] as const;
      }));
      if (!cancelled) setStatusByItem(Object.fromEntries(entries));
    })();
    return () => { cancelled = true; };
  }, [items, orgId]);

  const total = items?.length ?? 0;
  const done = items?.filter(it => statusByItem[it.id]?.status === '완료').length ?? 0;
  const rate = total ? Math.round((done / total) * 100) : 0;
  const missingItems = items?.filter(it => statusByItem[it.id] && statusByItem[it.id].status !== '완료') ?? [];

  return (
    <div style={{ minHeight: '100vh', background: '#F7F7F8', fontFamily: F, padding: '32px 24px' }}>
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: '#1C1C1E', margin: 0 }}>{orgName}</h1>
            <p style={{ fontSize: 13, color: '#8E8E93', marginTop: 2 }}>아산나눔재단 증빙자료 아카이빙</p>
          </div>
          <button onClick={() => logout()} style={{ fontSize: 13, color: '#8E8E93', background: 'none', border: 'none', cursor: 'pointer' }}>로그아웃</button>
        </div>

        <div style={{ marginTop: 24, background: '#fff', borderRadius: 14, padding: 24, display: 'flex', gap: 32, alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 32, fontWeight: 800, color: '#1C1C1E' }}>{rate}%</div>
            <div style={{ fontSize: 12, color: '#8E8E93' }}>증빙 완료율 ({done}/{total})</div>
          </div>
          <Link href="/receipts/asannanumfoundation/budget-items"
            style={{ marginLeft: 'auto', padding: '10px 18px', borderRadius: 10, background: '#1C1C1E', color: '#fff', fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>
            예산 세목 관리
          </Link>
        </div>

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
  return <Dashboard orgId={org.id} orgName={org.name} />;
}
