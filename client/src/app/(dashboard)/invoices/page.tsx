'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Header } from '@/components/Header';
import { Invoice } from '@/types';
import { api } from '@/lib/api';
import { InvoiceModal } from '@/components/InvoiceModal';
import { PaymentModal } from '@/components/PaymentModal';
import { generateInvoicePDF } from '@/utils/invoiceTemplates';
import { useAuth } from '@/lib/auth-context';
import { exportToCSV } from '@/utils/exportToExcel';
import {
  Receipt,
  Plus,
  Search,
  Download,
  CreditCard,
  CheckCircle2,
  Clock,
  Ban,
  FileText,
  DollarSign,
} from 'lucide-react';

export default function InvoicesPage() {
  const { companySettings } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const res = await api.invoices.list();
      if (res.data) setInvoices(res.data);
    } catch (e) {
      console.error('Failed to load invoices:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

  const filteredInvoices = invoices.filter((inv) => {
    const matchesStatus = !statusFilter || inv.status === statusFilter;
    const matchesSearch =
      !search ||
      inv.invoice_number?.toLowerCase().includes(search.toLowerCase()) ||
      inv.customer?.name?.toLowerCase().includes(search.toLowerCase()) ||
      inv.customer?.trn?.includes(search);
    return matchesStatus && matchesSearch;
  });

  const totalInvoiced = invoices.reduce((sum, inv) => sum + (inv.status !== 'cancelled' ? inv.total : 0), 0);
  const totalBalanceDue = invoices.reduce(
    (sum, inv) => sum + (inv.status !== 'cancelled' ? inv.balance_due : 0),
    0
  );
  const totalPaid = invoices.reduce(
    (sum, inv) => sum + (inv.status !== 'cancelled' ? inv.total - inv.balance_due : 0),
    0
  );

  const handleExport = () => {
    const exportData = filteredInvoices.map((i) => ({
      'Invoice #': i.invoice_number,
      'Customer': i.customer?.name || '',
      'Date': i.invoice_date.split('T')[0],
      'Due Date': i.due_date ? i.due_date.split('T')[0] : '',
      'Subtotal': i.subtotal,
      'VAT Total': i.vat_total || i.vat_amount || 0,
      'Total': i.total,
      'Balance Due': i.balance_due,
      'Status': i.status,
    }));
    exportToCSV(exportData, 'Invoices_Register');
  };

  return (
    <>
      <Header title="Invoices & Billing Register" subtitle="Manage VAT invoices, credit notes, receipts, and receivables">
        <div className="flex items-center gap-2">
          <button
            onClick={handleExport}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl shadow-xs transition"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>
          <button
            onClick={() => setIsInvoiceModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition"
          >
            <Plus className="w-4 h-4" />
            Create Invoice
          </button>
        </div>
      </Header>

      <div className="p-8 space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <div className="p-5 bg-white rounded-2xl border border-slate-200/80 shadow-2xs">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Invoiced</span>
            <div className="text-2xl font-bold text-slate-900 mt-2">
              AED {totalInvoiced.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-slate-400 mt-0.5">{invoices.length} invoices generated</p>
          </div>

          <div className="p-5 bg-white rounded-2xl border border-slate-200/80 shadow-2xs">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Collected Payments</span>
            <div className="text-2xl font-bold text-emerald-600 mt-2">
              AED {totalPaid.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-slate-400 mt-0.5">Deposited into wallets</p>
          </div>

          <div className="p-5 bg-white rounded-2xl border border-slate-200/80 shadow-2xs">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Pending Receivables</span>
            <div className="text-2xl font-bold text-blue-600 mt-2">
              AED {totalBalanceDue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-slate-400 mt-0.5">Outstanding client balances</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Search by invoice #, customer name, or TRN..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center gap-3">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-medium"
            >
              <option value="">All Statuses</option>
              <option value="draft">Draft</option>
              <option value="sent">Sent / Unpaid</option>
              <option value="partially_paid">Partially Paid</option>
              <option value="paid">Paid</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>

        {/* Invoices Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <th className="py-3.5 px-6">Invoice #</th>
                  <th className="py-3.5 px-4">Customer</th>
                  <th className="py-3.5 px-4">Issue Date</th>
                  <th className="py-3.5 px-4">Due Date</th>
                  <th className="py-3.5 px-4">Total (AED)</th>
                  <th className="py-3.5 px-4">Balance Due</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredInvoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-4 px-6 font-bold text-slate-900">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-blue-600" />
                        <span>{inv.invoice_number}</span>
                      </div>
                    </td>

                    <td className="py-4 px-4">
                      <Link
                        href={`/customers/${inv.customer_id}`}
                        className="font-bold text-slate-900 hover:text-blue-600 transition"
                      >
                        {inv.customer?.name}
                      </Link>
                      {inv.customer?.trn && (
                        <div className="text-[11px] text-slate-400 font-mono">TRN: {inv.customer.trn}</div>
                      )}
                    </td>

                    <td className="py-4 px-4 text-slate-600">
                      {new Date(inv.invoice_date).toLocaleDateString('en-GB')}
                    </td>

                    <td className="py-4 px-4 text-slate-600">
                      {inv.due_date ? new Date(inv.due_date).toLocaleDateString('en-GB') : '-'}
                    </td>

                    <td className="py-4 px-4 font-bold text-slate-900">AED {inv.total.toFixed(2)}</td>

                    <td className="py-4 px-4 font-semibold text-blue-600">
                      AED {inv.balance_due.toFixed(2)}
                    </td>

                    <td className="py-4 px-4">
                      <span
                        className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-semibold capitalize ${
                          inv.status === 'paid'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : inv.status === 'partially_paid'
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : inv.status === 'cancelled'
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}
                      >
                        {inv.status.replace('_', ' ')}
                      </span>
                    </td>

                    <td className="py-4 px-6 text-right space-x-2">
                      {inv.balance_due > 0 && inv.status !== 'cancelled' && (
                        <button
                          onClick={() => {
                            setSelectedInvoice(inv);
                            setIsPaymentModalOpen(true);
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition"
                        >
                          <CreditCard className="w-3 h-3" />
                          Pay
                        </button>
                      )}
                      <button
                        onClick={() => generateInvoicePDF(inv, companySettings)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
                      >
                        <Download className="w-3 h-3" />
                        PDF
                      </button>
                    </td>
                  </tr>
                ))}

                {filteredInvoices.length === 0 && !loading && (
                  <tr>
                    <td colSpan={8} className="py-10 text-center text-xs text-slate-400">
                      No invoices found. Click &quot;Create Invoice&quot; to issue your first bill.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <InvoiceModal
        isOpen={isInvoiceModalOpen}
        onClose={() => setIsInvoiceModalOpen(false)}
        onSuccess={fetchInvoices}
      />

      <PaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => {
          setIsPaymentModalOpen(false);
          setSelectedInvoice(null);
        }}
        onSuccess={fetchInvoices}
        invoice={selectedInvoice}
      />
    </>
  );
}
