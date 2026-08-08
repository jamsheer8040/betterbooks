'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Header } from '@/components/Header';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { CustomerModal } from '@/components/CustomerModal';
import { InvoiceModal } from '@/components/InvoiceModal';
import { CustomerFundModal } from '@/components/CustomerFundModal';
import {
  Users,
  FileCheck,
  Receipt,
  Clock,
  TrendingUp,
  AlertTriangle,
  Plus,
  ArrowRight,
  ShieldAlert,
  Building2,
  DollarSign,
  Wallet,
} from 'lucide-react';

export default function DashboardPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [customers, setCustomers] = useState<any[]>([]);
  const [filings, setFilings] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [wallets, setWallets] = useState<any[]>([]);

  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [isFundModalOpen, setIsFundModalOpen] = useState(false);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [custRes, filingsRes, invRes, walletsRes] = await Promise.all([
        api.customers.list(),
        api.filings.list(),
        api.invoices.list(),
        api.wallets.list(),
      ]);

      if (custRes.data) setCustomers(custRes.data);
      if (filingsRes.data) setFilings(filingsRes.data);
      if (invRes.data) setInvoices(invRes.data);
      if (walletsRes.data) setWallets(walletsRes.data);
    } catch (e) {
      console.error('Error fetching dashboard data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Compute metrics
  const totalCustomers = customers.length;
  const filedReturnsCount = filings.filter((f) => f.status === 'filed').length;
  const pendingFilingsCount = filings.filter((f) => f.status === 'pending_payment' || f.status === 'draft').length;

  const totalInvoiced = invoices.reduce((acc, inv) => acc + (inv.status !== 'cancelled' ? inv.total : 0), 0);
  const totalOutstandingDue = invoices.reduce((acc, inv) => acc + (inv.status !== 'cancelled' ? inv.balance_due : 0), 0);
  const totalBankBalance = wallets.reduce((acc, w) => acc + w.balance, 0);

  // Expiring documents check (< 30 days)
  const expiringDocs: any[] = [];
  const now = new Date();
  customers.forEach((c) => {
    if (c.trade_license_expiry) {
      const expiry = new Date(c.trade_license_expiry);
      const diffDays = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays <= 30) {
        expiringDocs.push({
          customer: c.name,
          customerId: c.id,
          docType: 'Trade License',
          expiryDate: c.trade_license_expiry.split('T')[0],
          daysRemaining: diffDays,
        });
      }
    }
    (c.documents || []).forEach((doc: any) => {
      if (doc.expiry_date) {
        const expiry = new Date(doc.expiry_date);
        const diffDays = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays <= 30) {
          expiringDocs.push({
            customer: c.name,
            customerId: c.id,
            docType: doc.label || 'Document',
            expiryDate: doc.expiry_date.split('T')[0],
            daysRemaining: diffDays,
          });
        }
      }
    });
  });

  return (
    <>
      <Header title="Compliance & Tax Dashboard" subtitle="Overview of UAE VAT filings, customer status, and billing">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsInvoiceModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition"
          >
            <Receipt className="w-3.5 h-3.5" />
            New Invoice
          </button>
          <button
            onClick={() => setIsCustomerModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl shadow-xs transition"
          >
            <Users className="w-3.5 h-3.5" />
            Add Customer
          </button>
        </div>
      </Header>

      <div className="p-8 space-y-6">
        {/* KPI Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Active Customers */}
          <div className="p-5 bg-white rounded-2xl border border-slate-200/80 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Clients</span>
              <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-bold text-slate-900">{totalCustomers}</div>
              <p className="text-xs text-slate-400 mt-0.5">Registered tax entities</p>
            </div>
          </div>

          {/* Filed VAT Returns */}
          <div className="p-5 bg-white rounded-2xl border border-slate-200/80 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Filed Returns</span>
              <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <FileCheck className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-bold text-slate-900">{filedReturnsCount}</div>
              <p className="text-xs text-emerald-600 font-medium mt-0.5">
                {pendingFilingsCount} pending submission
              </p>
            </div>
          </div>

          {/* Outstanding Receivables */}
          <div className="p-5 bg-white rounded-2xl border border-slate-200/80 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Receivables Due</span>
              <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <Receipt className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-bold text-slate-900">
                AED {totalOutstandingDue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Total Invoiced: AED {totalInvoiced.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>

          {/* Bank / Cash Balance */}
          <div className="p-5 bg-white rounded-2xl border border-slate-200/80 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Wallet Balance</span>
              <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                <Wallet className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-bold text-slate-900">
                AED {totalBankBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">{wallets.length} active bank accounts</p>
            </div>
          </div>
        </div>

        {/* Action Center & Document Expiries */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Quick Action Shortcuts */}
          <div className="p-6 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl text-white shadow-lg shadow-blue-500/15 flex flex-col justify-between">
            <div>
              <div className="inline-flex p-2 rounded-xl bg-white/10 backdrop-blur-xs mb-3">
                <Building2 className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-lg font-bold">Quick Compliance Tasks</h3>
              <p className="text-xs text-blue-100 mt-1 leading-relaxed">
                Seamlessly initiate quarterly VAT filings, record advance deposits from clients, or view the 12-month tracker.
              </p>
            </div>

            <div className="mt-6 space-y-2">
              <Link
                href="/filings"
                className="w-full flex items-center justify-between p-3 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold text-white transition backdrop-blur-xs"
              >
                <span>View VAT Return Matrix Tracker</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <button
                onClick={() => setIsFundModalOpen(true)}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold text-white transition backdrop-blur-xs"
              >
                <span>Deposit Customer Advance Fund</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <Link
                href="/document-tracker"
                className="w-full flex items-center justify-between p-3 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold text-white transition backdrop-blur-xs"
              >
                <span>Check Trade License Expiry Kanban</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {/* Urgent Document Expiries Card */}
          <div className="lg:col-span-2 p-6 bg-white rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Document Expirations</h3>
                  <p className="text-xs text-slate-500">Expiring within the next 30 days or overdue</p>
                </div>
              </div>
              <Link
                href="/document-tracker"
                className="text-xs font-semibold text-blue-600 hover:text-blue-700 inline-flex items-center gap-1"
              >
                <span>View All</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="flex-1 overflow-y-auto max-h-64 space-y-2">
              {expiringDocs.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  No documents expiring within the next 30 days. All active!
                </div>
              ) : (
                expiringDocs.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-slate-100/70 border border-slate-200/60 transition"
                  >
                    <div>
                      <h4 className="text-xs font-bold text-slate-800">{item.customer}</h4>
                      <p className="text-[11px] text-slate-500">
                        {item.docType} • Expiry: {item.expiryDate}
                      </p>
                    </div>
                    <div>
                      <span
                        className={`inline-flex px-2.5 py-1 rounded-lg text-[11px] font-bold ${
                          item.daysRemaining < 0
                            ? 'bg-rose-100 text-rose-700 border border-rose-200'
                            : item.daysRemaining <= 7
                            ? 'bg-amber-100 text-amber-700 border border-amber-200'
                            : 'bg-blue-50 text-blue-700'
                        }`}
                      >
                        {item.daysRemaining < 0
                          ? `Expired (${Math.abs(item.daysRemaining)}d ago)`
                          : `${item.daysRemaining} days remaining`}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Recent Invoices & Filings Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Invoices */}
          <div className="p-6 bg-white rounded-2xl border border-slate-200/80 shadow-2xs">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-slate-900">Recent Invoices</h3>
              <Link href="/invoices" className="text-xs font-semibold text-blue-600 hover:text-blue-700">
                View Invoices &rarr;
              </Link>
            </div>
            <div className="divide-y divide-slate-100">
              {invoices.slice(0, 5).map((inv) => (
                <div key={inv.id} className="py-3 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-slate-800">{inv.invoice_number}</span>
                    <p className="text-[11px] text-slate-400 truncate max-w-[200px]">
                      {inv.customer?.name || 'Customer'}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-bold text-slate-900">AED {inv.total.toFixed(2)}</div>
                    <span
                      className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold capitalize ${
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
                  </div>
                </div>
              ))}
              {invoices.length === 0 && (
                <div className="py-6 text-center text-xs text-slate-400">No invoices issued yet.</div>
              )}
            </div>
          </div>

          {/* Recent Filings */}
          <div className="p-6 bg-white rounded-2xl border border-slate-200/80 shadow-2xs">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-slate-900">Recent VAT Filings</h3>
              <Link href="/filings" className="text-xs font-semibold text-blue-600 hover:text-blue-700">
                View Filings &rarr;
              </Link>
            </div>
            <div className="divide-y divide-slate-100">
              {filings.slice(0, 5).map((f) => (
                <div key={f.id} className="py-3 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-slate-800">{f.customer?.name || 'Customer'}</span>
                    <p className="text-[11px] text-slate-400">{f.filing_month} Period</p>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-bold text-slate-900">
                      AED {f.net_vat_payable.toFixed(2)} Net VAT
                    </div>
                    <span
                      className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold capitalize ${
                        f.status === 'filed'
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-amber-50 text-amber-700'
                      }`}
                    >
                      {f.status}
                    </span>
                  </div>
                </div>
              ))}
              {filings.length === 0 && (
                <div className="py-6 text-center text-xs text-slate-400">No VAT filings recorded yet.</div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      <CustomerModal
        isOpen={isCustomerModalOpen}
        onClose={() => setIsCustomerModalOpen(false)}
        onSuccess={fetchDashboardData}
      />
      <InvoiceModal
        isOpen={isInvoiceModalOpen}
        onClose={() => setIsInvoiceModalOpen(false)}
        onSuccess={fetchDashboardData}
      />
      <CustomerFundModal
        isOpen={isFundModalOpen}
        onClose={() => setIsFundModalOpen(false)}
        onSuccess={fetchDashboardData}
      />
    </>
  );
}
