'use client';

import React, { useState, useEffect } from 'react';
import { Header } from '@/components/Header';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { User, CompanySettings } from '@/types';
import {
  Building2,
  Shield,
  CreditCard,
  Upload,
  CheckCircle2,
  Plus,
  Trash2,
  Lock,
  UserCheck,
  X,
} from 'lucide-react';

export default function CompanySetupPage() {
  const { user: currentUser, companySettings, refreshSettings } = useAuth();
  const [activeTab, setActiveTab] = useState<'profile' | 'bank' | 'users'>('profile');
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Company Form State
  const [formData, setFormData] = useState<Partial<CompanySettings>>({
    name: '',
    legal_name: '',
    trn: '',
    email: '',
    phone: '',
    address: '',
    city: 'Dubai',
    country: 'United Arab Emirates',
    logo_url: '',
    bank_name: '',
    account_number: '',
    iban: '',
    swift_code: '',
    invoice_notes: '',
    invoice_terms: '',
  });

  // Users Management State
  const [users, setUsers] = useState<User[]>([]);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserRole, setNewUserRole] = useState('staff');
  const [newUserAgentId, setNewUserAgentId] = useState('');
  const [agents, setAgents] = useState<any[]>([]);

  useEffect(() => {
    if (companySettings) {
      setFormData({
        name: companySettings.name || '',
        legal_name: companySettings.legal_name || '',
        trn: companySettings.trn || '',
        email: companySettings.email || '',
        phone: companySettings.phone || '',
        address: companySettings.address || '',
        city: companySettings.city || 'Dubai',
        country: companySettings.country || 'United Arab Emirates',
        logo_url: companySettings.logo_url || '',
        bank_name: companySettings.bank_name || '',
        account_number: companySettings.account_number || '',
        iban: companySettings.iban || '',
        swift_code: companySettings.swift_code || '',
        invoice_notes: companySettings.invoice_notes || '',
        invoice_terms: companySettings.invoice_terms || '',
      });
    }
    fetchUsers();
    api.agents.list().then((res) => {
      if (res.data) setAgents(res.data);
    });
  }, [companySettings]);

  const fetchUsers = async () => {
    try {
      const res = await api.users.list();
      if (res.data) setUsers(res.data);
    } catch (e) {
      console.error('Failed to load users:', e);
    }
  };

  const handleSaveCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSuccessMsg('');
    setErrorMsg('');

    try {
      await api.company.update(formData);
      await refreshSettings();
      setSuccessMsg('Company settings updated successfully!');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update company settings');
    } finally {
      setLoading(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const res = await api.upload(file);
      if (res.data?.fileUrl) {
        setFormData((prev) => ({ ...prev, logo_url: res.data.fileUrl }));
      }
    } catch (err: any) {
      setErrorMsg('Failed to upload logo');
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.users.create({
        name: newUserName,
        email: newUserEmail,
        password: newUserPassword,
        role: newUserRole,
        agent_id: newUserRole === 'agent' ? newUserAgentId : null,
      });
      setIsUserModalOpen(false);
      setNewUserName('');
      setNewUserEmail('');
      setNewUserPassword('');
      setNewUserRole('staff');
      fetchUsers();
    } catch (e) {
      console.error('Failed to create user:', e);
    }
  };

  return (
    <>
      <Header title="Company Setup & User Management" subtitle="Configure UAE corporate identity, billing templates, and user RBAC permissions" />

      <div className="p-8 space-y-6 max-w-5xl">
        {successMsg && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-xs font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{successMsg}</span>
          </div>
        )}

        {errorMsg && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 text-xs font-semibold">
            {errorMsg}
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 gap-6 text-xs font-semibold">
          {[
            { key: 'profile', label: 'Company Profile & Tax ID' },
            { key: 'bank', label: 'Bank Account on Invoices' },
            { key: 'users', label: 'Staff Users & Access Roles', count: users.length },
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

        {/* Tab 1: Company Profile */}
        {activeTab === 'profile' && (
          <form onSubmit={handleSaveCompany} className="space-y-6">
            <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-4">
              <h3 className="text-sm font-bold text-slate-900">Corporate Details</h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Company Trading Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Legal Registered Name</label>
                  <input
                    type="text"
                    value={formData.legal_name || ''}
                    onChange={(e) => setFormData({ ...formData, legal_name: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Tax Registration Number (TRN)</label>
                  <input
                    type="text"
                    value={formData.trn || ''}
                    onChange={(e) => setFormData({ ...formData, trn: e.target.value })}
                    placeholder="100XXXXXXXXX003"
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-mono focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Billing Email</label>
                  <input
                    type="email"
                    value={formData.email || ''}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Telephone</label>
                  <input
                    type="text"
                    value={formData.phone || ''}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Emirate / City</label>
                  <input
                    type="text"
                    value={formData.city || ''}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Full Office Address</label>
                  <input
                    type="text"
                    value={formData.address || ''}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white"
                  />
                </div>
              </div>

              {/* Logo Upload */}
              <div className="pt-3 border-t border-slate-100">
                <label className="block text-xs font-semibold text-slate-700 mb-2">Company Invoice Logo</label>
                <div className="flex items-center gap-4">
                  {formData.logo_url && (
                    <img
                      src={formData.logo_url}
                      alt="Logo"
                      className="h-12 w-auto object-contain border border-slate-200 rounded-lg p-1 bg-white"
                    />
                  )}
                  <label className="cursor-pointer inline-flex items-center gap-2 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-100 transition">
                    <Upload className="w-3.5 h-3.5 text-slate-500" />
                    <span>Upload New Logo</span>
                    <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                  </label>
                </div>
              </div>
            </div>

            {/* Invoice Notes & Terms */}
            <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-4">
              <h3 className="text-sm font-bold text-slate-900">Default Invoice Disclaimers & Notes</h3>
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Invoice Notes</label>
                  <textarea
                    rows={2}
                    value={formData.invoice_notes || ''}
                    onChange={(e) => setFormData({ ...formData, invoice_notes: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Terms & Conditions</label>
                  <textarea
                    rows={2}
                    value={formData.invoice_terms || ''}
                    onChange={(e) => setFormData({ ...formData, invoice_terms: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md shadow-blue-500/20 transition disabled:opacity-50"
              >
                {loading ? 'Saving...' : 'Save Company Profile'}
              </button>
            </div>
          </form>
        )}

        {/* Tab 2: Bank Account Details */}
        {activeTab === 'bank' && (
          <form onSubmit={handleSaveCompany} className="space-y-6">
            <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-4">
              <h3 className="text-sm font-bold text-slate-900">Default Bank Details printed on Invoices</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Bank Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Emirates NBD"
                    value={formData.bank_name || ''}
                    onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Account Number</label>
                  <input
                    type="text"
                    value={formData.account_number || ''}
                    onChange={(e) => setFormData({ ...formData, account_number: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-mono focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">IBAN</label>
                  <input
                    type="text"
                    placeholder="AE29 0331 2345 6789 0123 45"
                    value={formData.iban || ''}
                    onChange={(e) => setFormData({ ...formData, iban: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-mono focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">SWIFT / BIC Code</label>
                  <input
                    type="text"
                    placeholder="EBILAEADXXX"
                    value={formData.swift_code || ''}
                    onChange={(e) => setFormData({ ...formData, swift_code: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-mono focus:bg-white"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md shadow-blue-500/20 transition disabled:opacity-50"
              >
                {loading ? 'Saving...' : 'Save Bank Details'}
              </button>
            </div>
          </form>
        )}

        {/* Tab 3: Staff Users & Permissions */}
        {activeTab === 'users' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-bold text-slate-800">System Users & Roles</h3>
              <button
                onClick={() => setIsUserModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition"
              >
                <Plus className="w-4 h-4" />
                Invite User
              </button>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                    <th className="py-3.5 px-6">User</th>
                    <th className="py-3.5 px-4">Email</th>
                    <th className="py-3.5 px-4">Role</th>
                    <th className="py-3.5 px-4">Linked Agent</th>
                    <th className="py-3.5 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50/70 transition">
                      <td className="py-4 px-6 font-bold text-slate-900 flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-700">
                          {u.name[0]}
                        </div>
                        <span>{u.name}</span>
                      </td>
                      <td className="py-4 px-4 text-slate-600">{u.email}</td>
                      <td className="py-4 px-4">
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 capitalize">
                          {u.role}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-slate-600">{u.agent?.name || '-'}</td>
                      <td className="py-4 px-4">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700">
                          Active
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Add User Modal */}
      {isUserModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md border border-slate-200 p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">Add Staff / User</h3>
              <button onClick={() => setIsUserModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Fatima Al Zahra"
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address *</label>
                <input
                  type="email"
                  required
                  placeholder="user@betterbooks.ae"
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Password *</label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={newUserPassword}
                  onChange={(e) => setNewUserPassword(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Role</label>
                <select
                  value={newUserRole}
                  onChange={(e) => setNewUserRole(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
                >
                  <option value="admin">Admin (Full Access)</option>
                  <option value="staff">Staff (Operations & Invoicing)</option>
                  <option value="auditor">Auditor (View Only)</option>
                  <option value="agent">Agent (Restricted to Referred Clients)</option>
                </select>
              </div>

              {newUserRole === 'agent' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Link to Sales Agent *</label>
                  <select
                    required
                    value={newUserAgentId}
                    onChange={(e) => setNewUserAgentId(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
                  >
                    <option value="">-- Choose Agent --</option>
                    {agents.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name} ({a.commission_rate}%)
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsUserModalOpen(false)}
                  className="px-4 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl"
                >
                  Create User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
