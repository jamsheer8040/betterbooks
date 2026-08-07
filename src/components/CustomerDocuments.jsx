import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Upload, Trash2, Download, Share2, Plus, X, AlertTriangle, CheckCircle } from 'lucide-react';

const DOC_TYPES = [
  { value: 'trade_license', label: 'Trade License' },
  { value: 'moa', label: 'MOA' },
  { value: 'eid', label: 'EID (Owner)' },
  { value: 'passport', label: 'Passport (Owner)' },
  { value: 'other', label: 'Other' },
];

function daysUntil(dateStr) {
  if (!dateStr) return null;
  const diff = new Date(dateStr) - new Date();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function ExpiryBadge({ date }) {
  if (!date) return null;
  const days = daysUntil(date);
  if (days < 0) return <span className="flex items-center gap-1 text-xs text-red-600 font-medium"><AlertTriangle className="w-3 h-3" /> Expired</span>;
  if (days <= 30) return <span className="flex items-center gap-1 text-xs text-orange-500 font-medium"><AlertTriangle className="w-3 h-3" /> {days}d left</span>;
  if (days <= 90) return <span className="flex items-center gap-1 text-xs text-yellow-600 font-medium"><AlertTriangle className="w-3 h-3" /> {days}d left</span>;
  return <span className="flex items-center gap-1 text-xs text-green-600"><CheckCircle className="w-3 h-3" /> Valid</span>;
}

export default function CustomerDocuments({ customer, onUpdate }) {
  const [adding, setAdding] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [sendingReminder, setSendingReminder] = useState(false);
  const [newDoc, setNewDoc] = useState({ type: 'trade_license', label: '', owner_name: '', expiry_date: '', file_url: '' });

  const docs = customer.documents || [];

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setNewDoc(p => ({ ...p, file_url }));
    setUploading(false);
  };

  const addDoc = async () => {
    const label = newDoc.label || DOC_TYPES.find(d => d.value === newDoc.type)?.label || newDoc.type;
    const updated = [...docs, { ...newDoc, label }];
    await base44.entities.Customer.update(customer.id, { documents: updated });
    setAdding(false);
    setNewDoc({ type: 'trade_license', label: '', owner_name: '', expiry_date: '', file_url: '' });
    onUpdate();
  };

  const removeDoc = async (idx) => {
    if (!confirm('Remove this document?')) return;
    const updated = docs.filter((_, i) => i !== idx);
    await base44.entities.Customer.update(customer.id, { documents: updated });
    onUpdate();
  };

  const handleShare = (url) => {
    if (navigator.share) {
      navigator.share({ url });
    } else {
      navigator.clipboard.writeText(url);
      alert('Link copied to clipboard!');
    }
  };

  // Share document file via WhatsApp — opens WhatsApp with the file URL preloaded in the message.
  // User can then select any contact from their chat history in WhatsApp.
  const shareDocOnWhatsApp = (doc) => {
    const docName = doc.label || doc.type;
    const ownerPart = doc.owner_name ? ` (${doc.owner_name})` : '';
    const expiryPart = doc.expiry_date ? `\nExpiry: ${doc.expiry_date}` : '';
    const msg = encodeURIComponent(
      `📄 *${docName}*${ownerPart} — ${customer.name}${expiryPart}\n\n${doc.file_url}`
    );
    // wa.me without a phone number opens WhatsApp and lets user pick any chat
    window.open(`https://wa.me/?text=${msg}`, '_blank');
  };

  const sendWhatsAppReminder = async (doc) => {
    const wa = customer.whatsapp_number;
    if (!wa) { alert('No WhatsApp number set for this customer.'); return; }
    setSendingReminder(true);
    const days = daysUntil(doc.expiry_date);
    const status = days < 0 ? 'has EXPIRED' : `expires in ${days} days (${doc.expiry_date})`;
    const msg = encodeURIComponent(
      `Dear ${customer.name},\n\nThis is a reminder that your *${doc.label}*${doc.owner_name ? ` (${doc.owner_name})` : ''} ${status}.\n\nPlease ensure renewal is completed promptly to remain compliant.\n\nThank you,\nVAT Manager`
    );
    window.open(`https://wa.me/${wa.replace(/\D/g, '')}?text=${msg}`, '_blank');
    setSendingReminder(false);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold text-gray-900">Documents</h3>
        <button onClick={() => setAdding(true)} className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 font-medium">
          <Plus className="w-4 h-4" /> Add Document
        </button>
      </div>

      {adding && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Type</label>
              <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white" value={newDoc.type} onChange={e => setNewDoc(p => ({ ...p, type: e.target.value }))}>
                {DOC_TYPES.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Label (optional)</label>
              <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white" placeholder="e.g. Trade License 2025" value={newDoc.label} onChange={e => setNewDoc(p => ({ ...p, label: e.target.value }))} />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Owner Name (if applicable)</label>
              <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white" placeholder="Owner name" value={newDoc.owner_name} onChange={e => setNewDoc(p => ({ ...p, owner_name: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Expiry Date</label>
              <input type="date" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white" value={newDoc.expiry_date} onChange={e => setNewDoc(p => ({ ...p, expiry_date: e.target.value }))} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Upload File</label>
            <input type="file" onChange={handleFileUpload} className="text-sm text-gray-600" />
            {uploading && <p className="text-xs text-blue-600 mt-1">Uploading...</p>}
            {newDoc.file_url && <p className="text-xs text-green-600 mt-1">✓ File uploaded</p>}
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => setAdding(false)} className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50"><X className="w-3.5 h-3.5 inline mr-1" />Cancel</button>
            <button onClick={addDoc} disabled={uploading} className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">Add</button>
          </div>
        </div>
      )}

      {docs.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-6">No documents uploaded yet</p>
      ) : (
        <div className="space-y-2">
          {docs.map((doc, idx) => (
            <div key={idx} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium text-gray-900">{doc.label || doc.type}</span>
                  {doc.owner_name && <span className="text-xs text-gray-500">— {doc.owner_name}</span>}
                </div>
                <div className="flex items-center gap-3 mt-1 flex-wrap">
                  {doc.expiry_date && (
                    <span className="text-xs text-gray-500">Expires: {doc.expiry_date}</span>
                  )}
                  <ExpiryBadge date={doc.expiry_date} />
                </div>
              </div>
              <div className="flex items-center gap-1.5 self-end sm:self-auto">
                {doc.file_url && (
                  <>
                    <a href={doc.file_url} download target="_blank" rel="noreferrer" className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors" title="Download">
                      <Download className="w-4 h-4" />
                    </a>
                    <button onClick={() => shareDocOnWhatsApp(doc)} title="Share on WhatsApp" className="p-1.5 rounded-lg text-green-600 hover:bg-green-50 transition-colors">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                    </button>
                  </>
                )}
                <button onClick={() => removeDoc(idx)} className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 transition-colors" title="Remove">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}