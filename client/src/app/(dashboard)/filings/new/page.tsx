'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Header } from '@/components/Header';
import { Customer } from '@/types';
import { api } from '@/lib/api';
import { getQuarterPeriodForFilingMonth, MONTH_NAMES } from '@/utils/quarterUtils';
import {
  FileCheck,
  ChevronLeft,
  Calculator,
  Plus,
  Trash2,
  Upload,
  CheckCircle2,
  DollarSign,
} from 'lucide-react';

export default function NewFilingPage() {
  const router = useRouter();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);

  const [customerId, setCustomerId] = useState('');
  const [filingMonth, setFilingMonth] = useState('January 2026');
  const [periodStart, setPeriodStart] = useState('2025-10-01');
  const [periodEnd, setPeriodEnd] = useState('2025-12-31');
  const [dueDate, setDueDate] = useState('2026-01-28');
  const [status, setStatus] = useState('filed');
  const [vatInclusive, setVatInclusive] = useState(false);

  // Financial Figures
  const [salesAmount, setSalesAmount] = useState<number>(0);
  const [expensesAmount, setExpensesAmount] = useState<number>(0);
  const [otherExpenses, setOtherExpenses] = useState<Array<{ label: string; amount: number }>>([]);
  const [fileUrl, setFileUrl] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    api.customers.list().then((res) => {
      if (res.data) setCustomers(res.data);
    });
  }, []);

  const handleCustomerChange = (selectedId: string) => {
    setCustomerId(selectedId);
    const customer = customers.find((c) => c.id === selectedId);
    if (customer) {
      // Pick first filing month based on cycle
      const cycle = customer.filing_cycle;
      let monthNum = 1;
      if (cycle === 'Feb-May-Aug-Nov') monthNum = 2;
      if (cycle === 'Mar-Jun-Sep-Dec') monthNum = 3;

      const currentYear = new Date().getFullYear();
      const period = getQuarterPeriodForFilingMonth(monthNum, currentYear);

      setFilingMonth(period.filing_month_label);
      setPeriodStart(period.start_date);
      setPeriodEnd(period.end_date);
      setDueDate(period.due_date);
    }
  };

  // VAT calculations (5% standard rate)
  const salesVat = vatInclusive ? (salesAmount * 5) / 105 : (salesAmount * 5) / 100;
  const expensesVat = vatInclusive ? (expensesAmount * 5) / 105 : (expensesAmount * 5) / 100;
  const totalOtherExpenses = otherExpenses.reduce((sum, item) => sum + (item.amount || 0), 0);
  const netVatPayable = salesVat - expensesVat + totalOtherExpenses;

  const handleAddOtherExpense = () => {
    setOtherExpenses([...otherExpenses, { label: '', amount: 0 }]);
  };

  const handleRemoveOtherExpense = (index: number) => {
    setOtherExpenses(otherExpenses.filter((_, i) => i !== index));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const res = await api.upload(file);
      if (res.data?.fileUrl) {
        setFileUrl(res.data.fileUrl);
      }
    } catch (err: any) {
      setError(err.message || 'File upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerId) {
      setError('Please select a customer');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await api.filings.create({
        customer_id: customerId,
        filing_month: filingMonth,
        period_start: periodStart,
        period_end: periodEnd,
        due_date: dueDate,
        sales_amount: salesAmount,
        sales_vat: salesVat,
        expenses_amount: expensesAmount,
        expenses_vat: expensesVat,
        other_expenses: otherExpenses,
        net_vat_payable: netVatPayable,
        vat_inclusive: vatInclusive,
        status,
        notes,
        file_url: fileUrl,
      });

      router.push('/filings');
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to submit VAT return');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Header title="File VAT Return (Form VAT 201)" subtitle="Federal Tax Authority quarterly declaration declaration">
        <Link
          href="/filings"
          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-slate-600 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl shadow-xs transition"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          Cancel
        </Link>
      </Header>

      <div className="p-8 max-w-4xl mx-auto space-y-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-xs font-semibold">
              {error}
            </div>
          )}

          {/* Section 1: Customer & Tax Period */}
          <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center text-xs">
                1
              </span>
              <span>Entity & Tax Period Information</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tax Registered Customer <span className="text-rose-500">*</span>
                </label>
                <select
                  required
                  value={customerId}
                  onChange={(e) => handleCustomerChange(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white"
                >
                  <option value="">-- Choose Customer --</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.trn ? `(TRN: ${c.trn})` : ''} - Cycle: {c.filing_cycle}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Filing Period Month</label>
                <input
                  type="text"
                  required
                  value={filingMonth}
                  onChange={(e) => setFilingMonth(e.target.value)}
                  placeholder="e.g. January 2026"
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Filing Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl"
                >
                  <option value="filed">Filed with FTA</option>
                  <option value="pending_payment">Filed (Pending Payment)</option>
                  <option value="draft">Draft Preparation</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Period Start</label>
                <input
                  type="date"
                  required
                  value={periodStart}
                  onChange={(e) => setPeriodStart(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Period End</label>
                <input
                  type="date"
                  required
                  value={periodEnd}
                  onChange={(e) => setPeriodEnd(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Output & Input VAT Declaration */}
          <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center text-xs">
                  2
                </span>
                <span>Tax Breakdown (Box 1 & Box 9 Declarations)</span>
              </h3>

              <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-600">
                <input
                  type="checkbox"
                  checked={vatInclusive}
                  onChange={(e) => setVatInclusive(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-blue-500"
                />
                <span>Amounts are VAT Inclusive</span>
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* Sales / Output Tax */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-3">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Box 1: Standard Rated Supplies (Sales)
                </h4>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Total Sales (AED)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={salesAmount || ''}
                    onChange={(e) => setSalesAmount(parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 font-semibold text-slate-900"
                  />
                </div>
                <div className="flex justify-between items-center text-xs font-semibold text-slate-700 pt-1">
                  <span>Output VAT (5%):</span>
                  <span className="text-blue-600 font-bold text-sm">AED {salesVat.toFixed(2)}</span>
                </div>
              </div>

              {/* Expenses / Input Tax */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-3">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Box 9: Standard Rated Expenses (Purchases)
                </h4>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Total Purchases (AED)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={expensesAmount || ''}
                    onChange={(e) => setExpensesAmount(parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 font-semibold text-slate-900"
                  />
                </div>
                <div className="flex justify-between items-center text-xs font-semibold text-slate-700 pt-1">
                  <span>Recoverable Input VAT (5%):</span>
                  <span className="text-emerald-600 font-bold text-sm">AED {expensesVat.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Other Adjustments */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Other Tax Adjustments / Penalties
                </h4>
                <button
                  type="button"
                  onClick={handleAddOtherExpense}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Adjustment
                </button>
              </div>

              {otherExpenses.map((item, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  <input
                    type="text"
                    placeholder="Adjustment description (e.g. FTA late penalty)"
                    value={item.label}
                    onChange={(e) => {
                      const copy = [...otherExpenses];
                      copy[idx].label = e.target.value;
                      setOtherExpenses(copy);
                    }}
                    className="flex-1 px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
                  />
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Amount (AED)"
                    value={item.amount || ''}
                    onChange={(e) => {
                      const copy = [...otherExpenses];
                      copy[idx].amount = parseFloat(e.target.value) || 0;
                      setOtherExpenses(copy);
                    }}
                    className="w-32 px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveOtherExpense(idx)}
                    className="p-1.5 text-slate-400 hover:text-rose-600"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            {/* Calculation Summary Result */}
            <div className="p-5 bg-gradient-to-r from-slate-900 to-indigo-950 rounded-2xl text-white flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <span className="text-xs text-blue-300 font-semibold uppercase tracking-wider">
                  Box 14: Net VAT Result
                </span>
                <p className="text-xs text-slate-300 mt-0.5">Output Tax − Recoverable Tax + Adjustments</p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-black text-white">
                  {netVatPayable >= 0 ? `AED ${netVatPayable.toFixed(2)}` : `- AED ${Math.abs(netVatPayable).toFixed(2)}`}
                </div>
                <span className="text-xs font-semibold text-emerald-400">
                  {netVatPayable >= 0 ? 'Payable to FTA' : 'Refund Claim Due from FTA'}
                </span>
              </div>
            </div>
          </div>

          {/* Section 3: File Attachment & Notes */}
          <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center text-xs">
                3
              </span>
              <span>FTA Submission Acknowledgement & Notes</span>
            </h3>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-2">
                FTA VAT 201 Return Acknowledgement PDF
              </label>
              <div className="flex items-center gap-3">
                <label className="cursor-pointer inline-flex items-center gap-2 px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-100 transition">
                  <Upload className="w-3.5 h-3.5 text-slate-500" />
                  <span>{uploading ? 'Uploading...' : 'Upload Return Receipt'}</span>
                  <input
                    type="file"
                    accept=".pdf,.png,.jpg"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
                {fileUrl && (
                  <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4" />
                    Acknowledgement Attached
                  </span>
                )}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Filing Notes / Remarks</label>
              <textarea
                rows={3}
                placeholder="Add any internal auditing remarks or reference submission number..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3">
            <Link
              href="/filings"
              className="px-5 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-200/60 rounded-xl transition"
            >
              Discard
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-lg shadow-blue-500/25 transition disabled:opacity-50"
            >
              {loading ? 'Submitting...' : 'Submit VAT Declaration'}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
