import { redirect } from 'next/navigation';
import { ADMIN_HOME } from '@/lib/admin-navigation';
export default function Page() { redirect(ADMIN_HOME); }
