'use client';

import React, { useState, useEffect } from 'react';
import { Agent, Customer, Invoice } from '@/types';
import { api } from '@/lib/api';
import { X, Percent } from 'lucide-react';

interface CommissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  defaultAgentId?: string;
}

export function CommissionModal({ isOpen, onClose, onSuccess, defaultAgentId }: CommissionModalProps) {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [agentId, setAgentId] = useState(defaultAgentId || '');
  const [customerId, setCustomerId] = useState('');
  const [invoiceId, setInvoiceId] = useState('');
  const [amount, setAmount] = useState<number>(0);
  const [status, setStatus] = useState('pending_approval');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [isAdvance, setIsAdvance] = useState(false);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (isOpen) {
      if (defaultAgentId) setAgentId(defaultAgentId);
      Promise.all([api.agents.list(), api.customers.list(), api.invoices.list()])
        .then(([agentsRes, custRes, invRes]) => {
          if (agentsRes.data) setAgents(agentsRes.data);
          if (custRes.data) setCustomers(custRes.data);
          if (invRes.data) setInvoices(invRes.data);
        })
        .catch(console.error);
    }
  }, [isOpen, defaultAgentId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agentId || amount <= 0) {
      setError('Please select an agent and specify a positive commission amount');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await api.commissions.create({
        agent_id: agentId,
        customer_id: customerId || null,
        invoice_id: invoiceId || null,
        amount,
        status,
        date,
        is_advance: isAdvance,
        notes,
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to record commission');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md border border-slate-200">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
              <Percent className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Record Agent Commission</h2>
              <p className="text-xs text-slate-500">Sales commission or advance payout</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-medium">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Sales Agent <span className="text-rose-500">*</span>
            </label>
            <select
              required
              value={agentId}
              onChange={(e) => setAgentId(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl"
            >
              <option value="">-- Select Agent --</option>
              {agents.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} ({a.commission_rate}%)
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Linked Customer (Optional)</label>
            <select
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl"
            >
              <option value="">-- None / General --</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Commission Amount (AED)</label>
            <input
              type="number"
              step="0.01"
              required
              min="1"
              placeholder="0.00"
              value={amount || ''}
              onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:bg-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Date</label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl"
              >
                <option value="pending_approval">Pending Approval</option>
                <option value="approved">Approved</option>
                <option value="released">Released / Paid</option>
              </select>
            </div>
          </div>

          <div className="p-3 bg-purple-50 rounded-xl border border-purple-200">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isAdvance}
                onChange={(e) => setIsAdvance(e.target.checked)}
                className="rounded text-purple-600 focus:ring-purple-500"
              />
              <span className="text-xs font-semibold text-purple-800">
                Mark as Advance Payout (Deducted from future commissions)
              </span>
            </label>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Notes</label>
            <input
              type="text"
              placeholder="e.g. Q1 Sales bonus / Milestone payout"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl"
            />
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 text-xs font-semibold text-white bg-purple-600 hover:bg-purple-700 rounded-xl shadow-md shadow-purple-500/20 disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Record Commission'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
