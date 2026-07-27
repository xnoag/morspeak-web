'use client';
import { useEffect, useState } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { auth } from './firebase';
import { watchUserMemberships, type Org } from './receipts';

export function useReceiptSession() {
  const [user, setUser] = useState<User | null | undefined>(undefined); // undefined = 로딩중
  const [orgs, setOrgs] = useState<Org[] | undefined>(undefined);

  useEffect(() => onAuthStateChanged(auth, u => setUser(u)), []);

  useEffect(() => {
    if (!user) return;
    return watchUserMemberships(user.uid, setOrgs);
  }, [user]);

  const resolvedOrgs = user ? (orgs ?? []) : [];
  return {
    userLoading: user === undefined,
    user: user ?? null,
    orgsLoading: user != null && orgs === undefined,
    orgs: resolvedOrgs,
    org: resolvedOrgs[0] ?? null,
  };
}
