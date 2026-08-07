import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Search, Plus, Package, Wrench, Pencil, Trash2, X } from 'lucide-react';

const fmt = (n) => (n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const EMPTY = { name: '', type: 'service', primary_type: '', description: '', default_price: 0, tax_rate: 5, status: 'active' };

function ProductServiceModal({ item, onClose, onSaved }) {
  const [form, setForm] = useState(item || { ...EMPTY });
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!form.name.trim()) { alert('Name is required'); return; }
    setSaving(true);
    const data = {
      ...form,
      default_price: parseFloat(form.default_price) || 0,
      tax_rate: parseFloat(form.tax_rate) || 0,
    };
    if (item?.id) await base44.entities.ProductService.update(item.id, data);
    else await base44.entities.ProductService.create(data);
    setSaving(false);
    onSaved();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-bold text-gray-900">{item?.id ? 'Edit' : 'New'} Product / Service</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"><X className="w-5 h-5" /></button>
        </div>
        <div className="px-6 py-4 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Type *</label>
            <div className="flex gap-2">
              {['service', 'product'].map(t => (
                <button key={t} onClick={() => setForm(f => ({ ...f, type: t }))}
                  className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium capitalize transition-colors ${form.type === t ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>
                  {t === 'product' ? <Package className="w-4 h-4" /> : <Wrench className="w-4 h-4" />} {t}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Name *</label>
            <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="e.g. VAT Filing Service" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Primary Type / Category</label>
            <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="e.g. Accounting, Consulting" value={form.primary_type} onChange={e => setForm(f => ({ ...f, primary_type: e.target.value }))} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
            <textarea className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm h-16 resize-none" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Default Price (AED)</label>
              <input type="number" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-right" value={form.default_price} onChange={e => setForm(f => ({ ...f, default_price: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Tax Rate (%)</label>
              <input type="number" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-right" value={form.tax_rate} onChange={e => setForm(f => ({ ...f, tax_rate: e.target.value }))} />
            </div>
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-gray-200">
          <button onClick={onClose} className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
          <button onClick={save} disabled={saving} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium disabled:opacity-50">{saving ? 'Saving…' : 'Save'}</button>
        </div>
      </div>
    </div>
  );
}

export default function ProductsServices() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [modal, setModal] = useState(null); // null | 'new' | item

  const load = () => {
    base44.entities.ProductService.list('-created_date', 500).then(list => { setItems(list); setLoading(false); });
  };
  useEffect(() => { load(); }, []);

  const remove = async (item) => {
    if (!confirm(`Delete "${item.name}"?`)) return;
    await base44.entities.ProductService.delete(item.id);
    load();
  };

  const filtered = items.filter(i => {
    const matchSearch = !search || i.name?.toLowerCase().includes(search.toLowerCase()) || i.primary_type?.toLowerCase().includes(search.toLowerCase());
    const matchType = typeFilter === 'all' || i.type === typeFilter;
    return matchSearch && matchType;
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Products & Services</h1>
          <p className="text-gray-500 text-sm mt-0.5">{items.length} items · used when creating invoices</p>
        </div>
        <button onClick={() => setModal('new')} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm">
          <Plus className="w-4 h-4" /> New Item
        </button>
      </div>

      <div className="flex gap-3 mb-5 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <input type="text" placeholder="Search name or category..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-8 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" />
        </div>
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700">
          <option value="all">All Types</option>
          <option value="service">Services</option>
          <option value="product">Products</option>
        </select>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading...</div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="grid grid-cols-12 gap-3 px-5 py-3 bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wide">
            <div className="col-span-4">Name</div>
            <div className="col-span-2">Type</div>
            <div className="col-span-3">Category</div>
            <div className="col-span-1 text-right">Price</div>
            <div className="col-span-1 text-right">Tax</div>
            <div className="col-span-1 text-center">Actions</div>
          </div>
          {filtered.length === 0 ? (
            <div className="text-center py-12 text-gray-400 text-sm">No products or services yet</div>
          ) : filtered.map(item => (
            <div key={item.id} className="grid grid-cols-12 gap-3 px-5 py-3.5 items-center border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors">
              <div className="col-span-4">
                <p className="text-sm font-medium text-gray-900">{item.name}</p>
                {item.description && <p className="text-xs text-gray-400 truncate">{item.description}</p>}
              </div>
              <div className="col-span-2">
                <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full font-medium ${item.type === 'product' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
                  {item.type === 'product' ? <Package className="w-3 h-3" /> : <Wrench className="w-3 h-3" />} {item.type}
                </span>
              </div>
              <div className="col-span-3 text-sm text-gray-600">{item.primary_type || '—'}</div>
              <div className="col-span-1 text-right text-sm font-semibold text-gray-900">{fmt(item.default_price)}</div>
              <div className="col-span-1 text-right text-sm text-gray-500">{item.tax_rate || 0}%</div>
              <div className="col-span-1 flex justify-center gap-1">
                <button onClick={() => setModal(item)} className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-blue-50 hover:text-blue-600 transition-colors"><Pencil className="w-3.5 h-3.5" /></button>
                <button onClick={() => remove(item)} className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-red-50 hover:text-red-600 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {modal && (
        <ProductServiceModal item={modal === 'new' ? null : modal} onClose={() => setModal(null)} onSaved={() => { setModal(null); load(); }} />
      )}
    </div>
  );
}