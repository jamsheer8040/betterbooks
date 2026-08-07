import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Users, Clock, CheckCircle, FileText, ArrowRight, AlertTriangle, Download, ShieldAlert, Check } from 'lucide-react';
import { getCurrentQuarter, getNextFilingDeadline, getDaysRemaining, QUARTER_COLORS, QUARTERS } from '@/utils/quarterUtils';

const WhatsAppIcon = ({ className }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
);

function StatCard({ title, value, icon: Icon, iconBg, iconColor }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-center justify-between">
      <div>
        <p className="text-sm text-gray-500 mb-1">{title}</p>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
      </div>
      <div className={`w-11 h-11 rounded-full flex items-center justify-center ${iconBg}`}>
        <Icon className={`w-5 h-5 ${iconColor}`} />
      </div>
    </div>
  );
}

function daysUntil(dateStr) {
  if (!dateStr) return null;
  const diff = new Date(dateStr) - new Date();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function sendWhatsAppReminder(item) {
  const wa = item.mobile || item.whatsapp_number;
  if (!wa) { alert(`No contact number available for ${item.customer_name}.`); return; }
  const days = item.days;
  const status = days < 0 ? `has EXPIRED (${item.expiry_date})` : `expires in ${days} day${days === 1 ? '' : 's'} (${item.expiry_date})`;
  const msg = encodeURIComponent(
    `Dear ${item.customer_name},\n\nThis is a reminder that your document *${item.label}* ${status}.\n\nPlease ensure prompt renewal to maintain compliance.\n\nThank you,\nVAT Manager`
  );
  window.open(`https://wa.me/${wa.replace(/\D/g, '')}?text=${msg}`, '_blank');
}

export default function Dashboard() {
  const [customers, setCustomers] = useState([]);
  const [filings, setFilings] = useState([]);
  const [milestones, setMilestones] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      base44.entities.Customer.list('-created_date', 1000),
      base44.entities.Filing.list('-created_date', 100),
      base44.entities.FilingMilestone.list('-created_date', 500),
    ]).then(([c, f, m]) => {
      setCustomers(c);
      setFilings(f);
      setMilestones(m);
      setLoading(false);
    });
  }, []);

  const activeCustomers = customers.filter(c => c.status === 'active').length;
  const draftFilings = filings.filter(f => f.status === 'draft').length;
  const filedFilings = filings.filter(f => f.status === 'filed').length;
  const totalVAT = filings.reduce((sum, f) => sum + (f.net_vat_payable || 0), 0);

  // Extract all critical / expiring documents across all customers
  const expiringDocs = useMemo(() => {
    const list = [];
    customers.forEach(c => {
      // Check trade license expiry on customer object
      if (c.trade_license_expiry) {
        const days = daysUntil(c.trade_license_expiry);
        if (days !== null && days <= 30) {
          list.push({
            id: `${c.id}-tl`,
            label: 'Trade License',
            customer_id: c.id,
            customer_name: c.name,
            expiry_date: c.trade_license_expiry,
            days,
            mobile: c.mobile || c.phone,
            file_url: c.trade_license_url,
          });
        }
      }
      // Check documents array
      (c.documents || []).forEach(d => {
        if (!d.expiry_date) return;
        const days = daysUntil(d.expiry_date);
        if (days !== null && days <= 30) {
          list.push({
            id: d.id || `${c.id}-${d.label}`,
            label: d.label || 'Document',
            owner_name: d.owner_name,
            customer_id: c.id,
            customer_name: c.name,
            expiry_date: d.expiry_date,
            days,
            mobile: c.mobile || c.phone,
            file_url: d.file_url,
          });
        }
      });
    });
    return list.sort((a, b) => a.days - b.days);
  }, [customers]);

  const expiredCount = expiringDocs.filter(d => d.days < 0).length;
  const criticalCount = expiringDocs.filter(d => d.days >= 0 && d.days <= 14).length;

  const currentMonthIdx = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const currentMonthName = ['January','February','March','April','May','June','July','August','September','October','November','December'][currentMonthIdx];
  const currentMonthShort = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][currentMonthIdx];
  const currentMonthKey = `${currentMonthShort}-${currentYear}`;

  // Current month due customers + filings
  const dashboardFilingItems = customers.filter(c => {
    if (c.status !== 'active') return false;
    const cycle = c.filing_cycle || 'Jan-Apr-Jul-Oct';
    const cycleMonths = {
      'Jan-Apr-Jul-Oct': [0, 3, 6, 9],
      'Feb-May-Aug-Nov': [1, 4, 7, 10],
      'Mar-Jun-Sep-Dec': [2, 5, 8, 11],
    }[cycle] || [0, 3, 6, 9];
    return cycleMonths.includes(currentMonthIdx);
  }).map(cust => {
    const filing = filings.find(f => f.customer_id === cust.id && f.filing_month === `${currentMonthName} ${currentYear}`);
    const milestone = milestones.find(m => m.customer_id === cust.id && m.month_key === currentMonthKey);
    return {
      id: filing ? filing.id : `due-${cust.id}`,
      customerId: cust.id,
      customerName: cust.name,
      monthLabel: `${currentMonthName} ${currentYear}`,
      filing,
      milestone,
    };
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 text-sm mt-0.5">Overview of your VAT filings & operations</p>
        </div>
        <Link
          to="/filings/new"
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          <FileText className="w-4 h-4" />
          New Filing
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard title="Active Customers" value={loading ? '—' : activeCustomers} icon={Users} iconBg="bg-blue-50" iconColor="text-blue-500" />
        <StatCard title="Draft Filings" value={loading ? '—' : draftFilings} icon={Clock} iconBg="bg-yellow-50" iconColor="text-yellow-500" />
        <StatCard title="Filed" value={loading ? '—' : filedFilings} icon={CheckCircle} iconBg="bg-green-50" iconColor="text-green-500" />
      </div>

      {/* Critical Documents Expiry Alerts Section */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-2xs">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center">
              <ShieldAlert className="w-4 h-4 text-amber-600" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                Critical Document Expiry Alerts
                {expiringDocs.length > 0 && (
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700">
                    {expiringDocs.length} Alert{expiringDocs.length > 1 ? 's' : ''}
                  </span>
                )}
              </h2>
              <p className="text-xs text-gray-500">Documents expired or expiring within 30 days</p>
            </div>
          </div>
          <Link to="/documents" className="text-blue-600 hover:text-blue-700 text-sm flex items-center gap-1 font-medium">
            Document Tracker <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {loading ? (
          <div className="text-center py-6 text-gray-400 text-sm">Checking document expiry dates...</div>
        ) : expiringDocs.length === 0 ? (
          <div className="bg-green-50/60 border border-green-200/80 rounded-xl p-4 flex items-center gap-3 text-sm text-green-800">
            <div className="w-7 h-7 rounded-full bg-green-500 flex items-center justify-center text-white shrink-0">
              <Check className="w-4 h-4" />
            </div>
            <div>
              <p className="font-semibold text-green-900">All customer documents are up to date</p>
              <p className="text-xs text-green-700">No licenses, passports, or IDs are expiring within the next 30 days.</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {expiringDocs.slice(0, 6).map(doc => {
              const isExpired = doc.days < 0;
              const isCritical = doc.days >= 0 && doc.days <= 14;

              return (
                <div
                  key={doc.id}
                  className={`rounded-xl border p-3.5 flex flex-col justify-between gap-3 transition-all ${
                    isExpired
                      ? 'bg-red-50/40 border-red-200'
                      : isCritical
                      ? 'bg-orange-50/40 border-orange-200'
                      : 'bg-amber-50/30 border-amber-200'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-xs font-bold text-gray-900 truncate">{doc.label}</p>
                      <Link to={`/customers/${doc.customer_id}`} className="text-xs font-medium text-blue-600 hover:underline truncate block">
                        {doc.customer_name}
                      </Link>
                      {doc.owner_name && <p className="text-[11px] text-gray-500 truncate">Owner: {doc.owner_name}</p>}
                    </div>
                    <span
                      className={`text-[11px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                        isExpired
                          ? 'bg-red-100 text-red-800'
                          : isCritical
                          ? 'bg-orange-100 text-orange-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {isExpired ? `Expired ${Math.abs(doc.days)}d ago` : `${doc.days}d left`}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-gray-100/80">
                    <span className="text-[11px] text-gray-500 font-mono">
                      Due: {doc.expiry_date}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => sendWhatsAppReminder(doc)}
                        className="flex items-center gap-1 text-[11px] font-semibold text-green-700 bg-green-50 hover:bg-green-100 border border-green-200 px-2 py-1 rounded-lg transition-colors cursor-pointer"
                        title="Send WhatsApp Reminder"
                      >
                        <WhatsAppIcon className="w-3.5 h-3.5" /> Remind
                      </button>
                      {doc.file_url && (
                        <a
                          href={doc.file_url}
                          download
                          target="_blank"
                          rel="noreferrer"
                          className="p-1 text-gray-400 hover:text-blue-600 rounded-lg hover:bg-gray-100"
                          title="Download Document"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-gray-900">Current Filing Overview ({currentMonthName} {currentYear})</h2>
          <Link to="/filings" className="text-blue-600 hover:text-blue-700 text-sm flex items-center gap-1 font-medium">
            View all <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
        {loading ? (
          <div className="text-center py-8 text-gray-400">Loading...</div>
        ) : dashboardFilingItems.length === 0 ? (
          <div className="text-center py-8 text-gray-400">No active filings due for {currentMonthName} {currentYear}</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {dashboardFilingItems.map(item => {
              const m = item.milestone;
              const f = item.filing;
              const isInitiated = !!m?.is_initiated || !!f;
              const isSubmitted = !!m?.submission_done || f?.status === 'filed';

              // Badge 1: Submission
              let subLabel = 'Not Initiated';
              let subStyle = 'bg-gray-50 text-gray-400 border-gray-200 opacity-60';
              let subIconStyle = 'bg-gray-300';

              if (isSubmitted) {
                subLabel = 'Submitted';
                subStyle = 'bg-green-100 text-green-800 border-green-200';
                subIconStyle = 'bg-green-500';
              } else if (isInitiated) {
                subLabel = 'Confirm Done';
                subStyle = 'bg-amber-100 text-amber-800 border-amber-200';
                subIconStyle = 'bg-amber-500';
              }

              // Badge 2: Payment
              const isPaid = !!m?.payment_done;
              const payLabel = isPaid ? 'Paid' : 'Payment Pending';
              const payStyle = isPaid ? 'bg-green-100 text-green-800 border-green-200' : 'bg-gray-50 text-gray-400 border-gray-200 opacity-60';
              const payIconStyle = isPaid ? 'bg-green-500' : 'bg-gray-300';

              // Badge 3: Service Charge
              const isCollected = !!m?.service_charge_done;
              const svcLabel = isCollected ? 'Collected' : 'Service Charge Pending';
              const svcStyle = isCollected ? 'bg-purple-100 text-purple-800 border-purple-200' : 'bg-gray-50 text-gray-400 border-gray-200 opacity-60';
              const svcIconStyle = isCollected ? 'bg-purple-500' : 'bg-gray-300';

              const badges = [
                { label: subLabel, style: subStyle, iconStyle: subIconStyle },
                { label: payLabel, style: payStyle, iconStyle: payIconStyle },
                { label: svcLabel, style: svcStyle, iconStyle: svcIconStyle },
              ];

              return (
                <Link
                  key={item.id}
                  to="/filings"
                  className="flex flex-col gap-3 py-3 hover:bg-gray-50 px-2 -mx-2 rounded-lg transition-colors lg:flex-row lg:items-center lg:justify-between"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-semibold text-sm shrink-0">
                      {(item.customerName || 'U')[0].toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{item.customerName}</p>
                      <p className="text-xs text-gray-500">{item.monthLabel}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 lg:w-[620px]">
                    {badges.map((b, idx) => (
                      <div key={idx} className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-2 text-xs font-medium ${b.style}`}>
                        <span className={`w-4 h-4 rounded-full border border-white shadow-2xs flex items-center justify-center ${b.iconStyle}`}>
                          <CheckCircle className="w-3 h-3 text-white" />
                        </span>
                        {b.label}
                      </div>
                    ))}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}