'use client';
import { usePathname } from 'next/navigation';
import Dashboard from '@/app/tracking/dashboard/page';

export default function TrackingLayout({ children }: { children: React.ReactNode }) {
  const detail = usePathname().includes('/patients/');
  return <div className={`admin-tracking${detail ? ' detail-open' : ''}`}>
    <div className="admin-tracking-list"><Dashboard/></div>
    {detail && <div className="admin-tracking-detail">{children}</div>}
  </div>;
}
