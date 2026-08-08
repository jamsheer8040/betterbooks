'use client';

import React, { useState, useEffect } from 'react';
import { Header } from '@/components/Header';
import { Commission } from '@/types';
import { api } from '@/lib/api';
import { CommissionModal } from '@/components/CommissionModal';
import {
  Percent,
  Plus,
  CheckCircle2,
  Clock,
  Send,
  AlertCircle,
  DollarSign,
} from 'lucide-react';

export default function CommissionsPage() {
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');

  const fetchCommissions = async () => {
    setLoading(true);
    try {
      const res = await api.commissions.list();
      if (res.data) setCommissions(res.data);
    } catch (e) {
      console.error('Failed to load commissions:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCommissions();
  }, []);

  const handleUpdateStatus = async (commissionId: string, status: string) => {
    try {
      await api.commissions.updateStatus(commissionId, status);
      fetchCommissions();
    } catch (e) {
      console.error('Failed to update status:', e);
    }
  };

  const filtered = commissions.filter((c) => !statusFilter || c.status === statusFilter);

  const totalCommissions = commissions.reduce((acc, c) => acc + c.amount, 0);
  const totalPending = commissions
    .filter((c) => c.status === 'pending_approval')
    .reduce((acc, c) => acc + c.amount, 0);
  const totalReleased = commissions
    .filter((c) => c.status === 'released')
    .reduce((acc, c) => acc + c.amount, 0);

  return (
    <>
      <Header title="Agent Commissions & Payouts" subtitle="Approval, settlement, and advance tracking for sales agents">
        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-purple-600 hover:bg-purple-700 rounded-xl shadow-xs transition"
        >
          <Plus className="w-4 h-4" />
          Record Commission
        </button>
      </Header>

      <div className="p-8 space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <div className="p-5 bg-white rounded-2xl border border-slate-200/80 shadow-2xs">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Commission Earned</span>
            <div className="text-2xl font-bold text-slate-900 mt-2">
              AED {totalCommissions.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-slate-400 mt-0.5">{commissions.length} commission entries</p>
          </div>

          <div className="p-5 bg-white rounded-2xl border border-slate-200/80 shadow-2xs">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Pending Approval</span>
            <div className="text-2xl font-bold text-amber-600 mt-2">
              AED {totalPending.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-slate-400 mt-0.5">Awaiting manager sign-off</p>
          </div>

          <div className="p-5 bg-white rounded-2xl border border-slate-200/80 shadow-2xs">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Released / Paid</span>
            <div className="text-2xl font-bold text-emerald-600 mt-2">
              AED {totalReleased.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-slate-400 mt-0.5">Settled to agents</p>
          </div>
        </div>

        {/* Filter */}
        <div className="flex justify-between items-center p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-xs font-bold text-slate-800">Commissions Registry</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-700"
          >
            <option value="">All Statuses</option>
            <option value="pending_approval">Pending Approval</option>
            <option value="approved">Approved</option>
            <option value="released">Released / Paid</option>
          </select>
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <th className="py-3.5 px-6">Agent</th>
                <th className="py-3.5 px-4">Client / Invoice</th>
                <th className="py-3.5 px-4">Date</th>
                <th className="py-3.5 px-4">Amount (AED)</th>
                <th className="py-3.5 px-4">Type</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50/70 transition">
                  <td className="py-4 px-6 font-bold text-slate-900">{c.agent?.name}</td>
                  <td className="py-4 px-4 text-slate-600">
                    {c.customer?.name || (c.invoice ? `Invoice #${c.invoice.invoice_number}` : 'Direct')}
                  </td>
                  <td className="py-4 px-4 text-slate-600">{new Date(c.date).toLocaleDateString('en-GB')}</td>
                  <td className="py-4 px-4 font-bold text-slate-900">AED {c.amount.toFixed(2)}</td>
                  <td className="py-4 px-4">
                    {c.is_advance ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                        Advance
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-600">
                        Standard
                      </span>
                    )}
                  </td>
                  <td className="py-4 px-4">
                    <span
                      className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-semibold capitalize ${
                        c.status === 'released'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : c.status === 'approved'
                          ? 'bg-blue-50 text-blue-700 border border-blue-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}
                    >
                      {c.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-right space-x-2">
                    {c.status === 'pending_approval' && (
                      <button
                        onClick={() => handleUpdateStatus(c.id, 'approved')}
                        className="px-2.5 py-1 text-[11px] font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition"
                      >
                        Approve
                      </button>
                    )}
                    {c.status === 'approved' && (
                      <button
                        onClick={() => handleUpdateStatus(c.id, 'released')}
                        className="px-2.5 py-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition"
                      >
                        Release Payout
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && !loading && (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-xs text-slate-400">
                    No commission entries found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <CommissionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={fetchCommissions}
      />
    </>
  );
}
