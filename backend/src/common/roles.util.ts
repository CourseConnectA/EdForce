export type Role = 'super-admin' | 'center-manager' | 'counselor';

export function normalizeRole(raw: any, isAdmin?: boolean): Role | '' {
  // Prefer explicit role string; fall back to isAdmin
  let r = String(raw || '').trim().toLowerCase();
  if (!r && isAdmin) r = 'super-admin';

  // Unify separators and spelling
  r = r.replace(/[\s_]+/g, '-'); // spaces/underscores -> dashes

  if (r === 'admin' || r === 'superadmin' || r === 'super-admin') return 'super-admin';
  if (r === 'manager' || r === 'centre-manager' || r === 'center-manager') return 'center-manager';
  if (
    r === 'counselor' || r === 'counsellor' || r === 'academic-counsellor' || r === 'sales-coordinator' || r === 'agent'
  )
    return 'counselor';

  // If an unknown but truthy string comes in, try last-mile normalization
  if (r.includes('center') && r.includes('manager')) return 'center-manager';
  if (r.includes('super') && r.includes('admin')) return 'super-admin';
  if (r.includes('counsel')) return 'counselor';

  return '';
}
