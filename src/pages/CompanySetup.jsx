import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Building2, FileText, Settings, Users, Shield, Crown, UserCheck, Eye, UserPlus, Plus, Trash2, Upload, Save, CheckCircle } from 'lucide-react';
import UsersPage from '@/pages/UsersPage';

const TABS = [
  { key: 'general', label: 'General', icon: Building2 },
  { key: 'documents', label: 'Documents', icon: FileText },
  { key: 'vat', label: 'VAT Settings', icon: Settings },
  { key: 'filing', label: 'Filing Settings', icon: CheckCircle },
  { key: 'invoice', label: 'Invoice Settings', icon: FileText },
  { key: 'users', label: 'User Management', icon: Users },
];

const ROLES = [
  { key: 'admin', label: 'Admin', desc: 'Full access — manage users, settings, all data', icon: Crown, color: 'text-red-500 bg-red-50 border-red-100' },
  { key: 'manager', label: 'Manager', desc: 'Manage filings, customers, agents and commissions', icon: Shield, color: 'text-blue-500 bg-blue-50 border-blue-100' },
  { key: 'agent', label: 'Agent', desc: 'View own commissions and agent dashboard only', icon: UserCheck, color: 'text-green-500 bg-green-50 border-green-100' },
  { key: 'viewer', label: 'Viewer', desc: 'Read-only access to filings and customers', icon: Eye, color: 'text-gray-500 bg-gray-50 border-gray-200' },
];

