'use client';

import React, { useState, useEffect } from 'react';
import { Customer, Agent } from '@/types';
import { api } from '@/lib/api';
import { FILING_CYCLES } from '@/utils/quarterUtils';
import { X, Building, Mail, Phone, MapPin, FileText, Upload, Trash2, CheckCircle2 } from 'lucide-react';

interface CustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  customer?: Customer | null;
}

export function CustomerModal({ isOpen, onClose, onSuccess, customer }: CustomerModalProps) {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    company_name: '',
    trn: '',
    email: '',
    mobile: '',
    phone: '',
    address: '',
    city: 'Dubai',
    contact_person: '',
    filing_cycle: 'Jan-Apr-Jul-Oct',
    agent_id: '',
    trade_license_number: '',
    trade_license_expiry: '',
    trade_license_url: '',
    portal_username: '',
    status: 'active',
  });

  useEffect(() => {
    if (isOpen) {
      api.agents.list().then((res) => {
        if (res.data) setAgents(res.data);
      }).catch(console.error);

      if (customer) {
        setFormData({
          name: customer.name || '',
          company_name: customer.company_name || '',
          trn: customer.trn || '',
          email: customer.email || '',
          mobile: customer.mobile || '',
          phone: customer.phone || '',
          address: customer.address || '',
          city: customer.city || 'Dubai',
          contact_person: customer.contact_person || '',
          filing_cycle: customer.filing_cycle || 'Jan-Apr-Jul-Oct',
          agent_id: customer.agent_id || '',
          trade_license_number: customer.trade_license_number || '',
          trade_license_expiry: customer.trade_license_expiry ? customer.trade_license_expiry.split('T')[0] : '',
          trade_license_url: customer.trade_license_url || '',
          portal_username: customer.portal_username || '',
          status: customer.status || 'active',
        });
      } else {
        setFormData({
          name: '',
          company_name: '',
          trn: '',
          email: '',
          mobile: '',
          phone: '',
          address: '',
          city: 'Dubai',
          contact_person: '',
          filing_cycle: 'Jan-Apr-Jul-Oct',
          agent_id: '',
          trade_license_number: '',
          trade_license_expiry: '',
          trade_license_url: '',
          portal_username: '',
          status: 'active',
        });
      }
    }
  }, [isOpen, customer]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const res = await api.upload(file);
      if (res.data?.fileUrl) {
        setFormData((prev) => ({ ...prev, trade_license_url: res.data.fileUrl }));
      }
    } catch (err: any) {
      setError(err.message || 'File upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (customer) {
        await api.customers.update(customer.id, formData);
      } else {
        await api.customers.create(formData);
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to save customer');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col border border-slate-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <Building className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                {customer ? 'Edit Customer Record' : 'Register New Customer'}
              </h2>
              <p className="text-xs text-slate-500">VAT Registration & Compliance Details</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-medium">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Customer Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Al Futtaim Trading"
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Company Legal Name</label>
              <input
                type="text"
                value={formData.company_name}
                onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                placeholder="e.g. Al Futtaim LLC"
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Tax Registration Number (TRN)
              </label>
              <input
                type="text"
                value={formData.trn}
                onChange={(e) => setFormData({ ...formData, trn: e.target.value })}
                placeholder="100XXXXXXXXX003 (15 digits)"
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white font-mono transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                VAT Filing Cycle <span className="text-rose-500">*</span>
              </label>
              <select
                value={formData.filing_cycle}
                onChange={(e) => setFormData({ ...formData, filing_cycle: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
              >
                {FILING_CYCLES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="accounts@company.ae"
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Mobile / WhatsApp</label>
              <input
                type="text"
                value={formData.mobile}
                onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                placeholder="+971 50 XXX XXXX"
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Assigned Agent</label>
              <select
                value={formData.agent_id}
                onChange={(e) => setFormData({ ...formData, agent_id: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
              >
                <option value="">No Agent (Direct Customer)</option>
                {agents.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({a.commission_rate}% commission)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Contact Person</label>
              <input
                type="text"
                value={formData.contact_person}
                onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                placeholder="Manager / Accountant"
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Trade License Number</label>
              <input
                type="text"
                value={formData.trade_license_number}
                onChange={(e) => setFormData({ ...formData, trade_license_number: e.target.value })}
                placeholder="DED-123456"
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Trade License Expiry</label>
              <input
                type="date"
                value={formData.trade_license_expiry}
                onChange={(e) => setFormData({ ...formData, trade_license_expiry: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Address / Emirate</label>
            <input
              type="text"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="Business Bay, Dubai, UAE"
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
            />
          </div>

          {/* Trade License File Upload */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80">
            <label className="block text-xs font-semibold text-slate-700 mb-2">
              Trade License Document (PDF / Image)
            </label>
            <div className="flex items-center gap-3">
              <label className="cursor-pointer inline-flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-xs transition">
                <Upload className="w-3.5 h-3.5 text-slate-500" />
                <span>{uploading ? 'Uploading...' : 'Choose File'}</span>
                <input
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
              {formData.trade_license_url && (
                <div className="flex items-center gap-2 text-xs text-emerald-600 font-medium">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Document uploaded</span>
                </div>
              )}
            </div>
          </div>

          {/* Footer buttons */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md shadow-blue-500/20 transition disabled:opacity-50"
            >
              {loading ? 'Saving...' : customer ? 'Update Customer' : 'Create Customer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
