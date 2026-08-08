'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Header } from '@/components/Header';
import { Filing } from '@/types';
import { api } from '@/lib/api';
import { FilingTrackerTab } from '@/components/FilingTrackerTab';
import {
  FileCheck,
  LayoutGrid,
  ListFilter,
  Plus,
  Calendar,
  DollarSign,
  Download,
  Search,
  ExternalLink,
} from 'lucide-react';

export default function FilingsPage() {
  const [viewMode, setViewMode] = useState<'matrix' | 'list'>('matrix');
  const [filings, setFilings] = useState<Filing[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  const fetchFilingsList = async () => {
    setLoading(true);
    try {
      const res = await api.filings.list();
      if (res.data) setFilings(res.data);
    } catch (e) {
      console.error('Failed to load filings:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (viewMode === 'list') {
      fetchFilingsList();
    }
  }, [viewMode]);

  const filteredFilings = filings.filter(
    (f) =>
      !search ||
      f.customer?.name?.toLowerCase().includes(search.toLowerCase()) ||
      f.customer?.trn?.includes(search) ||
      f.filing_month?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <Header title="VAT Return Filings & Compliance" subtitle="FTA VAT 201 quarterly declarations and 12-month tracker">
        <div className="flex items-center gap-2">
          {/* View Mode Toggle */}
          <div className="bg-slate-100 p-1 rounded-xl flex items-center gap-1">
            <button
              onClick={() => setViewMode('matrix')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                viewMode === 'matrix'
                  ? 'bg-white text-blue-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              12-Month Matrix
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                viewMode === 'list'
                  ? 'bg-white text-blue-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ListFilter className="w-3.5 h-3.5" />
              Filed Returns List
            </button>
          </div>

          <Link
            href="/filings/new"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition"
          >
            <Plus className="w-4 h-4" />
            File New Return
          </Link>
        </div>
      </Header>

      <div className="p-8 space-y-6">
        {viewMode === 'matrix' ? (
          <FilingTrackerTab />
        ) : (
          <div className="space-y-4">
            <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  placeholder="Search by customer name, TRN, or filing period..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                    <th className="py-3.5 px-6">Customer & TRN</th>
                    <th className="py-3.5 px-4">Period Month</th>
                    <th className="py-3.5 px-4">Period Range</th>
                    <th className="py-3.5 px-4">Sales VAT</th>
                    <th className="py-3.5 px-4">Expenses VAT</th>
                    <th className="py-3.5 px-4">Net VAT Payable</th>
                    <th className="py-3.5 px-4">Due Date</th>
                    <th className="py-3.5 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredFilings.map((f) => (
                    <tr key={f.id} className="hover:bg-slate-50/70 transition">
                      <td className="py-4 px-6">
                        <div className="font-bold text-slate-900">{f.customer?.name}</div>
                        <div className="text-[11px] text-slate-400 font-mono">
                          {f.customer?.trn ? `TRN: ${f.customer.trn}` : 'No TRN'}
                        </div>
                      </td>
                      <td className="py-4 px-4 font-semibold text-slate-800">{f.filing_month}</td>
                      <td className="py-4 px-4 text-slate-600">
                        {new Date(f.period_start).toLocaleDateString('en-GB')} –{' '}
                        {new Date(f.period_end).toLocaleDateString('en-GB')}
                      </td>
                      <td className="py-4 px-4 font-semibold text-slate-800">AED {f.sales_vat.toFixed(2)}</td>
                      <td className="py-4 px-4 font-semibold text-slate-800">AED {f.expenses_vat.toFixed(2)}</td>
                      <td className="py-4 px-4 font-bold text-blue-600">
                        AED {f.net_vat_payable.toFixed(2)}
                      </td>
                      <td className="py-4 px-4 text-slate-600">
                        {f.due_date ? new Date(f.due_date).toLocaleDateString('en-GB') : '-'}
                      </td>
                      <td className="py-4 px-4">
                        <span className="inline-block px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 capitalize">
                          {f.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {filteredFilings.length === 0 && !loading && (
                    <tr>
                      <td colSpan={8} className="py-10 text-center text-xs text-slate-400">
                        No filed returns found. Click &quot;File New Return&quot; above to declare.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
