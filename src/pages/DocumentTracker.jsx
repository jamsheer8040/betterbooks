import { useEffect, useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { Search, LayoutGrid, List, AlertTriangle, Download, FileText, Phone } from 'lucide-react';
import { Link } from 'react-router-dom';

function daysUntil(dateStr) {
  if (!dateStr) return null;
  const diff = new Date(dateStr) - new Date();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

const formatDate = (d) => {
  if (!d) return '—';
  try { return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }); } catch { return d; }
};

// Stage definitions
const STAGES = [
  { key: 'expired', label: 'Expired', desc: 'Past expiry date', cls: 'red', match: (d) => d < 0 },
  { key: 'critical', label: 'Critical', desc: 'Within 14 days', cls: 'orange', match: (d) => d >= 0 && d <= 14 },
  { key: 'warning', label: 'Warning', desc: '15 – 30 days', cls: 'amber', match: (d) => d >= 15 && d <= 30 },
  { key: 'upcoming', label: 'Upcoming', desc: '31 – 45 days', cls: 'blue', match: (d) => d >= 31 && d <= 45 },
];

const STAGE_STYLES = {
  red: { header: 'bg-red-50 border-red-200 text-red-700', dot: 'bg-red-500', badge: 'bg-red-100 text-red-700', card: 'border-red-100' },
  orange: { header: 'bg-orange-50 border-orange-200 text-orange-700', dot: 'bg-orange-500', badge: 'bg-orange-100 text-orange-700', card: 'border-orange-100' },
  amber: { header: 'bg-amber-50 border-amber-200 text-amber-700', dot: 'bg-amber-500', badge: 'bg-amber-100 text-amber-700', card: 'border-amber-100' },
  blue: { header: 'bg-blue-50 border-blue-200 text-blue-700', dot: 'bg-blue-500', badge: 'bg-blue-100 text-blue-700', card: 'border-blue-100' },
};

const WhatsAppIcon = ({ className }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
);

function sendWhatsAppReminder(item) {
  const wa = item.whatsapp_number || item.mobile;
  if (!wa) { alert(`No WhatsApp/mobile number set for ${item.customer_name}.`); return; }
  const days = daysUntil(item.expiry_date);
  const status = days < 0 ? 'has EXPIRED' : `expires in ${days} day${days === 1 ? '' : 's'} (${item.expiry_date})`;
  const msg = encodeURIComponent(
    `Dear ${item.customer_name},\n\nThis is a reminder that your *${item.label}*${item.owner_name ? ` (${item.owner_name})` : ''} ${status}.\n\nPlease ensure renewal is completed promptly to remain compliant.\n\nThank you,\nVAT Manager`
  );
  window.open(`https://wa.me/${wa.replace(/\D/g, '')}?text=${msg}`, '_blank');
}

function DaysBadge({ days }) {
  if (days < 0) return <span className="text-xs font-semibold text-red-600">Expired {Math.abs(days)}d ago</span>;
  return <span className={`text-xs font-semibold ${days <= 14 ? 'text-orange-600' : days <= 30 ? 'text-amber-600' : 'text-blue-600'}`}>{days}d left</span>;
}

function DocCard({ item }) {
  const style = STAGE_STYLES[item._stage.cls];
  return (
    <div className={`bg-white rounded-xl border ${style.card} p-3.5 shadow-sm`}>
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-gray-900 truncate">{item.label}</p>
          <Link to={`/customers/${item.customer_id}`} className="text-xs text-gray-500 hover:text-blue-600 truncate block">{item.customer_name}</Link>
        </div>
        <DaysBadge days={daysUntil(item.expiry_date)} />
      </div>
      {item.owner_name && <p className="text-xs text-gray-400 mb-1">Owner: {item.owner_name}</p>}
      <p className="text-xs text-gray-500 mb-3">Expires: {formatDate(item.expiry_date)}</p>
      <div className="flex items-center gap-1.5">
        <button onClick={() => sendWhatsAppReminder(item)} className="flex-1 flex items-center justify-center gap-1.5 text-xs font-medium text-green-700 bg-green-50 hover:bg-green-100 border border-green-200 rounded-lg px-2 py-1.5 transition-colors">
          <WhatsAppIcon className="w-3.5 h-3.5" /> Remind
        </button>
        {item.file_url && (
          <a href={item.file_url} download target="_blank" rel="noreferrer" className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors" title="Download">
            <Download className="w-3.5 h-3.5" />
          </a>
        )}
      </div>
    </div>
  );
}

