export const ADMIN_HOME = '/admin/workspace/tracking';

const routes: [string, string][] = [
  ['/admin/screening', '/admin/workspace/screening'],
  ['/tracking/dashboard', ADMIN_HOME],
  ['/tracking/patients/', '/admin/workspace/tracking/patients/'],
  ['/tracking/group', '/admin/workspace/group'],
  ['/survey-admin', '/admin/workspace/survey'],
  ['/survey-mindmap', '/admin/workspace/survey-map'],
  ['/schedule/training/admin', '/admin/workspace/training'],
  ['/waitlist/admin', '/admin/workspace/waitlist'],
  ['/review/admin', '/admin/workspace/reviews'],
  ['/admin/inquiries', '/admin/workspace/inquiries'],
];

export function adminPath(path: string) {
  const match = routes.find(([legacy]) => path === legacy || (legacy.endsWith('/') && path.startsWith(legacy)));
  return match ? match[1] + path.slice(match[0].length) : path;
}

export function safeAdminRedirect(value: string | null) {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.includes('\\')) return ADMIN_HOME;
  const pathname = value.split(/[?#]/)[0];
  if (pathname === '/admin/login' || pathname === '/tracking/login') return ADMIN_HOME;
  return ['/admin', '/tracking', '/survey-admin', '/survey-mindmap', '/schedule/training/admin', '/waitlist/admin', '/review/admin']
    .some(prefix => pathname === prefix || pathname.startsWith(prefix + '/')) ? value : ADMIN_HOME;
}
