import { redirect } from 'next/navigation';
import { ADMIN_HOME } from '@/lib/admin-navigation';

export default function AdminHome() { redirect(ADMIN_HOME); }
