'use client';

import React, { useState, useEffect } from 'react';
import { Header } from '@/components/Header';
import { Wallet } from '@/types';
import { api } from '@/lib/api';
import {
  Wallet as WalletIcon,
  Building,
  Plus,
  ArrowRightLeft,
  DollarSign,
  CreditCard,
  X,
} from 'lucide-react';

export default function WalletsPage() {
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);

  // New Wallet State
  const [newWalletName, setNewWalletName] = useState('');
  const [newWalletBank, setNewWalletBank] = useState('');
  const [newWalletAccount, setNewWalletAccount] = useState('');
  const [newWalletIban, setNewWalletIban] = useState('');
  const [newWalletBalance, setNewWalletBalance] = useState(0);

  // Transfer State
  const [fromWalletId, setFromWalletId] = useState('');
  const [toWalletId, setToWalletId] = useState('');
  const [transferAmount, setTransferAmount] = useState(0);
  const [transferNotes, setTransferNotes] = useState('');

  const fetchWallets = async () => {
    setLoading(true);
    try {
      const res = await api.wallets.list();
      if (res.data) setWallets(res.data);
    } catch (e) {
      console.error('Failed to load wallets:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWallets();
  }, []);

  const handleCreateWallet = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.wallets.create({
        name: newWalletName,
        bank_name: newWalletBank,
        account_number: newWalletAccount,
        iban: newWalletIban,
        balance: newWalletBalance,
        currency: 'AED',
      });
      setIsAddModalOpen(false);
      setNewWalletName('');
      setNewWalletBank('');
      setNewWalletAccount('');
      setNewWalletIban('');
      setNewWalletBalance(0);
      fetchWallets();
    } catch (e) {
      console.error('Failed to create wallet:', e);
    }
  };

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fromWalletId || !toWalletId || fromWalletId === toWalletId || transferAmount <= 0) return;

    try {
      await api.wallets.transfer({
        from_wallet_id: fromWalletId,
        to_wallet_id: toWalletId,
        amount: transferAmount,
        notes: transferNotes,
      });
      setIsTransferModalOpen(false);
      setTransferAmount(0);
      setTransferNotes('');
      fetchWallets();
    } catch (e) {
      console.error('Failed to transfer funds:', e);
    }
  };

  const totalBalance = wallets.reduce((acc, w) => acc + w.balance, 0);

  return (
    <>
      <Header title="Bank Accounts & Wallets" subtitle="Manage company bank accounts, petty cash vaults, and internal transfers">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsTransferModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl shadow-xs transition"
          >
            <ArrowRightLeft className="w-3.5 h-3.5" />
            Internal Transfer
          </button>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition"
          >
            <Plus className="w-4 h-4" />
            Add Account
          </button>
        </div>
      </Header>

      <div className="p-8 space-y-6">
        {/* Total Liquidity Banner */}
        <div className="p-6 bg-gradient-to-r from-blue-900 to-indigo-950 rounded-2xl text-white shadow-xl shadow-blue-500/10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <span className="text-xs text-blue-300 font-semibold uppercase tracking-wider">Total Liquid Funds</span>
            <div className="text-3xl font-black text-white mt-1">
              AED {totalBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right text-xs text-slate-300">
              <span>{wallets.length} active financial accounts</span>
            </div>
          </div>
        </div>

        {/* Wallets Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {wallets.map((w) => (
            <div
              key={w.id}
              className="p-5 bg-white rounded-2xl border border-slate-200 shadow-2xs hover:shadow-xs transition flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                    <Building className="w-5 h-5" />
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Active
                  </span>
                </div>

                <h3 className="text-base font-bold text-slate-900 mt-3">{w.name}</h3>
                <p className="text-xs text-slate-500">{w.bank_name || 'Cash Vault'}</p>

                {w.iban && (
                  <p className="text-[11px] font-mono text-slate-400 mt-2 truncate">
                    IBAN: {w.iban}
                  </p>
                )}
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs text-slate-400 font-medium">Available Balance</span>
                <span className="text-lg font-bold text-slate-900">
                  AED {w.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Add Wallet Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md border border-slate-200 p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">Add Bank Account / Wallet</h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateWallet} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Account Display Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Emirates NBD Operating"
                  value={newWalletName}
                  onChange={(e) => setNewWalletName(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Bank Name</label>
                <input
                  type="text"
                  placeholder="e.g. Emirates NBD / Mashreq / Cash"
                  value={newWalletBank}
                  onChange={(e) => setNewWalletBank(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Account Number</label>
                <input
                  type="text"
                  placeholder="101XXXXXXXXX"
                  value={newWalletAccount}
                  onChange={(e) => setNewWalletAccount(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">IBAN</label>
                <input
                  type="text"
                  placeholder="AE29 0331 2345 6789 0123 45"
                  value={newWalletIban}
                  onChange={(e) => setNewWalletIban(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Starting Balance (AED)</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={newWalletBalance || ''}
                  onChange={(e) => setNewWalletBalance(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl"
                >
                  Create Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Transfer Funds Modal */}
      {isTransferModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md border border-slate-200 p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">Transfer Funds Between Accounts</h3>
              <button onClick={() => setIsTransferModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleTransfer} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Source Account *</label>
                <select
                  required
                  value={fromWalletId}
                  onChange={(e) => setFromWalletId(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
                >
                  <option value="">-- Choose Account --</option>
                  {wallets.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name} (AED {w.balance.toFixed(2)})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Destination Account *</label>
                <select
                  required
                  value={toWalletId}
                  onChange={(e) => setToWalletId(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
                >
                  <option value="">-- Choose Account --</option>
                  {wallets
                    .filter((w) => w.id !== fromWalletId)
                    .map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name} (AED {w.balance.toFixed(2)})
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Transfer Amount (AED) *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  min="1"
                  placeholder="0.00"
                  value={transferAmount || ''}
                  onChange={(e) => setTransferAmount(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Notes</label>
                <input
                  type="text"
                  placeholder="e.g. Petty cash replenishment"
                  value={transferNotes}
                  onChange={(e) => setTransferNotes(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsTransferModalOpen(false)}
                  className="px-4 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl"
                >
                  Execute Transfer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
