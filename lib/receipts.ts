// 아산나눔재단 증빙자료 아카이빙 — Firestore/Storage 데이터 액세스
import {
  collection, doc, setDoc, getDoc, getDocs, deleteDoc,
  query, where, onSnapshot, orderBy,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage } from './firebase';
import type { BudgetItem } from './receiptRules';

export const PROGRAM_ID = 'asannanumfoundation';

export type Org = {
  id: string;
  name: string;
  businessName?: string;
  programId: string;
  createdAt: string;
  createdBy: string;
};

export type Membership = {
  uid: string;
  orgId: string;
  email: string;
  role: 'member';
  joinedAt: string;
};

export type BudgetItemDoc = BudgetItem & {
  id: string;
  orgId: string;
  createdAt: string;
  updatedAt: string;
};

export type EvidenceFileDoc = {
  id: string;
  docType: string;
  fileName: string;
  storagePath: string;
  downloadUrl: string;
  uploadedBy: string;
  uploadedAt: string;
  memo?: string;
};

function membershipId(uid: string, orgId: string) {
  return `${uid}_${orgId}`;
}

// ── 조직 ────────────────────────────────────────────────
export async function createOrg(uid: string, email: string, name: string, businessName?: string): Promise<string> {
  const orgRef = doc(collection(db, 'orgs'));
  const now = new Date().toISOString();
  await setDoc(orgRef, {
    name, businessName: businessName ?? '', programId: PROGRAM_ID, createdAt: now, createdBy: uid,
  });
  await setDoc(doc(db, 'memberships', membershipId(uid, orgRef.id)), {
    uid, orgId: orgRef.id, email, role: 'member', joinedAt: now,
  });
  return orgRef.id;
}

export function watchUserMemberships(uid: string, cb: (orgs: Org[]) => void) {
  const q = query(collection(db, 'memberships'), where('uid', '==', uid));
  return onSnapshot(q, async snap => {
    const orgIds = snap.docs.map(d => (d.data() as Membership).orgId);
    if (!orgIds.length) { cb([]); return; }
    const orgs = await Promise.all(orgIds.map(async id => {
      const s = await getDoc(doc(db, 'orgs', id));
      return s.exists() ? ({ id: s.id, ...(s.data() as Omit<Org, 'id'>) }) : null;
    }));
    cb(orgs.filter((o): o is Org => o !== null));
  });
}

export async function getOrg(orgId: string): Promise<Org | null> {
  const s = await getDoc(doc(db, 'orgs', orgId));
  return s.exists() ? ({ id: s.id, ...(s.data() as Omit<Org, 'id'>) }) : null;
}

// ── 예산 세목 ────────────────────────────────────────────
export function watchBudgetItems(orgId: string, cb: (items: BudgetItemDoc[]) => void) {
  const q = query(collection(db, 'orgs', orgId, 'budgetItems'), orderBy('createdAt', 'asc'));
  return onSnapshot(q, snap => {
    cb(snap.docs.map(d => ({ id: d.id, ...(d.data() as Omit<BudgetItemDoc, 'id'>) })));
  });
}

export async function addBudgetItem(orgId: string, item: BudgetItem): Promise<string> {
  const ref = doc(collection(db, 'orgs', orgId, 'budgetItems'));
  const now = new Date().toISOString();
  await setDoc(ref, { ...item, orgId, createdAt: now, updatedAt: now });
  return ref.id;
}

export async function addBudgetItemsBulk(orgId: string, items: BudgetItem[]): Promise<void> {
  const now = new Date().toISOString();
  await Promise.all(items.map(item => {
    const ref = doc(collection(db, 'orgs', orgId, 'budgetItems'));
    return setDoc(ref, { ...item, orgId, createdAt: now, updatedAt: now });
  }));
}

export async function updateBudgetItem(orgId: string, itemId: string, patch: Partial<BudgetItem>): Promise<void> {
  await setDoc(doc(db, 'orgs', orgId, 'budgetItems', itemId), { ...patch, updatedAt: new Date().toISOString() }, { merge: true });
}

export async function deleteBudgetItem(orgId: string, itemId: string): Promise<void> {
  await deleteDoc(doc(db, 'orgs', orgId, 'budgetItems', itemId));
}

// ── 증빙 파일 ────────────────────────────────────────────
export function watchEvidenceFiles(orgId: string, itemId: string, cb: (files: EvidenceFileDoc[]) => void) {
  const q = query(collection(db, 'orgs', orgId, 'budgetItems', itemId, 'evidenceFiles'), orderBy('uploadedAt', 'asc'));
  return onSnapshot(q, snap => {
    cb(snap.docs.map(d => ({ id: d.id, ...(d.data() as Omit<EvidenceFileDoc, 'id'>) })));
  });
}

export async function uploadEvidenceFile(
  orgId: string, itemId: string, file: File, docType: string, uploadedBy: string, memo?: string,
): Promise<string> {
  const fileRef = doc(collection(db, 'orgs', orgId, 'budgetItems', itemId, 'evidenceFiles'));
  const storagePath = `receipts/${orgId}/${itemId}/${fileRef.id}_${file.name}`;
  const sRef = ref(storage, storagePath);
  await uploadBytes(sRef, file);
  const downloadUrl = await getDownloadURL(sRef);
  const now = new Date().toISOString();
  await setDoc(fileRef, {
    docType, fileName: file.name, storagePath, downloadUrl, uploadedBy, uploadedAt: now, memo: memo ?? '',
  });
  return fileRef.id;
}

export async function deleteEvidenceFile(orgId: string, itemId: string, file: EvidenceFileDoc): Promise<void> {
  await deleteObject(ref(storage, file.storagePath)).catch(() => {});
  await deleteDoc(doc(db, 'orgs', orgId, 'budgetItems', itemId, 'evidenceFiles', file.id));
}

// ── 전체 세목 일괄 조회 (대시보드 완료율 계산용) ──────────────
export async function getAllEvidenceDocTypes(orgId: string, itemId: string): Promise<string[]> {
  const snap = await getDocs(collection(db, 'orgs', orgId, 'budgetItems', itemId, 'evidenceFiles'));
  return snap.docs.map(d => (d.data() as EvidenceFileDoc).docType);
}