export default function CompanySetup() {
  const [activeTab, setActiveTab] = useState('general');
  const [settings, setSettings] = useState(null);
  const [settingsId, setSettingsId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Users tab state
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('user');
  const [inviting, setInviting] = useState(false);

  const defaultSettings = {
    company_name: '',
    address: '',
    phone: '',
    email: '',
    website: '',
    trn: '',
    logo_url: '',
    vat_enabled: false,
    vat_rate: 5,
    invoice_prefix: 'INV',
    invoice_footer_notes: '',
    invoice_payment_terms: '30',
    bank_name: '',
    bank_account_name: '',
    bank_account_number: '',
    bank_iban: '',
    invoice_terms_conditions: '',
    custom_field_1_label: '',
    custom_field_2_label: '',
    documents: [],
    auto_sync_tracker_to_filing: true,
    allow_edit_filed_filings: true,
  };

  useEffect(() => {
    base44.entities.CompanySettings.list().then(data => {
      if (data && data.length > 0) {
        setSettingsId(data[0].id);
        setSettings({ ...defaultSettings, ...data[0] });
      } else {
        setSettings({ ...defaultSettings });
      }
    });
  }, []);

  useEffect(() => {
    if (activeTab === 'users') {
      setLoadingUsers(true);
      base44.entities.User.list('-created_date', 100).then(data => {
        setUsers(data);
        setLoadingUsers(false);
      });
    }
  }, [activeTab]);

  const handleSave = async (updatedSettings) => {
    const dataToSave = updatedSettings || settings;
    setSaving(true);
    if (settingsId) {
      await base44.entities.CompanySettings.update(settingsId, dataToSave);
    } else {
      const created = await base44.entities.CompanySettings.create(dataToSave);
      setSettingsId(created.id);
    }
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const set = (field, val) => {
    const updated = { ...settings, [field]: val };
    setSettings(updated);
    if (settingsId) {
      base44.entities.CompanySettings.update(settingsId, updated);
    } else {
      base44.entities.CompanySettings.create(updated).then(created => setSettingsId(created.id));
    }
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    set('logo_url', file_url);
    setUploading(false);
  };

  const addDocument = () => {
    set('documents', [...(settings.documents || []), { label: '', file_url: '', expiry_date: '', notes: '' }]);
  };

  const updateDoc = (idx, field, val) => {
    const docs = [...(settings.documents || [])];
    docs[idx] = { ...docs[idx], [field]: val };
    set('documents', docs);
  };

  const uploadDocFile = async (idx, file) => {
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    updateDoc(idx, 'file_url', file_url);
    setUploading(false);
  };

  const removeDoc = (idx) => {
    set('documents', settings.documents.filter((_, i) => i !== idx));
  };

  const handleInvite = async () => {
    if (!inviteEmail) return;
    setInviting(true);
    await base44.users.inviteUser(inviteEmail, inviteRole);
    setInviteEmail('');
    setShowInvite(false);
    setInviting(false);
    base44.entities.User.list('-created_date', 100).then(setUsers);
  };

  if (!settings) return <div className="text-center py-20 text-gray-400">Loading...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Company Setup</h1>
          <p className="text-gray-500 text-sm mt-0.5">Manage your company profile, documents, and settings</p>
        </div>
        {activeTab !== 'users' && (
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
          >
            {saved ? <CheckCircle className="w-4 h-4" /> : <Save className="w-4 h-4" />}
            {saved ? 'Saved!' : saving ? 'Saving...' : 'Save Changes'}
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-6 flex-wrap">
        {TABS.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === tab.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* General Tab */}
      {activeTab === 'general' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
          {/* Logo */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-2">Company Logo</label>
            <div className="flex items-center gap-4">
              {settings.logo_url ? (
                <img src={settings.logo_url} alt="logo" className="w-16 h-16 rounded-xl object-contain border border-gray-200 bg-gray-50 p-1" />
              ) : (
                <div className="w-16 h-16 rounded-xl border-2 border-dashed border-gray-200 flex items-center justify-center text-gray-300">
                  <Building2 className="w-7 h-7" />
                </div>
              )}
              <label className={`flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 cursor-pointer hover:bg-gray-50 ${uploading ? 'opacity-50 pointer-events-none' : ''}`}>
                <Upload className="w-4 h-4" />
                {uploading ? 'Uploading...' : 'Upload Logo'}
                <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
              </label>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Company Name *</label>
              <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={settings.company_name} onChange={e => set('company_name', e.target.value)} placeholder="Your Company LLC" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Address</label>
              <textarea className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 h-20 resize-none" value={settings.address} onChange={e => set('address', e.target.value)} placeholder="Full company address..." />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Phone</label>
              <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={settings.phone} onChange={e => set('phone', e.target.value)} placeholder="+971 00 000 0000" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
              <input type="email" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={settings.email} onChange={e => set('email', e.target.value)} placeholder="info@company.com" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Website</label>
              <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={settings.website} onChange={e => set('website', e.target.value)} placeholder="www.company.com" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">TRN (Tax Registration Number)</label>
              <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={settings.trn} onChange={e => set('trn', e.target.value)} placeholder="100XXXXXXXXX3" />
            </div>
          </div>
        </div>
      )}

      {/* Documents Tab */}
      {activeTab === 'documents' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">Attach company trade licenses, certificates, and other documents.</p>
            <button onClick={addDocument} className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium">
              <Plus className="w-4 h-4" /> Add Document
            </button>
          </div>
          {(settings.documents || []).length === 0 ? (
            <div className="bg-white rounded-xl border-2 border-dashed border-gray-200 py-16 text-center text-gray-400">
              <FileText className="w-10 h-10 mx-auto mb-3 text-gray-300" />
              <p className="text-sm">No documents added yet</p>
              <button onClick={addDocument} className="mt-3 text-blue-600 text-sm font-medium hover:underline">+ Add Document</button>
            </div>
          ) : (
            <div className="space-y-3">
              {(settings.documents || []).map((doc, idx) => (
                <div key={idx} className="bg-white rounded-xl border border-gray-200 p-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Document Label</label>
                      <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={doc.label} onChange={e => updateDoc(idx, 'label', e.target.value)} placeholder="e.g. Trade License" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Expiry Date</label>
                      <input type="date" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={doc.expiry_date} onChange={e => updateDoc(idx, 'expiry_date', e.target.value)} />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">File</label>
                      {doc.file_url ? (
                        <div className="flex items-center gap-2">
                          <a href={doc.file_url} target="_blank" rel="noreferrer" className="text-blue-600 text-sm hover:underline truncate max-w-xs">View File</a>
                          <button onClick={() => updateDoc(idx, 'file_url', '')} className="text-xs text-red-400 hover:text-red-600">Remove</button>
                        </div>
                      ) : (
                        <label className={`flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 cursor-pointer hover:bg-gray-50 ${uploading ? 'opacity-50 pointer-events-none' : ''}`}>
                          <Upload className="w-4 h-4" />
                          {uploading ? 'Uploading...' : 'Upload File'}
                          <input type="file" className="hidden" onChange={e => e.target.files[0] && uploadDocFile(idx, e.target.files[0])} />
                        </label>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
                      <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={doc.notes} onChange={e => updateDoc(idx, 'notes', e.target.value)} placeholder="Optional notes..." />
                    </div>
                  </div>
                  <div className="flex justify-end mt-2">
                    <button onClick={() => removeDoc(idx)} className="flex items-center gap-1 text-xs text-red-400 hover:text-red-600">
                      <Trash2 className="w-3.5 h-3.5" /> Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* VAT Settings Tab */}
      {activeTab === 'vat' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
          {/* TRN Requirement Card */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-gray-700">
                Company Tax Registration Number (TRN) <span className="text-red-500">* Required to enable VAT</span>
              </label>
              {settings.trn?.trim() ? (
                <span className="text-xs font-medium text-green-700 bg-green-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" /> TRN Registered
                </span>
              ) : (
                <span className="text-xs font-medium text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> TRN Missing
                </span>
              )}
            </div>
            <input
              type="text"
              className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 ${!settings.trn?.trim() ? 'border-amber-300 bg-amber-50/50 focus:ring-amber-500' : 'border-gray-200 focus:ring-blue-500'}`}
              value={settings.trn || ''}
              onChange={e => set('trn', e.target.value)}
              placeholder="e.g. 100XXXXXXXXX3 (15 digits)"
            />
            {!settings.trn?.trim() && (
              <p className="text-xs text-amber-700 flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" /> You must enter your company TRN number before you can turn on VAT settings.
              </p>
            )}
          </div>

          <div className="flex items-center justify-between pb-4 border-b border-gray-100">
            <div>
              <p className="font-semibold text-gray-900">Enable VAT</p>
              <p className="text-xs text-gray-500 mt-0.5">Apply VAT (5%) to invoices by default</p>
            </div>
            <button
              type="button"
              onClick={() => {
                if (!settings.vat_enabled && (!settings.trn || !settings.trn.trim())) {
                  alert('Tax Registration Number (TRN) is required before enabling VAT. Please enter your 15-digit TRN first.');
                  return;
                }
                set('vat_enabled', !settings.vat_enabled);
              }}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${settings.vat_enabled ? 'bg-blue-600' : 'bg-gray-200'}`}
            >
              <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${settings.vat_enabled ? 'translate-x-5' : 'translate-x-0'}`} />
            </button>
          </div>

          <div className={`space-y-4 ${!settings.vat_enabled ? 'opacity-40 pointer-events-none' : ''}`}>
            <div className="max-w-xs">
              <label className="block text-xs font-medium text-gray-600 mb-1">VAT Rate (%)</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0" max="100" step="0.1"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={settings.vat_rate}
                  onChange={e => set('vat_rate', parseFloat(e.target.value) || 0)}
                />
                <span className="text-sm text-gray-500">%</span>
              </div>
            </div>
            <div className="bg-blue-50 rounded-lg p-4">
              <p className="text-sm font-medium text-blue-800">Current VAT: {settings.vat_rate}%</p>
              <p className="text-xs text-blue-600 mt-1">This rate will be applied to all new invoices when VAT is enabled</p>
            </div>
          </div>
        </div>
      )}

      {/* Filing Settings Tab */}
      {activeTab === 'filing' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-6">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Filing Automation & Sync Rules</h2>
            <p className="text-xs text-gray-500 mt-0.5">Configure how filing statuses and tracker buttons synchronize</p>
          </div>

          <div className="flex items-start justify-between p-4 bg-gray-50 rounded-xl border border-gray-200">
            <div className="max-w-xl pr-4">
              <p className="font-semibold text-sm text-gray-900">Auto-Sync Tracker "Confirm Done" to Filing Entity (Vice-Versa)</p>
              <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                When enabled, clicking <strong>"Confirm Done"</strong> on the Filing Tracker table automatically upgrades the corresponding return's status to <strong>"Filed"</strong>. When disabled, clicking <strong>"Confirm Done"</strong> only updates the tracker milestone, leaving the filing record status in Draft mode until edited on the filing form.
              </p>
            </div>
            <button
              type="button"
              onClick={() => set('auto_sync_tracker_to_filing', settings.auto_sync_tracker_to_filing === false ? true : false)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${settings.auto_sync_tracker_to_filing !== false ? 'bg-blue-600' : 'bg-gray-300'}`}
            >
              <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${settings.auto_sync_tracker_to_filing !== false ? 'translate-x-5' : 'translate-x-0'}`} />
            </button>
          </div>

          {/* Toggle 2: Allow Edit / Revert Filed Returns */}
          <div className="flex items-start justify-between p-4 bg-gray-50 rounded-xl border border-gray-200">
            <div className="max-w-xl pr-4">
              <p className="font-semibold text-sm text-gray-900">Allow Editing & Reverting Filed Returns</p>
              <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                When enabled (<strong>Yes</strong>), returns with status <strong>"Filed"</strong> can be edited and reverted back to <strong>"Draft"</strong>. When disabled (<strong>No</strong>), Filed returns are locked: the Edit button is disabled on filed returns and status cannot be reverted from Filed back to Draft.
              </p>
            </div>
            <button
              type="button"
              onClick={() => set('allow_edit_filed_filings', settings.allow_edit_filed_filings === false ? true : false)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${settings.allow_edit_filed_filings !== false ? 'bg-blue-600' : 'bg-gray-300'}`}
            >
              <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${settings.allow_edit_filed_filings !== false ? 'translate-x-5' : 'translate-x-0'}`} />
            </button>
          </div>

          <div className="p-4 bg-blue-50/70 border border-blue-100 rounded-xl text-xs text-blue-800 space-y-1">
            <p className="font-bold">Current Configuration State:</p>
            <p>
              {settings.auto_sync_tracker_to_filing !== false
                ? '✅ Auto-Sync: Tracker "Confirm Done" clicks will automatically mark the return filing as Filed.'
                : '🔒 Auto-Sync: Tracker "Confirm Done" clicks will only update milestone status without modifying the return filing record.'}
            </p>
            <p>
              {settings.allow_edit_filed_filings !== false
                ? '✅ Allow Edit Filed: Users can edit filed returns and revert status from Filed back to Draft.'
                : '🔒 Lock Filed Returns: Filed returns are locked (Edit button disabled, reverting to Draft is blocked).'}
            </p>
          </div>
        </div>
      )}

      {/* Invoice Settings Tab */}
      {activeTab === 'invoice' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-2">Invoice Logo</label>
            <div className="flex items-center gap-3">
              {settings.logo_url ? <img src={settings.logo_url} alt="Company logo" className="w-14 h-14 rounded-lg object-contain border border-gray-200 bg-gray-50 p-1" /> : <div className="w-14 h-14 rounded-lg border-2 border-dashed border-gray-200 flex items-center justify-center text-gray-300"><Building2 className="w-6 h-6" /></div>}
              <label className={`flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 cursor-pointer hover:bg-gray-50 ${uploading ? 'opacity-50 pointer-events-none' : ''}`}><Upload className="w-4 h-4" />{uploading ? 'Uploading...' : 'Upload Logo'}<input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} /></label>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Invoice Number Prefix</label>
            <div className="flex items-center gap-2 max-w-xs">
              <input
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={settings.invoice_prefix}
                onChange={e => set('invoice_prefix', e.target.value)}
                placeholder="INV"
              />
              <span className="text-xs text-gray-400 whitespace-nowrap">e.g. {settings.invoice_prefix || 'INV'}-20260101-001</span>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Payment Terms (days)</label>
            <div className="flex items-center gap-2 max-w-xs">
              <input
                type="number"
                min="0"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={settings.invoice_payment_terms}
                onChange={e => set('invoice_payment_terms', e.target.value)}
              />
              <span className="text-xs text-gray-400">days</span>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Invoice Footer / Notes</label>
            <textarea className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 h-24 resize-none" value={settings.invoice_footer_notes} onChange={e => set('invoice_footer_notes', e.target.value)} placeholder="e.g. Thank you for your business." />
          </div>
          <div className="border-t border-gray-100 pt-5">
            <h3 className="text-sm font-semibold text-gray-800 mb-3">Bank Account Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div><label className="block text-xs font-medium text-gray-600 mb-1">Bank Name</label><input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={settings.bank_name} onChange={e => set('bank_name', e.target.value)} /></div>
              <div><label className="block text-xs font-medium text-gray-600 mb-1">Account Name</label><input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={settings.bank_account_name} onChange={e => set('bank_account_name', e.target.value)} /></div>
              <div><label className="block text-xs font-medium text-gray-600 mb-1">Account Number</label><input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={settings.bank_account_number} onChange={e => set('bank_account_number', e.target.value)} /></div>
              <div><label className="block text-xs font-medium text-gray-600 mb-1">IBAN</label><input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={settings.bank_iban} onChange={e => set('bank_iban', e.target.value)} /></div>
            </div>
          </div>
          <div><label className="block text-xs font-medium text-gray-600 mb-1">Terms & Conditions</label><textarea className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm h-24 resize-none" value={settings.invoice_terms_conditions} onChange={e => set('invoice_terms_conditions', e.target.value)} placeholder="Enter your standard invoice terms..." /></div>
          <div className="border-t border-gray-100 pt-5"><h3 className="text-sm font-semibold text-gray-800 mb-3">Custom Invoice Fields</h3><div className="grid grid-cols-1 md:grid-cols-2 gap-3"><div><label className="block text-xs font-medium text-gray-600 mb-1">Custom Field 1 Label</label><input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={settings.custom_field_1_label} onChange={e => set('custom_field_1_label', e.target.value)} placeholder="e.g. PO Number" /></div><div><label className="block text-xs font-medium text-gray-600 mb-1">Custom Field 2 Label</label><input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={settings.custom_field_2_label} onChange={e => set('custom_field_2_label', e.target.value)} placeholder="e.g. Project Name" /></div></div></div>
        </div>
      )}

      {/* Users Tab */}
      {activeTab === 'users' && <UsersPage />}

      {/* Invite Modal */}
      {activeTab !== 'users' && showInvite && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <h2 className="text-lg font-semibold mb-4">Invite User</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input type="email" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} placeholder="user@example.com" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={inviteRole} onChange={e => setInviteRole(e.target.value)}>
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-5">
              <button onClick={() => setShowInvite(false)} className="px-4 py-2 text-sm border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50">Cancel</button>
              <button disabled={inviting || !inviteEmail} onClick={handleInvite} className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium disabled:opacity-50">
                {inviting ? 'Sending...' : 'Send Invite'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}