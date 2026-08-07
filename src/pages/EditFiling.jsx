import { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { ArrowLeft, Calendar, Calculator, Plus, Trash2, Info, CheckCircle2 } from 'lucide-react';

const CYCLE_MONTH_INDICES = {
  'Jan-Apr-Jul-Oct': [0, 3, 6, 9],
  'Feb-May-Aug-Nov': [1, 4, 7, 10],
  'Mar-Jun-Sep-Dec': [2, 5, 8, 11],
};

function getCycleFilingMonths(filingCycle) {
  const indices = CYCLE_MONTH_INDICES[filingCycle] || CYCLE_MONTH_INDICES['Jan-Apr-Jul-Oct'];
  const months = [];
  const now = new Date();
  for (let year = now.getFullYear() - 1; year <= now.getFullYear() + 1; year++) {
    for (const monthIdx of indices) {
      const d = new Date(year, monthIdx, 1);
      months.push({ value: d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }), date: d });
    }
  }
  months.sort((a, b) => a.date - b.date);
  return months;
}

function getCycleInfo(filingMonthDate, customer) {
  const cycle = customer?.filing_cycle || 'Jan-Apr-Jul-Oct';
  const cycleMonths = CYCLE_MONTH_INDICES[cycle] || CYCLE_MONTH_INDICES['Jan-Apr-Jul-Oct'];
  const m = filingMonthDate.getMonth();
  // Quarter is the 3 months ending the month before the filing month.
  const periodEndMonth = m === 0 ? 11 : m - 1;
  const periodEndYear = m === 0 ? filingMonthDate.getFullYear() - 1 : filingMonthDate.getFullYear();
  const quarterStartMonth = periodEndMonth - 2;
  const periodStart = new Date(periodEndYear, quarterStartMonth, 1);
  const periodEnd = new Date(periodEndYear, periodEndMonth + 1, 0); // last day of periodEndMonth
  const dueDate = new Date(filingMonthDate.getFullYear(), m, 28);
  const toISO = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const fmtDate = (d) => d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  return {
    periodStart: fmtDate(periodStart),
    periodEnd: fmtDate(periodEnd),
    cycleStr: cycleMonths.map(mi => ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][mi]).join(' – '),
    dueDate: dueDate.toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' }),
    dueDateRaw: toISO(dueDate),
    periodStartRaw: toISO(periodStart),
    periodEndRaw: toISO(periodEnd),
  };
}