export default function DocumentTracker() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [view, setView] = useState('kanban');

  useEffect(() => {
    base44.entities.Customer.list('-created_date', 1000).then(c => { setCustomers(c); setLoading(false); });
  }, []);

  // Flatten all customer documents that have an expiry date within tracked range
  const docs = useMemo(() => {
    const all = [];
    customers.forEach(c => {
      (c.documents || []).forEach(d => {
        if (!d.expiry_date) return;
        const days = daysUntil(d.expiry_date);
        const stage = STAGES.find(s => s.match(days));
        if (!stage) return; // out of tracked range (>45 days)
        all.push({
          ...d,
          customer_id: c.id,
          customer_name: c.name,
          whatsapp_number: c.whatsapp_number,
          mobile: c.mobile,
          _days: days,
          _stage: stage,
        });
      });
    });
    return all.sort((a, b) => a._days - b._days);
  }, [customers]);

  const filtered = useMemo(() =>
    docs.filter(d => !search || d.customer_name?.toLowerCase().includes(search.toLowerCase()) || d.label?.toLowerCase().includes(search.toLowerCase())),
    [docs, search]
  );

  const byStage = (key) => filtered.filter(d => d._stage.key === key);

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Document Tracker</h1>
          <p className="text-gray-500 text-sm mt-0.5">{filtered.length} document{filtered.length !== 1 ? 's' : ''} expiring within 45 days</p>
        </div>
        <div className="flex bg-gray-100 rounded-lg p-0.5 gap-0.5">
          <button onClick={() => setView('kanban')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${view === 'kanban' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            <LayoutGrid className="w-3.5 h-3.5" /> Kanban
          </button>
          <button onClick={() => setView('list')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${view === 'list' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            <List className="w-3.5 h-3.5" /> List
          </button>
        </div>
      </div>

      <div className="relative mb-5 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
        <input type="text" placeholder="Search customer or document..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-8 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" />
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-400">Loading...</div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 py-16 text-center text-gray-400 text-sm">
          <FileText className="w-8 h-8 mx-auto mb-2 opacity-40" />
          No documents expiring within 45 days
        </div>
      ) : view === 'kanban' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {STAGES.map(stage => {
            const items = byStage(stage.key);
            const style = STAGE_STYLES[stage.cls];
            return (
              <div key={stage.key} className="flex flex-col">
                <div className={`flex items-center justify-between rounded-xl border px-4 py-3 mb-3 ${style.header}`}>
                  <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${style.dot}`} />
                    <div>
                      <p className="text-sm font-bold leading-tight">{stage.label}</p>
                      <p className="text-xs opacity-70 leading-tight">{stage.desc}</p>
                    </div>
                  </div>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${style.badge}`}>{items.length}</span>
                </div>
                <div className="space-y-3">
                  {items.length === 0 ? (
                    <div className="text-center text-xs text-gray-300 py-6 border border-dashed border-gray-200 rounded-xl">No documents</div>
                  ) : items.map((item, i) => <DocCard key={`${item.customer_id}-${item.label}-${i}`} item={item} />)}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="grid grid-cols-12 gap-3 px-5 py-3 bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wide">
            <div className="col-span-3">Document</div>
            <div className="col-span-3">Customer</div>
            <div className="col-span-2">Stage</div>
            <div className="col-span-2">Expiry</div>
            <div className="col-span-2 text-center">Actions</div>
          </div>
          {filtered.map((item, i) => {
            const style = STAGE_STYLES[item._stage.cls];
            return (
              <div key={`${item.customer_id}-${item.label}-${i}`} className="grid grid-cols-12 gap-3 px-5 py-3.5 items-center border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors">
                <div className="col-span-3 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{item.label}</p>
                  {item.owner_name && <p className="text-xs text-gray-400 truncate">{item.owner_name}</p>}
                </div>
                <div className="col-span-3 min-w-0">
                  <Link to={`/customers/${item.customer_id}`} className="text-sm text-gray-700 hover:text-blue-600 truncate block">{item.customer_name}</Link>
                </div>
                <div className="col-span-2">
                  <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full font-medium ${style.badge}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} /> {item._stage.label}
                  </span>
                </div>
                <div className="col-span-2">
                  <p className="text-sm text-gray-700">{formatDate(item.expiry_date)}</p>
                  <DaysBadge days={item._days} />
                </div>
                <div className="col-span-2 flex justify-center gap-1.5">
                  <button onClick={() => sendWhatsAppReminder(item)} className="flex items-center gap-1.5 text-xs font-medium text-green-700 bg-green-50 hover:bg-green-100 border border-green-200 rounded-lg px-2.5 py-1.5 transition-colors" title="Send WhatsApp reminder">
                    <WhatsAppIcon className="w-3.5 h-3.5" /> Remind
                  </button>
                  {item.file_url && (
                    <a href={item.file_url} download target="_blank" rel="noreferrer" className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors" title="Download">
                      <Download className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}