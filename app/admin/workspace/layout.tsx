import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import AdminWorkspace from '@/components/admin/AdminWorkspace';

export const metadata = { title: 'Morspeak 관리자', robots: { index: false, follow: false } };

export default async function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  // 기존 관리자 세션으로만 진입한다. 클라이언트 문맥 자체는 인증 수단이 아니다.
  if ((await cookies()).get('admin_session')?.value !== 'authenticated') redirect('/admin/login');
  return <AdminWorkspace>{children}</AdminWorkspace>;
}
