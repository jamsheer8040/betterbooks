// Central catalog of all permissions in the app, grouped by module.
// Each permission has a stable `key` used everywhere for checks.
export const PERMISSION_GROUPS = [
  {
    module: 'Customers',
    permissions: [
      { key: 'customers.view', label: 'View customers' },
      { key: 'customers.create', label: 'Create customers' },
      { key: 'customers.edit', label: 'Edit customers' },
      { key: 'customers.delete', label: 'Delete customers' },
    ],
  },
  {
    module: 'Filings',
    permissions: [
      { key: 'filings.view', label: 'View filings' },
      { key: 'filings.create', label: 'Create filings' },
      { key: 'filings.edit', label: 'Edit filings' },
      { key: 'filings.delete', label: 'Delete filings' },
    ],
  },
  {
    module: 'Invoices',
    permissions: [
      { key: 'invoices.view', label: 'View invoices' },
      { key: 'invoices.create', label: 'Create invoices' },
      { key: 'invoices.edit', label: 'Edit invoices' },
      { key: 'invoices.delete', label: 'Delete invoices' },
    ],
  },
  {
    module: 'Agents & Commissions',
    permissions: [
      { key: 'agents.view', label: 'View agents' },
      { key: 'agents.manage', label: 'Manage agents' },
      { key: 'commissions.view', label: 'View commissions' },
      { key: 'commissions.manage', label: 'Approve / release commissions' },
    ],
  },
  {
    module: 'Finance',
    permissions: [
      { key: 'wallets.view', label: 'View wallets' },
      { key: 'wallets.manage', label: 'Manage wallets' },
      { key: 'products.manage', label: 'Manage products & services' },
    ],
  },
  {
    module: 'Administration',
    permissions: [
      { key: 'users.manage', label: 'Manage users & roles' },
      { key: 'company.manage', label: 'Manage company settings' },
      { key: 'reports.view', label: 'View reports & dashboard' },
    ],
  },
];

export const ALL_PERMISSION_KEYS = PERMISSION_GROUPS.flatMap(g => g.permissions.map(p => p.key));

export function getPermissionLabel(key) {
  for (const g of PERMISSION_GROUPS) {
    const p = g.permissions.find(x => x.key === key);
    if (p) return p.label;
  }
  return key;
}

// Compute the effective permission set for a user profile given the available types.
// Base permissions come from the assigned UserType; per-user overrides win.
export function getEffectivePermissions(profile, userType) {
  const base = new Set(userType?.permissions || []);
  const overrides = profile?.permission_overrides || {};
  for (const [key, enabled] of Object.entries(overrides)) {
    if (enabled) base.add(key);
    else base.delete(key);
  }
  return base;
}

// Is a single permission effective (after overrides)?
export function isPermissionEffective(key, userType, overrides = {}) {
  if (key in overrides) return !!overrides[key];
  return (userType?.permissions || []).includes(key);
}