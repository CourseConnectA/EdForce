export type NormalizedRole = 'super-admin' | 'center-manager' | 'counselor';

export function normalizeRole(input: any, isAdmin?: boolean): NormalizedRole | '' {
  // Admin flag takes precedence regardless of any stored role label
  if (isAdmin) return 'super-admin';
  const raw = String(input || '').toLowerCase().trim();
  if (!raw) return '';
  const base = raw.replace(/[_\s]+/g, '-').replace(/centre/g, 'center');

  if (base === 'admin' || base === 'superadmin' || base.includes('super-admin')) return 'super-admin';
  if (base === 'manager' || base === 'cm' || base.includes('center-manager') || base.includes('centre-manager') || base.includes('manager')) return 'center-manager';
  if (base === 'counselor' || base === 'counsellor' || base.includes('counsel') || base.includes('sales-coordinator') || base.includes('agent')) return 'counselor';
  return '';
}
