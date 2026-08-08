export interface PermissionItem {
  key: string;
  name: string;
  description: string;
}

export interface PermissionModule {
  name: string;
  description: string;
  permissions: PermissionItem[];
}

export const PERMISSION_MODULES: Record<string, PermissionModule> = {
  customers: {
    name: 'Customer Management',
    description: 'View, add, edit, and manage customer records and documents',
    permissions: [
      { key: 'customers.view', name: 'View Customers', description: 'View customer directory and details' },
      { key: 'customers.create', name: 'Add Customers', description: 'Create new customer accounts' },
      { key: 'customers.edit', name: 'Edit Customers', description: 'Update customer details and documents' },
      { key: 'customers.delete', name: 'Delete Customers', description: 'Remove customer records' },
    ],
  },
  filings: {
    name: 'VAT & Tax Filings',
    description: 'Track and manage VAT returns, periods, and submissions',
    permissions: [
      { key: 'filings.view', name: 'View Filings', description: 'View filings list and tracker matrix' },
      { key: 'filings.create', name: 'Create Filings', description: 'Create new filing returns' },
      { key: 'filings.edit', name: 'Update Filings', description: 'Edit return numbers, milestones, and notes' },
      { key: 'filings.delete', name: 'Delete Filings', description: 'Remove filing records' },
    ],
  },
  invoices: {
    name: 'Invoices & Billing',
    description: 'Create and manage invoices, receipts, and payments',
    permissions: [
      { key: 'invoices.view', name: 'View Invoices', description: 'View invoice list and statements' },
      { key: 'invoices.create', name: 'Create Invoices', description: 'Generate new invoices and proformas' },
      { key: 'invoices.edit', name: 'Edit / Pay Invoices', description: 'Record payments, edit, and cancel invoices' },
      { key: 'invoices.delete', name: 'Delete Invoices', description: 'Remove invoice records' },
    ],
  },
  agents: {
    name: 'Agents & Commissions',
    description: 'Manage sales agents and commission approvals',
    permissions: [
      { key: 'agents.view', name: 'View Agents', description: 'View agent list and stats' },
      { key: 'agents.manage', name: 'Manage Agents', description: 'Add and edit agent profiles' },
      { key: 'commissions.view', name: 'View Commissions', description: 'View commission records' },
      { key: 'commissions.manage', name: 'Approve & Release Commissions', description: 'Change commission status' },
    ],
  },
  finance: {
    name: 'Finance & Wallets',
    description: 'Bank wallets, chart of accounts, and master catalog',
    permissions: [
      { key: 'wallets.view', name: 'View Wallets', description: 'View bank accounts and balances' },
      { key: 'wallets.manage', name: 'Manage Wallets', description: 'Add/edit bank accounts and cash wallets' },
      { key: 'products.manage', name: 'Manage Products & Services', description: 'Add/edit item catalog' },
      { key: 'reports.view', name: 'View Financial Reports', description: 'Access general ledger and summaries' },
    ],
  },
  admin: {
    name: 'Administration',
    description: 'User access management and company setup',
    permissions: [
      { key: 'users.manage', name: 'Manage Users & Roles', description: 'Create staff users and edit permissions' },
      { key: 'company.manage', name: 'Company Setup', description: 'Modify company profile and invoice branding' },
    ],
  },
};

export const ALL_PERMISSION_KEYS = Object.values(PERMISSION_MODULES).flatMap((m) =>
  m.permissions.map((p) => p.key)
);

export function hasPermission(user: any, permissionKey: string): boolean {
  if (!user) return false;
  if (user.role === 'admin') return true;
  if (Array.isArray(user.permissions)) {
    return user.permissions.includes(permissionKey);
  }
  return false;
}
