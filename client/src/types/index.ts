export interface User {
  id: string;
  email: string;
  name: string;
  phone?: string | null;
  role: 'admin' | 'staff' | 'auditor' | 'agent' | string;
  agent_id?: string | null;
  user_type_id?: string | null;
  status: 'active' | 'inactive';
  user_type?: UserType;
  permissions?: string[];
  agent?: Agent;
}

export interface UserType {
  id: string;
  name: string;
  description?: string | null;
  permissions: string[];
  is_system?: boolean;
}

export interface CustomerDocument {
  id: string;
  customer_id: string;
  label: string;
  document_type?: string | null;
  owner_name?: string | null;
  file_url: string;
  expiry_date?: string | null;
  issue_date?: string | null;
  document_number?: string | null;
  notes?: string | null;
  created_at: string;
}

export interface Customer {
  id: string;
  name: string;
  company_name?: string | null;
  trn?: string | null;
  email?: string | null;
  mobile?: string | null;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  country?: string | null;
  contact_person?: string | null;
  filing_cycle: 'Jan-Apr-Jul-Oct' | 'Feb-May-Aug-Nov' | 'Mar-Jun-Sep-Dec' | string;
  agent_id?: string | null;
  trade_license_number?: string | null;
  trade_license_expiry?: string | null;
  trade_license_url?: string | null;
  portal_username?: string | null;
  status: 'active' | 'inactive';
  created_at: string;
  agent?: Agent | null;
  documents?: CustomerDocument[];
  filings?: Filing[];
  milestones?: FilingMilestone[];
  invoices?: Invoice[];
  funds?: CustomerFund[];
  payments?: Payment[];
  commissions?: Commission[];
  ledger_entries?: LedgerEntry[];
  available_fund_balance?: number;
  _count?: {
    filings?: number;
    invoices?: number;
    documents?: number;
  };
}

export interface FilingMilestone {
  id: string;
  customer_id: string;
  month_key: string; // e.g. "2026-01"
  year: number;
  status: 'pending' | 'in_progress' | 'filed' | 'overdue' | string;
  filed_date?: string | null;
  notes?: string | null;
}

export interface Filing {
  id: string;
  customer_id: string;
  filing_month: string;
  period_start: string;
  period_end: string;
  filing_date?: string | null;
  due_date?: string | null;
  sales_amount: number;
  sales_vat: number;
  expenses_amount: number;
  expenses_vat: number;
  other_expenses?: Array<{ label: string; amount: number }> | null;
  net_vat_payable: number;
  vat_inclusive: boolean;
  status: 'draft' | 'filed' | 'pending_payment' | 'overdue' | string;
  notes?: string | null;
  file_url?: string | null;
  created_at: string;
  customer?: Customer;
}

export interface ProductService {
  id: string;
  name: string;
  code?: string | null;
  type?: 'product' | 'service';
  category?: string | null;
  price: number;
  vat_rate: number;
  description?: string | null;
  status?: 'active' | 'inactive';
}

export interface InvoiceItem {
  id?: string;
  product_service_id?: string | null;
  description: string;
  quantity: number;
  unit_price: number;
  discount: number;
  vat_rate: number;
  vat_amount: number;
  total: number;
  product_service?: ProductService | null;
}

export interface Invoice {
  id: string;
  invoice_number: string;
  customer_id: string;
  invoice_date: string;
  due_date?: string | null;
  status: 'draft' | 'credit' | 'partially_paid' | 'paid' | 'cancelled' | string;
  cancellation_reason?: string | null;
  type?: 'standard' | 'credit' | 'receipt' | 'proforma' | string;
  currency: string;
  subtotal: number;
  vat_rate?: number;
  vat_amount?: number;
  vat_total?: number;
  discount_amount?: number;
  total: number;
  paid_amount: number;
  balance_due: number;
  notes?: string | null;
  terms_and_conditions?: string | null;
  created_at: string;
  customer?: Customer;
  items?: InvoiceItem[];
  payments?: Payment[];
}

export interface Payment {
  id: string;
  invoice_id?: string | null;
  customer_id: string;
  amount: number;
  payment_date: string;
  payment_method: 'bank_transfer' | 'cash' | 'cheque' | 'card' | 'customer_fund' | string;
  wallet_id?: string | null;
  reference_number?: string | null;
  notes?: string | null;
  from_fund: boolean;
  invoice?: Invoice | null;
  customer?: Customer | null;
  wallet?: Wallet | null;
}

export interface CustomerFund {
  id: string;
  customer_id: string;
  amount: number;
  payment_date: string;
  payment_method: string;
  wallet_id?: string | null;
  reference_number?: string | null;
  notes?: string | null;
  status: 'available' | 'utilized' | string;
  customer?: Customer;
  wallet?: Wallet;
}

export interface Wallet {
  id: string;
  name: string;
  bank_name?: string | null;
  currency: string;
  account_number?: string | null;
  iban?: string | null;
  balance: number;
  status: 'active' | 'inactive';
  notes?: string | null;
  payments?: Payment[];
  funds?: CustomerFund[];
  _count?: {
    payments?: number;
    funds?: number;
  };
}

export interface Agent {
  id: string;
  user_id?: string | null;
  name: string;
  email?: string | null;
  phone?: string | null;
  commission_type?: 'percentage' | 'flat' | string;
  commission_rate: number;
  status?: 'active' | 'inactive';
  notes?: string | null;
  user?: User | null;
  customers?: Customer[];
  commissions?: Commission[];
  stats?: {
    totalEarned: number;
    pendingApproval: number;
    approved: number;
    released: number;
    totalCustomers?: number;
  };
}

export interface Commission {
  id: string;
  agent_id: string;
  customer_id?: string | null;
  invoice_id?: string | null;
  amount: number;
  status: 'pending_approval' | 'approved' | 'released' | string;
  date: string;
  is_advance: boolean;
  notes?: string | null;
  approved_at?: string | null;
  released_at?: string | null;
  agent?: Agent;
  customer?: Customer;
  invoice?: Invoice;
}

export interface LedgerEntry {
  id: string;
  customer_id?: string | null;
  transaction_type: string;
  debit_account: string;
  credit_account: string;
  debit_amount: number;
  credit_amount: number;
  reference_id?: string | null;
  reference_type?: string | null;
  description?: string | null;
  date: string;
  customer?: Customer;
}

export interface CompanySettings {
  id?: string;
  name?: string;
  company_name?: string;
  legal_name?: string | null;
  address?: string | null;
  city?: string | null;
  country?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  trn?: string | null;
  logo_url?: string | null;
  vat_enabled?: boolean;
  vat_rate?: number;
  invoice_prefix?: string;
  invoice_notes?: string | null;
  invoice_terms?: string | null;
  invoice_footer_notes?: string | null;
  invoice_payment_terms?: string | null;
  invoice_terms_conditions?: string | null;
  bank_name?: string | null;
  bank_account_name?: string | null;
  bank_account_number?: string | null;
  account_number?: string | null;
  iban?: string | null;
  swift_code?: string | null;
  bank_iban?: string | null;
  custom_field_1_label?: string | null;
  custom_field_2_label?: string | null;
  auto_sync_tracker_to_filing?: boolean;
  allow_edit_filed_filings?: boolean;
}

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
  errors?: any;
}
