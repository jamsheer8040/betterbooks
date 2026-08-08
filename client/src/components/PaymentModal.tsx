'use client';

import React, { useState, useEffect } from 'react';
import { Invoice, Wallet } from '@/types';
import { api } from '@/lib/api';
import { X, CreditCard, Wallet as WalletIcon } from 'lucide-react';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  invoice?: Invoice | null;
}

export function PaymentModal({ isOpen, onClose, onSuccess, invoice }: PaymentModalProps) {
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [availableFundBalance, setAvailableFundBalance] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [amount, setAmount] = useState<number>(0);
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState('bank_transfer');
  const [walletId, setWalletId] = useState('');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [fromFund, setFromFund] = useState(false);

  useEffect(() => {
    if (isOpen && invoice) {
      setAmount(invoice.balance_due || invoice.total);
      setFromFund(false);
      setReferenceNumber('');

      Promise.all([
        api.wallets.list(),
        api.funds.getBalance(invoice.customer_id),
      ])
        .then(([walletsRes, fundRes]) => {
          if (walletsRes.data) {
            setWallets(walletsRes.data);
            if (walletsRes.data.length > 0) setWalletId(walletsRes.data[0].id);
          }
          if (fundRes.data?.available_balance) {
            setAvailableFundBalance(fundRes.data.available_balance);
          }
        })
        .catch(console.error);
    }
  }, [isOpen, invoice]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invoice) return;

    setLoading(true);
    setError('');

    try {
      await api.payments.create({
        invoice_id: invoice.id,
        customer_id: invoice.customer_id,
        amount,
        payment_date: paymentDate,
        payment_method: fromFund ? 'customer_fund' : paymentMethod,
        wallet_id: fromFund ? null : walletId,
        reference_number: referenceNumber,
        notes,
        from_fund: fromFund,
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to record payment');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !invoice) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md border border-slate-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Record Invoice Payment</h2>
              <p className="text-xs text-slate-500">Invoice #{invoice.invoice_number}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-medium">
              {error}
            </div>
          )}

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex justify-between items-center text-xs">
            <span className="text-slate-600">Total Invoice Amount:</span>
            <span className="font-semibold text-slate-800">AED {invoice.total.toFixed(2)}</span>
          </div>

          <div className="p-3 bg-blue-50 rounded-xl border border-blue-200 flex justify-between items-center text-xs">
            <span className="text-blue-800 font-medium">Remaining Balance Due:</span>
            <span className="font-bold text-blue-700">AED {invoice.balance_due.toFixed(2)}</span>
          </div>

          {availableFundBalance > 0 && (
            <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={fromFund}
                  onChange={(e) => setFromFund(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500"
                />
                <span className="text-xs font-semibold text-emerald-800">
                  Pay from Customer Fund Deposit (Available: AED {availableFundBalance.toFixed(2)})
                </span>
              </label>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Payment Amount (AED)</label>
            <input
              type="number"
              step="0.01"
              required
              max={invoice.balance_due}
              value={amount}
              onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Payment Date</label>
            <input
              type="date"
              required
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white"
            />
          </div>

          {!fromFund && (
            <>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Payment Method</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl"
                >
                  <option value="bank_transfer">Bank Transfer / Wire</option>
                  <option value="cash">Cash</option>
                  <option value="cheque">Cheque</option>
                  <option value="card">Credit / Debit Card</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Deposit To Bank / Wallet</label>
                <select
                  value={walletId}
                  onChange={(e) => setWalletId(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl"
                >
                  {wallets.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name} - {w.bank_name || 'Cash'} (Balance: AED {w.balance.toFixed(2)})
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Reference / Transaction #</label>
            <input
              type="text"
              placeholder="e.g. TXN-998234 / Cheque #881"
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
              className="px-5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-md shadow-emerald-500/20 disabled:opacity-50"
            >
              {loading ? 'Processing...' : 'Confirm Payment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
