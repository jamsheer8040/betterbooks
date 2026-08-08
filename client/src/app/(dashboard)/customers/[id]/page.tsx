'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { Header } from '@/components/Header';
import { Customer, CustomerDocument, Invoice } from '@/types';
import { api } from '@/lib/api';
import { CustomerModal } from '@/components/CustomerModal';
import { InvoiceModal } from '@/components/InvoiceModal';
import { CustomerFundModal } from '@/components/CustomerFundModal';
import { PaymentModal } from '@/components/PaymentModal';
import { generateInvoicePDF } from '@/utils/invoiceTemplates';
import { useAuth } from '@/lib/auth-context';
import {
  Building2,
  Phone,
  Mail,
  MapPin,
  Calendar,
  FileText,
  Receipt,
  PiggyBank,
  Clock,
  Plus,
  Upload,
  Trash2,
  Download,
  ExternalLink,
  ChevronLeft,
  CheckCircle2,
  AlertCircle,
  CreditCard,
  BookOpen,
} from 'lucide-react';

export default function CustomerDetailPage() {
  const params = useParams();
  const customerId = (params?.id as string) || '';
  const router = useRouter();
  const { companySettings } = useAuth();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'invoices' | 'documents' | 'filings' | 'funds' | 'ledger'>('invoices');

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [isFundModalOpen, setIsFundModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  // New Document Upload State
  const [docLabel, setDocLabel] = useState('');
  const [docType, setDocType] = useState('Passport');
  const [docExpiry, setDocExpiry] = useState('');
  const [docOwner, setDocOwner] = useState('');
  const [docFile, setDocFile] = useState<File | null>(null);
  const [docUploading, setDocUploading] = useState(false);

  const fetchCustomer = async () => {
    if (!customerId) return;
    setLoading(true);
    try {
      const res = await api.customers.get(customerId);
      if (res.data) setCustomer(res.data);
    } catch (e) {
      console.error('Failed to load customer:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomer();
  }, [customerId]);

  const handleAddDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docFile || !docLabel || !customerId) return;

    setDocUploading(true);
    try {
      const uploadRes = await api.upload(docFile);
      if (uploadRes.data?.fileUrl) {
        await api.customers.addDocument(customerId, {
          label: docLabel,
          document_type: docType,
          owner_name: docOwner || null,
          file_url: uploadRes.data.fileUrl,
          expiry_date: docExpiry || null,
        });

        // Reset form
        setDocLabel('');
        setDocExpiry('');
        setDocOwner('');
        setDocFile(null);
        fetchCustomer();
      }
    } catch (e) {
      console.error('Failed to upload document:', e);
    } finally {
      setDocUploading(false);
    }
  };

  const handleDeleteDocument = async (docId: string) => {
    if (!confirm('Are you sure you want to delete this document?')) return;
    try {
      await api.customers.deleteDocument(customerId, docId);
      fetchCustomer();
    } catch (e) {
      console.error('Failed to delete document:', e);
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-xs text-slate-400">
        Loading customer record...
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="p-8 text-center space-y-3">
        <p className="text-sm font-semibold text-slate-700">Customer record not found</p>
        <Link href="/customers" className="text-xs text-blue-600 font-medium">
          &larr; Return to Customer Directory
        </Link>
      </div>
    );
  }

  return (
    <>
      <Header title={customer.name} subtitle={customer.company_name || 'Customer Profile'}>
        <div className="flex items-center gap-2">
          <Link
            href="/customers"
            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-slate-600 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl shadow-xs transition"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            Back
          </Link>
          <button
            onClick={() => setIsEditModalOpen(true)}
            className="px-3.5 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition"
          >
            Edit Profile
          </button>
        </div>
      </Header>

      <div className="p-8 space-y-6">
        {/* Top Info Banner */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs">
            <span className="text-[11px] font-semibold text-slate-400 uppercase">Tax Registration (TRN)</span>
            <div className="text-base font-bold text-slate-900 font-mono mt-1">
              {customer.trn || 'Not Registered'}
            </div>
            <p className="text-xs text-slate-500 mt-1">Cycle: {customer.filing_cycle}</p>
          </div>

          <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs">
            <span className="text-[11px] font-semibold text-slate-400 uppercase">Advance Fund Balance</span>
            <div className="text-base font-bold text-emerald-600 mt-1">
              AED {(customer.available_fund_balance || 0).toFixed(2)}
            </div>
            <button
              onClick={() => setIsFundModalOpen(true)}
              className="text-xs font-semibold text-blue-600 hover:underline mt-1 block"
            >
              + Deposit Funds
            </button>
          </div>

          <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs">
            <span className="text-[11px] font-semibold text-slate-400 uppercase">Trade License Expiry</span>
            <div className="text-base font-bold text-slate-900 mt-1">
              {customer.trade_license_expiry ? customer.trade_license_expiry.split('T')[0] : 'Not specified'}
            </div>
            <p className="text-xs text-slate-500 mt-1">{customer.trade_license_number || 'No License #'}</p>
          </div>

          <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs">
            <span className="text-[11px] font-semibold text-slate-400 uppercase">Assigned Agent</span>
            <div className="text-base font-bold text-purple-700 mt-1">
              {customer.agent?.name || 'Direct Client'}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {customer.agent ? `${customer.agent.commission_rate}% commission` : 'No commissions'}
            </p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 gap-6 text-xs font-semibold">
          {[
            { key: 'invoices', label: 'Invoices & Billing', count: customer.invoices?.length },
            { key: 'documents', label: 'Documents & Passports', count: customer.documents?.length },
            { key: 'filings', label: 'VAT Filings', count: customer.filings?.length },
            { key: 'funds', label: 'Advance Deposits', count: customer.funds?.length },
            { key: 'ledger', label: 'General Ledger Entries', count: customer.ledger_entries?.length },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`pb-3 relative transition flex items-center gap-1.5 ${
                activeTab === tab.key
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-slate-100 text-slate-600">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Tab 1: Invoices */}
        {activeTab === 'invoices' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-bold text-slate-800">Invoices & Statements</h3>
              <button
                onClick={() => setIsInvoiceModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition"
              >
                <Plus className="w-3.5 h-3.5" />
                Issue New Invoice
              </button>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                    <th className="py-3 px-4">Invoice #</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Total (AED)</th>
                    <th className="py-3 px-4">Balance Due (AED)</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(customer.invoices || []).map((inv) => (
                    <tr key={inv.id} className="hover:bg-slate-50/70">
                      <td className="py-3 px-4 font-bold text-slate-900">{inv.invoice_number}</td>
                      <td className="py-3 px-4 text-slate-600">
                        {new Date(inv.invoice_date).toLocaleDateString('en-GB')}
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-800">{inv.total.toFixed(2)}</td>
                      <td className="py-3 px-4 font-semibold text-blue-600">{inv.balance_due.toFixed(2)}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold capitalize ${
                            inv.status === 'paid'
                              ? 'bg-emerald-50 text-emerald-700'
                              : inv.status === 'partially_paid'
                              ? 'bg-blue-50 text-blue-700'
                              : inv.status === 'cancelled'
                              ? 'bg-rose-50 text-rose-700'
                              : 'bg-amber-50 text-amber-700'
                          }`}
                        >
                          {inv.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right space-x-2">
                        {inv.balance_due > 0 && inv.status !== 'cancelled' && (
                          <button
                            onClick={() => {
                              setSelectedInvoice(inv);
                              setIsPaymentModalOpen(true);
                            }}
                            className="px-2.5 py-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition"
                          >
                            Pay
                          </button>
                        )}
                        <button
                          onClick={() => generateInvoicePDF(inv, companySettings)}
                          className="px-2.5 py-1 text-[11px] font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
                        >
                          Download PDF
                        </button>
                      </td>
                    </tr>
                  ))}
                  {(!customer.invoices || customer.invoices.length === 0) && (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400">
                        No invoices issued for this customer.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 2: Documents Vault */}
        {activeTab === 'documents' && (
          <div className="space-y-6">
            {/* Upload Document Box */}
            <form onSubmit={handleAddDocument} className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-3">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Upload New Document</h4>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Document Label *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Director Passport"
                    value={docLabel}
                    onChange={(e) => setDocLabel(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Document Type</label>
                  <select
                    value={docType}
                    onChange={(e) => setDocType(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl"
                  >
                    <option value="Passport">Passport</option>
                    <option value="Emirates ID">Emirates ID</option>
                    <option value="Trade License">Trade License</option>
                    <option value="Tax Certificate">Tax Certificate (TRN)</option>
                    <option value="Tenancy Contract">Tenancy Contract (Ejari)</option>
                    <option value="Other">Other Document</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Expiry Date</label>
                  <input
                    type="date"
                    value={docExpiry}
                    onChange={(e) => setDocExpiry(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">File Attachment *</label>
                  <input
                    type="file"
                    required
                    onChange={(e) => setDocFile(e.target.files?.[0] || null)}
                    className="w-full text-xs text-slate-500 file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={docUploading}
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition disabled:opacity-50"
                >
                  {docUploading ? 'Uploading...' : 'Save Document to Vault'}
                </button>
              </div>
            </form>

            {/* Documents List */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {(customer.documents || []).map((doc) => (
                <div
                  key={doc.id}
                  className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between">
                      <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                        <FileText className="w-4 h-4" />
                      </div>
                      <button
                        onClick={() => handleDeleteDocument(doc.id)}
                        className="text-slate-400 hover:text-rose-600 p-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <h4 className="text-sm font-bold text-slate-900 mt-2">{doc.label}</h4>
                    <p className="text-xs text-slate-500">{doc.document_type || 'Document'}</p>
                    {doc.expiry_date && (
                      <p className="text-xs text-slate-600 mt-2">
                        Expires: <span className="font-semibold">{doc.expiry_date.split('T')[0]}</span>
                      </p>
                    )}
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-100 flex justify-between items-center">
                    <span className="text-[10px] text-slate-400">
                      Uploaded {new Date(doc.created_at).toLocaleDateString()}
                    </span>
                    <a
                      href={doc.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-semibold text-blue-600 hover:underline inline-flex items-center gap-1"
                    >
                      <span>View File</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              ))}
              {(!customer.documents || customer.documents.length === 0) && (
                <div className="col-span-full py-8 text-center text-xs text-slate-400">
                  No documents attached to this customer yet.
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 3: Filings */}
        {activeTab === 'filings' && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <th className="py-3 px-4">Period Month</th>
                  <th className="py-3 px-4">Period Range</th>
                  <th className="py-3 px-4">Sales VAT (AED)</th>
                  <th className="py-3 px-4">Expenses VAT (AED)</th>
                  <th className="py-3 px-4">Net VAT Payable</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(customer.filings || []).map((f) => (
                  <tr key={f.id} className="hover:bg-slate-50/70">
                    <td className="py-3 px-4 font-bold text-slate-900">{f.filing_month}</td>
                    <td className="py-3 px-4 text-slate-600">
                      {new Date(f.period_start).toLocaleDateString()} – {new Date(f.period_end).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-800">{f.sales_vat.toFixed(2)}</td>
                    <td className="py-3 px-4 font-semibold text-slate-800">{f.expenses_vat.toFixed(2)}</td>
                    <td className="py-3 px-4 font-bold text-blue-600">{f.net_vat_payable.toFixed(2)}</td>
                    <td className="py-3 px-4">
                      <span className="inline-block px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 capitalize">
                        {f.status}
                      </span>
                    </td>
                  </tr>
                ))}
                {(!customer.filings || customer.filings.length === 0) && (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">
                      No VAT returns recorded for this customer yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 4: Advance Funds */}
        {activeTab === 'funds' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-bold text-slate-800">Customer Advance Fund Deposits</h3>
              <button
                onClick={() => setIsFundModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition"
              >
                <Plus className="w-3.5 h-3.5" />
                Deposit Funds
              </button>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Deposit Amount</th>
                    <th className="py-3 px-4">Method</th>
                    <th className="py-3 px-4">Reference</th>
                    <th className="py-3 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(customer.funds || []).map((f) => (
                    <tr key={f.id} className="hover:bg-slate-50/70">
                      <td className="py-3 px-4 text-slate-600">
                        {new Date(f.payment_date).toLocaleDateString('en-GB')}
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-900">AED {f.amount.toFixed(2)}</td>
                      <td className="py-3 px-4 capitalize text-slate-700">{f.payment_method.replace('_', ' ')}</td>
                      <td className="py-3 px-4 font-mono text-slate-500">{f.reference_number || '-'}</td>
                      <td className="py-3 px-4">
                        <span className="inline-block px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 capitalize">
                          {f.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {(!customer.funds || customer.funds.length === 0) && (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-400">
                        No advance funds deposited yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 5: General Ledger */}
        {activeTab === 'ledger' && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Debit Account</th>
                  <th className="py-3 px-4">Credit Account</th>
                  <th className="py-3 px-4">Debit (AED)</th>
                  <th className="py-3 px-4">Credit (AED)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(customer.ledger_entries || []).map((e) => (
                  <tr key={e.id} className="hover:bg-slate-50/70">
                    <td className="py-3 px-4 text-slate-600">
                      {new Date(e.date).toLocaleDateString('en-GB')}
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-800 capitalize">
                      {e.transaction_type.replace('_', ' ')}
                    </td>
                    <td className="py-3 px-4 text-slate-700">{e.debit_account}</td>
                    <td className="py-3 px-4 text-slate-700">{e.credit_account}</td>
                    <td className="py-3 px-4 font-semibold text-slate-900">{e.debit_amount.toFixed(2)}</td>
                    <td className="py-3 px-4 font-semibold text-slate-900">{e.credit_amount.toFixed(2)}</td>
                  </tr>
                ))}
                {(!customer.ledger_entries || customer.ledger_entries.length === 0) && (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">
                      No double-entry ledger records for this customer.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modals */}
      <CustomerModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSuccess={fetchCustomer}
        customer={customer}
      />
      <InvoiceModal
        isOpen={isInvoiceModalOpen}
        onClose={() => setIsInvoiceModalOpen(false)}
        onSuccess={fetchCustomer}
        defaultCustomerId={customer.id}
      />
      <CustomerFundModal
        isOpen={isFundModalOpen}
        onClose={() => setIsFundModalOpen(false)}
        onSuccess={fetchCustomer}
        defaultCustomerId={customer.id}
      />
      <PaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => {
          setIsPaymentModalOpen(false);
          setSelectedInvoice(null);
        }}
        onSuccess={fetchCustomer}
        invoice={selectedInvoice}
      />
    </>
  );
}
