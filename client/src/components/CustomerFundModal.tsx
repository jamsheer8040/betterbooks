'use client';

import React, { useState, useEffect } from 'react';
import { Customer, Wallet } from '@/types';
import { api } from '@/lib/api';
import { X, PiggyBank } from 'lucide-react';

interface CustomerFundModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  defaultCustomerId?: string;
}

export function CustomerFundModal({ isOpen, onClose, onSuccess, defaultCustomerId }: CustomerFundModalProps) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [customerId, setCustomerId] = useState(defaultCustomerId || '');
  const [amount, setAmount] = useState<number>(0);
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState('bank_transfer');
  const [walletId, setWalletId] = useState('');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [notes, setNotes] = useState('Advance deposit for upcoming VAT returns and filings');

  useEffect(() => {
    if (isOpen) {
      if (defaultCustomerId) setCustomerId(defaultCustomerId);
      Promise.all([api.customers.list(), api.wallets.list()])
        .then(([custRes, walletsRes]) => {
          if (custRes.data) setCustomers(custRes.data);
          if (walletsRes.data) {
            setWallets(walletsRes.data);
            if (walletsRes.data.length > 0) setWalletId(walletsRes.data[0].id);
          }
        })
        .catch(console.error);
    }
  }, [isOpen, defaultCustomerId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerId || amount <= 0) {
      setError('Please select a customer and specify a positive deposit amount');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await api.funds.deposit({
        customer_id: customerId,
        amount,
        payment_date: paymentDate,
        payment_method: paymentMethod,
        wallet_id: walletId || null,
        reference_number: referenceNumber,
        notes,
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to record fund deposit');
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
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
              <PiggyBank className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Customer Advance Deposit</h2>
              <p className="text-xs text-slate-500">Record advance funds into customer balance</p>
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
              Customer <span className="text-rose-500">*</span>
            </label>
            <select
              required
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl"
            >
              <option value="">-- Select Customer --</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.company_name ? `(${c.company_name})` : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Deposit Amount (AED) <span className="text-rose-500">*</span>
            </label>
            <input
              type="number"
              step="0.01"
              required
              min="1"
              placeholder="0.00"
              value={amount || ''}
              onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Deposit Date</label>
            <input
              type="date"
              required
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Payment Method</label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl"
            >
              <option value="bank_transfer">Bank Transfer</option>
              <option value="cash">Cash</option>
              <option value="cheque">Cheque</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Receiving Bank / Wallet</label>
            <select
              value={walletId}
              onChange={(e) => setWalletId(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl"
            >
              {wallets.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name} - {w.bank_name || 'Cash'}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Reference / Cheque Number</label>
            <input
              type="text"
              placeholder="e.g. Wire Ref #88910"
              value={referenceNumber}
              onChange={(e) => setReferenceNumber(e.target.value)}
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
              className="px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md shadow-indigo-500/20 disabled:opacity-50"
            >
              {loading ? 'Depositing...' : 'Deposit Advance Fund'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