export default function EditFiling() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [customers, setCustomers] = useState([]);

  const [customerId, setCustomerId] = useState('');
  const [filingMonth, setFilingMonth] = useState('');
  const [filingDate, setFilingDate] = useState('');
  const [vatInclusive, setVatInclusive] = useState(false);
  const [salesAmount, setSalesAmount] = useState('');
  const [expensesAmount, setExpensesAmount] = useState('');
  const [otherExpenses, setOtherExpenses] = useState([]);
  const [profitMargin, setProfitMargin] = useState(false);
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState('draft');
  const [ftaConfirmed, setFtaConfirmed] = useState(true);
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [companySettings, setCompanySettings] = useState(null);
  const [originalFiling, setOriginalFiling] = useState(null);

  useEffect(() => {
    Promise.all([
      base44.entities.Filing.filter({ id }),
      base44.entities.Customer.list('-name', 100),
      base44.entities.CompanySettings.list(),
    ]).then(([fData, custs, cs]) => {
      setCustomers(custs);
      if (cs && cs.length > 0) setCompanySettings(cs[0]);
      const f = fData[0];
      if (!f) { setLoading(false); return; }
      setOriginalFiling(f);
      setCustomerId(f.customer_id || '');
      setFilingMonth(f.filing_month || '');
      setFilingDate(f.filing_date || new Date().toISOString().split('T')[0]);
      setVatInclusive(!!f.vat_inclusive);
      if (f.vat_inclusive) {
        const sTotal = (f.sales_amount || 0) + (f.sales_vat || 0);
        const eTotal = (f.expenses_amount || 0) + (f.expenses_vat || 0);
        setSalesAmount(sTotal ? String(Number(sTotal.toFixed(2))) : '');
        setExpensesAmount(eTotal ? String(Number(eTotal.toFixed(2))) : '');
      } else {
        setSalesAmount(String(f.sales_amount ?? ''));
        setExpensesAmount(String(f.expenses_amount ?? ''));
      }
      setOtherExpenses((f.other_expenses || []).map(e => ({ label: e.label || '', amount: String(e.amount ?? '') })));
      setProfitMargin(!!f.profit_margin_scheme);
      setNotes(f.notes || '');
      setStatus(f.status || 'draft');
      setPeriodStart(f.period_start || '');
      setPeriodEnd(f.period_end || '');
      setDueDate(f.due_date || '');
      setLoading(false);
    });
  }, [id]);

  const isLocked = originalFiling?.status === 'filed' && companySettings?.allow_edit_filed_filings === false;

  const customer = customers.find(c => c.id === customerId);
  const VAT_RATE = 0.05;
  const sInput = parseFloat(salesAmount) || 0;
  const eInput = parseFloat(expensesAmount) || 0;

  const salesVAT = vatInclusive ? (sInput * 5 / 105) : (sInput * VAT_RATE);
  const salesBase = vatInclusive ? (sInput / 1.05) : sInput;
  const salesBox3 = vatInclusive ? salesBase : (sInput + salesVAT);

  const expensesVAT = vatInclusive ? (eInput * 5 / 105) : (eInput * VAT_RATE);
  const expensesBase = vatInclusive ? (eInput / 1.05) : eInput;
  const expensesBox3 = vatInclusive ? expensesBase : (eInput + expensesVAT);

  const netVAT = salesVAT - expensesVAT;
  const totalOther = otherExpenses.reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);
  const netProfit = salesBase - expensesBase - totalOther;
  const fmt = (n) => n.toFixed(2);

  const handleSave = async () => {
    if (isLocked) {
      return alert('Editing Filed returns is disabled in Company Filing Settings.');
    }
    if (originalFiling?.status === 'filed' && status === 'draft' && companySettings?.allow_edit_filed_filings === false) {
      return alert('Reverting status from Filed to Draft is disabled in Company Filing Settings.');
    }
    if (!customerId) return alert('Please select a customer');
    const sel = customers.find(c => c.id === customerId);
    // Recompute period/due if filing month changed and customer cycle available
    let ps = periodStart, pe = periodEnd, dd = dueDate;
    const monthOptions = customer ? getCycleFilingMonths(customer.filing_cycle) : getCycleFilingMonths('Jan-Apr-Jul-Oct');
    const matched = monthOptions.find(m => m.value === filingMonth);
    let ci = null;
    if (matched && customer) {
      ci = getCycleInfo(matched.date, customer);
      ps = ci.periodStartRaw; pe = ci.periodEndRaw; dd = ci.dueDateRaw;
    }
    if (ci && filingDate < ci.periodEndRaw) {
      return alert(`Filing date cannot be before the period ends (${ci.periodEnd}).`);
    }
    if (status === 'filed' && !ftaConfirmed) {
      return alert('Please confirm that the VAT return has been submitted on the FTA portal.');
    }
    setSaving(true);
    const isFiled = status === 'filed' && ftaConfirmed;

    await base44.entities.Filing.update(id, {
      customer_id: customerId,
      customer_name: sel?.name || '',
      customer_trn: sel?.trn || '',
      filing_month: filingMonth,
      filing_date: filingDate,
      period_start: ps,
      period_end: pe,
      due_date: dd,
      status: isFiled ? 'filed' : 'draft',
      vat_inclusive: vatInclusive,
      sales_amount: salesBase,
      sales_vat: salesVAT,
      expenses_amount: expensesBase,
      expenses_vat: expensesVAT,
      net_vat_payable: netVAT,
      other_expenses: otherExpenses.map(e => ({ label: e.label, amount: parseFloat(e.amount) || 0 })),
      net_profit: netProfit,
      profit_margin_scheme: profitMargin,
      notes,
    });

    // Auto-update FilingMilestone
    if (matched && customer) {
      const monthKey = `${matched.date.toLocaleDateString('en-US', { month: 'short' })}-${matched.date.getFullYear()}`;
      const [milestone] = await base44.entities.FilingMilestone.filter({ customer_id: customerId, month_key: monthKey });
      const mPayload = {
        filing_id: id,
        is_initiated: true,
        submission_done: isFiled,
        submission_date: isFiled ? new Date().toISOString().split('T')[0] : null,
      };
      if (milestone) {
        await base44.entities.FilingMilestone.update(milestone.id, mPayload);
      } else {
        await base44.entities.FilingMilestone.create({ customer_id: customerId, customer_name: sel?.name || '', month_key: monthKey, ...mPayload });
      }
    }
    navigate('/filings');
  };

  const monthOptions = customer ? getCycleFilingMonths(customer.filing_cycle) : getCycleFilingMonths('Jan-Apr-Jul-Oct');

  // Live-compute period info from the selected filing month + customer cycle
  const liveCycleInfo = (() => {
    const matched = monthOptions.find(m => m.value === filingMonth);
    if (matched && customer) return getCycleInfo(matched.date, customer);
    return null;
  })();

  if (loading) return <div className="text-center py-20 text-gray-400">Loading...</div>;

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link to="/filings" className="text-gray-400 hover:text-gray-600"><ArrowLeft className="w-5 h-5" /></Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Edit Filing</h1>
          <p className="text-gray-500 text-sm">Update VAT return filing details</p>
        </div>
      </div>

      {isLocked && (
        <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2.5 text-xs text-amber-800 font-medium">
          <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-amber-900">Editing Locked for Filed Return</p>
            <p className="mt-0.5">Editing and reverting Filed returns is currently disabled in your Company Setup &gt; Filing Settings. To edit or revert this filing, enable "Allow Editing &amp; Reverting Filed Returns" in Company Setup.</p>
          </div>
        </div>
      )}

      {/* Filing Details */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-4">
        <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2 mb-4">
          <Calendar className="w-4 h-4 text-blue-500" /> Filing Details
        </h2>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Filing Date</label>
            <input
              type="date"
              min={liveCycleInfo?.periodEndRaw || undefined}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={filingDate}
              onChange={e => setFilingDate(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Filing Month</label>
            <select
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={filingMonth}
              onChange={e => setFilingMonth(e.target.value)}
            >
              {monthOptions.map(m => (
                <option key={m.value} value={m.value}>{m.value}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Customer</label>
            <select
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={customerId}
              onChange={e => setCustomerId(e.target.value)}
            >
              <option value="">Select a customer</option>
              {customers.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={status}
              onChange={e => setStatus(e.target.value)}
            >
              <option value="draft">Draft</option>
              <option value="filed">Filed</option>
            </select>
          </div>
        </div>
        <div className="bg-blue-50 rounded-lg p-3 flex items-start gap-2">
          <Info className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-blue-700">
            <p><strong>Period:</strong> {liveCycleInfo ? `${liveCycleInfo.periodStart} – ${liveCycleInfo.periodEnd}` : (periodStart ? new Date(periodStart).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—') + ' – ' + (periodEnd ? new Date(periodEnd).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—')}</p>
            <p className="text-xs text-blue-500 mt-0.5">Due: {liveCycleInfo ? liveCycleInfo.dueDate : (dueDate ? new Date(dueDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—')}</p>
          </div>
        </div>
      </div>

      {/* VAT Calculation */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
            <Calculator className="w-4 h-4 text-blue-500" /> VAT Calculation
          </h2>
          <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
            VAT Inclusive
            <button
              onClick={() => setVatInclusive(v => !v)}
              className={`w-10 h-5 rounded-full transition-colors ${vatInclusive ? 'bg-blue-600' : 'bg-gray-200'} relative`}
            >
              <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${vatInclusive ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </button>
          </label>
        </div>

        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center text-green-600 text-xs">↑</div>
            <span className="text-sm font-medium text-gray-700">Total Value of due tax for the period</span>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">{vatInclusive ? 'Amount (incl. VAT)' : 'Amount (excl. VAT)'}</label>
              <input type="number" step="any" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={salesAmount} onChange={e => setSalesAmount(e.target.value)} placeholder="0.00" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">VAT (5%)</label>
              <input type="text" readOnly className="w-full border border-gray-100 bg-gray-50 rounded-lg px-3 py-2 text-sm font-medium text-gray-700" value={fmt(salesVAT)} />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">{vatInclusive ? 'Amount before VAT (auto)' : 'Total (auto)'}</label>
              <input type="text" readOnly className="w-full border border-gray-100 bg-gray-50 rounded-lg px-3 py-2 text-sm font-medium text-gray-700" value={fmt(salesBox3)} />
            </div>
          </div>
        </div>

        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-6 h-6 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 text-xs">↓</div>
            <span className="text-sm font-medium text-gray-700">Total Value of recoverable tax for the period</span>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">{vatInclusive ? 'Amount (incl. VAT)' : 'Amount (excl. VAT)'}</label>
              <input type="number" step="any" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={expensesAmount} onChange={e => setExpensesAmount(e.target.value)} placeholder="0.00" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">VAT (5%)</label>
              <input type="text" readOnly className="w-full border border-gray-100 bg-gray-50 rounded-lg px-3 py-2 text-sm font-medium text-gray-700" value={fmt(expensesVAT)} />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">{vatInclusive ? 'Amount before VAT (auto)' : 'Total (auto)'}</label>
              <input type="text" readOnly className="w-full border border-gray-100 bg-gray-50 rounded-lg px-3 py-2 text-sm font-medium text-gray-700" value={fmt(expensesBox3)} />
            </div>
          </div>
        </div>

        <div className="bg-blue-600 rounded-lg p-4 flex items-center justify-between">
          <div>
            <p className="text-white font-medium text-sm">Payable tax for the period</p>
            <p className="text-blue-200 text-xs">Due Tax − Recoverable Tax</p>
          </div>
          <span className="text-white text-xl font-bold">AED {fmt(netVAT)}</span>
        </div>
      </div>

      {/* Other Expenses */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
            <div className="w-5 h-5 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 text-xs">↓</div>
            Other Expenses
          </h2>
          <button onClick={() => setOtherExpenses(p => [...p, { label: '', amount: '' }])} className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 font-medium">
            <Plus className="w-4 h-4" /> Add Line
          </button>
        </div>
        <div className="space-y-2">
          {otherExpenses.map((exp, i) => (
            <div key={i} className="flex gap-2">
              <input className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Label" value={exp.label} onChange={e => setOtherExpenses(p => p.map((x, j) => j === i ? { ...x, label: e.target.value } : x))} />
              <input type="number" className="w-28 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="0.00" value={exp.amount} onChange={e => setOtherExpenses(p => p.map((x, j) => j === i ? { ...x, amount: e.target.value } : x))} />
              <button onClick={() => setOtherExpenses(p => p.filter((_, j) => j !== i))} className="text-gray-400 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
            </div>
          ))}
        </div>
        <p className="text-sm text-gray-500 mt-3">Total Other Expenses: <strong>AED {fmt(totalOther)}</strong></p>

        <div className="bg-green-600 rounded-lg p-4 flex items-center justify-between mt-4">
          <div>
            <p className="text-white font-medium text-sm">Net Profit</p>
            <p className="text-green-200 text-xs">Sales − Purchases − Other Expenses</p>
          </div>
          <span className="text-white text-xl font-bold">AED {fmt(netProfit)}</span>
        </div>
      </div>

      {/* Profit Margin Scheme */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-4">
        <p className="text-sm font-semibold text-gray-800 mb-1">Profit Margin Scheme — هامش الربح</p>
        <p className="text-xs text-gray-500 mb-3">Did you apply the profit margin scheme in respect of any supplies made during the tax period?</p>
        <p className="text-xs text-gray-400 mb-3 text-right" dir="rtl">هل قمت بتطبيق نظام هامش الربح فيما يتعلق بأي توريدات تم إجراؤها خلال الفترة الضريبية؟</p>
        <div className="flex gap-3">
          {['Yes', 'No'].map(v => (
            <button key={v} onClick={() => setProfitMargin(v === 'Yes')} className={`px-5 py-2 rounded-lg text-sm font-medium border transition-colors ${(v === 'Yes') === profitMargin ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>{v}</button>
          ))}
        </div>
      </div>

      {/* Notes */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">Notes (optional)</label>
        <textarea className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 h-20 resize-none" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Add any notes..." />
      </div>

      {/* Filing Status & FTA Portal Confirmation */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
        <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2 mb-3">
          <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Filing Status
        </h2>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <button
            type="button"
            onClick={() => setStatus('draft')}
            className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${status === 'draft' ? 'border-amber-400 bg-amber-50/60 ring-2 ring-amber-400/20' : 'border-gray-200 hover:bg-gray-50'}`}
          >
            <div className="flex items-center justify-between">
              <span className="font-semibold text-sm text-gray-900">Draft</span>
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            </div>
            <p className="text-xs text-gray-500 mt-1">Filing recorded. Shows as "Confirm Done" in tracker.</p>
          </button>

          <button
            type="button"
            onClick={() => setStatus('filed')}
            className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${status === 'filed' ? 'border-emerald-500 bg-emerald-50/60 ring-2 ring-emerald-500/20' : 'border-gray-200 hover:bg-gray-50'}`}
          >
            <div className="flex items-center justify-between">
              <span className="font-semibold text-sm text-gray-900">Filed</span>
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            </div>
            <p className="text-xs text-gray-500 mt-1">Submitted on FTA portal. Automatically marks status as "Submitted".</p>
          </button>
        </div>

        {status === 'filed' && (
          <div className="mt-3 p-3.5 bg-emerald-50/80 border border-emerald-200 rounded-xl animate-in fade-in duration-150">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={ftaConfirmed}
                onChange={e => setFtaConfirmed(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
              />
              <div>
                <span className="text-xs font-bold text-emerald-900 block">FTA EmaraTax Portal Submission Confirmed</span>
                <span className="text-xs text-emerald-700">Confirm that this VAT return has been officially submitted on the FTA portal (confirmation email / filing receipt verified).</span>
              </div>
            </label>
          </div>
        )}
      </div>

      <div className="flex justify-end gap-3">
        <Link to="/filings" className="px-5 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors">Cancel</Link>
        <button onClick={handleSave} disabled={saving || isLocked} className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
}