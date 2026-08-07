import { useEffect, useState, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { ArrowLeft, Calendar, Calculator, Plus, Trash2, Info, CheckCircle2 } from 'lucide-react';
import { addMonths, format, endOfMonth } from 'date-fns';

const CYCLE_MONTH_INDICES = {
  'Jan-Apr-Jul-Oct': [0, 3, 6, 9],
  'Feb-May-Aug-Nov': [1, 4, 7, 10],
  'Mar-Jun-Sep-Dec': [2, 5, 8, 11],
};

function getCycleFilingMonths(filingCycle) {
  const indices = CYCLE_MONTH_INDICES[filingCycle] || CYCLE_MONTH_INDICES['Jan-Apr-Jul-Oct'];
  const months = [];
  const now = new Date();
  const currentYr = now.getFullYear();
  const currentMonthIdx = now.getMonth();

  for (let year = currentYr - 1; year <= currentYr; year++) {
    for (const monthIdx of indices) {
      if (year === currentYr && monthIdx > currentMonthIdx) continue; // Do not include future months
      const d = new Date(year, monthIdx, 1);
      months.push({ value: format(d, 'MMMM yyyy'), date: d });
    }
  }
  months.sort((a, b) => a.date - b.date);
  return months;
}

function getQuickFilingMonths() {
  const months = [];
  const now = new Date();
  const currentYr = now.getFullYear();
  const currentMonthIdx = now.getMonth();

  // Recent 5 months (Aug, Jul, Jun, May, Apr)
  for (let i = 0; i < 5; i++) {
    const d = new Date(currentYr, currentMonthIdx - i, 1);
    months.push({ value: format(d, 'MMMM yyyy'), date: d });
  }
  return months;
}

// Does the given customer's filing cycle include the selected month?
function cycleIncludesMonth(customer, monthDate) {
  if (!monthDate) return false;
  const indices = CYCLE_MONTH_INDICES[customer?.filing_cycle] || CYCLE_MONTH_INDICES['Jan-Apr-Jul-Oct'];
  return indices.includes(monthDate.getMonth());
}

function getCycleInfo(filingMonthDate, customer) {
  const cycle = customer?.filing_cycle || 'Jan-Apr-Jul-Oct';
  const cycleMonths = {
    'Jan-Apr-Jul-Oct': [0, 3, 6, 9],
    'Feb-May-Aug-Nov': [1, 4, 7, 10],
    'Mar-Jun-Sep-Dec': [2, 5, 8, 11],
  }[cycle] || [0, 3, 6, 9];

  const m = filingMonthDate.getMonth();
  // Find which quarter this filing covers (month before the filing month)
  const filingMonth = m;
  // The period ends the month before the filing month
  const periodEndMonth = filingMonth === 0 ? 11 : filingMonth - 1;
  const periodEndYear = filingMonth === 0 ? filingMonthDate.getFullYear() - 1 : filingMonthDate.getFullYear();
  const periodStart = new Date(periodEndYear, periodEndMonth - 2, 1);
  const periodEnd = endOfMonth(new Date(periodEndYear, periodEndMonth, 1));
  const dueDate = new Date(filingMonthDate.getFullYear(), filingMonth, 28);

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const cycleStr = cycleMonths.map(m => monthNames[m]).join(' – ');

  return {
    periodStart: format(periodStart, 'dd MMM yyyy'),
    periodEnd: format(periodEnd, 'dd MMM yyyy'),
    cycleStr,
    dueDate: format(dueDate, 'd MMMM yyyy'),
    dueDateRaw: format(dueDate, 'yyyy-MM-dd'),
    periodStartRaw: format(periodStart, 'yyyy-MM-dd'),
    periodEndRaw: format(periodEnd, 'yyyy-MM-dd'),
  };
}

export default function NewFiling() {
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const preselectedCustomerId = urlParams.get('customerId') || '';
  const preselectedFilingMonth = urlParams.get('filingMonth') || '';
  const [customers, setCustomers] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(null);
  const [customerId, setCustomerId] = useState(preselectedCustomerId);
  const [vatInclusive, setVatInclusive] = useState(false);
  const [salesAmount, setSalesAmount] = useState('');
  const [expensesAmount, setExpensesAmount] = useState('');
  const [otherExpenses, setOtherExpenses] = useState([{ label: 'Salary Allowance', amount: '' }]);
  const [profitMargin, setProfitMargin] = useState(false);
  const [notes, setNotes] = useState('');
  const [filingDate, setFilingDate] = useState(new Date().toISOString().split('T')[0]);
  const [saving, setSaving] = useState(false);
  const status = 'draft'; // Locked to draft for initial creation
  const [customMonths, setCustomMonths] = useState([]);
  const [showCustomPicker, setShowCustomPicker] = useState(false);
  const [pickerMonth, setPickerMonth] = useState(0);
  const [pickerYear, setPickerYear] = useState(new Date().getFullYear() - 1);

  const [existingFilings, setExistingFilings] = useState([]);

  useEffect(() => {
    Promise.all([
      base44.entities.Customer.list('-name', 100),
      base44.entities.Filing.list('-created_date', 500),
    ]).then(([c, f]) => { setCustomers(c); setExistingFilings(f); });
  }, []);

  const customer = customers.find(c => c.id === customerId);

  const quickMonths = getQuickFilingMonths();

  // If preselectedFilingMonth from URL is not in quickMonths, add it dynamically
  const customMonthsWithUrl = useMemo(() => {
    if (!preselectedFilingMonth) return customMonths;
    const exists = quickMonths.some(m => m.value === preselectedFilingMonth) || customMonths.some(m => m.value === preselectedFilingMonth);
    if (exists) return customMonths;

    const parts = preselectedFilingMonth.split(' ');
    if (parts.length === 2) {
      const monthName = parts[0];
      const yr = parseInt(parts[1]);
      const fullMonths = ['January','February','March','April','May','June','July','August','September','October','November','December'];
      const mIdx = fullMonths.indexOf(monthName);
      if (mIdx !== -1 && !isNaN(yr)) {
        const d = new Date(yr, mIdx, 1);
        return [...customMonths, { value: preselectedFilingMonth, date: d }];
      }
    }
    return customMonths;
  }, [preselectedFilingMonth, customMonths, quickMonths]);

  const filingMonths = [
    ...quickMonths,
    ...customMonthsWithUrl.filter(cm => !quickMonths.some(qm => qm.value === cm.value)),
  ];

  // Set initial filing month from URL param or default to current month
  useEffect(() => {
    if (preselectedFilingMonth) {
      const requested = filingMonths.find(m => m.value === preselectedFilingMonth);
      if (requested) setSelectedMonth(requested);
    } else if (!selectedMonth && filingMonths.length > 0) {
      const now = new Date();
      const current = filingMonths.find(m =>
        m.date.getFullYear() === now.getFullYear() && m.date.getMonth() === now.getMonth()
      );
      setSelectedMonth(current || filingMonths[0]);
    }
  }, [preselectedFilingMonth, filingMonths]);

  // Set initial customerId from URL parameter when customers load
  useEffect(() => {
    if (preselectedCustomerId && customers.length > 0) {
      setCustomerId(preselectedCustomerId);
    }
  }, [preselectedCustomerId, customers]);

  // Only show customers whose filing cycle includes the selected filing month.
  const eligibleCustomers = customers.filter(c => cycleIncludesMonth(c, selectedMonth?.date));

  const cycleInfo = getCycleInfo(selectedMonth?.date || new Date(), customer);

  // Check if a customer already has a filing for the currently selected period
  const hasFilingForPeriod = (cust) => {
    if (!selectedMonth) return false;
    return existingFilings.some(f => {
      if (f.customer_id !== cust.id) return false;
      // Match by filing_month string (e.g. "January 2026")
      if (f.filing_month === selectedMonth.value) return true;
      // Also match by period_start falling in the same month
      if (f.period_start) {
        const d = new Date(f.period_start);
        return d.getFullYear() === selectedMonth.date.getFullYear() && d.getMonth() === selectedMonth.date.getMonth();
      }
      return false;
    });
  };

  // Get the next filing period label for a customer after the currently selected month
  const getNextPeriodLabel = (cust) => {
    const months = getCycleFilingMonths(cust.filing_cycle || 'Jan-Apr-Jul-Oct');
    const next = months.find(m => m.date > selectedMonth?.date);
    return next ? next.value : null;
  };

  const alreadyFiled = customer ? hasFilingForPeriod(customer) : false;
  const nextPeriodLabel = customer && alreadyFiled ? getNextPeriodLabel(customer) : null;
  const isFuturePeriod = selectedMonth ? new Date(cycleInfo.periodEndRaw) > new Date() : false;

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

  const save = async () => {
    if (!customerId) return alert('Please select a customer');
    if (!selectedMonth) return alert('Please select a filing month');
    if (isFuturePeriod) {
      return alert(`Future period filing is not allowed. Sales details for ${selectedMonth?.value} cannot be submitted until the period ends on ${cycleInfo.periodEnd}.`);
    }
    if (alreadyFiled) return alert(`This customer already has a filing for ${selectedMonth.value}. Next available period: ${nextPeriodLabel || 'check cycle'}.`);
    if (filingDate < cycleInfo.periodEndRaw) {
      return alert(`Filing date cannot be before the period ends (${cycleInfo.periodEnd}).`);
    }
    setSaving(true);
    const sel = customers.find(c => c.id === customerId);

    const filing = await base44.entities.Filing.create({
      customer_id: customerId,
      customer_name: sel?.name || '',
      customer_trn: sel?.trn || '',
      filing_month: selectedMonth.value,
      filing_date: filingDate,
      period_start: cycleInfo.periodStartRaw,
      period_end: cycleInfo.periodEndRaw,
      due_date: cycleInfo.dueDateRaw,
      status: 'draft',
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
    const monthKey = format(selectedMonth.date, 'MMM-yyyy');
    const [milestone] = await base44.entities.FilingMilestone.filter({ customer_id: customerId, month_key: monthKey });
    const mPayload = {
      customer_id: customerId,
      customer_name: sel?.name || '',
      month_key: monthKey,
      filing_id: filing.id,
      is_initiated: true,
      submission_done: false,
      submission_date: null,
    };
    if (milestone) {
      await base44.entities.FilingMilestone.update(milestone.id, mPayload);
    } else {
      await base44.entities.FilingMilestone.create(mPayload);
    }
    navigate('/filings');
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link to="/filings" className="text-gray-400 hover:text-gray-600"><ArrowLeft className="w-5 h-5" /></Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">New VAT Filing</h1>
          <p className="text-gray-500 text-sm">Create a new VAT return filing</p>
        </div>
      </div>

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
              min={cycleInfo.periodEndRaw}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={filingDate}
              onChange={e => setFilingDate(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Filing Month</label>
            <div className="flex gap-2 items-center">
              <select
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={selectedMonth?.value || ''}
                onChange={e => {
                  if (e.target.value === '__custom__') {
                    setShowCustomPicker(true);
                  } else {
                    setSelectedMonth(filingMonths.find(m => m.value === e.target.value));
                  }
                }}
              >
                {filingMonths.map(m => (
                  <option key={m.value} value={m.value}>{m.value}</option>
                ))}
                <option value="__custom__">+ Select Older Month &amp; Year...</option>
              </select>
              <button
                type="button"
                onClick={() => setShowCustomPicker(true)}
                title="Pick custom older month and year"
                className="px-2.5 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 text-blue-600 font-semibold flex items-center gap-1 text-xs whitespace-nowrap bg-white shadow-xs"
              >
                <Plus className="w-4 h-4 text-blue-600" />
                <span>Custom</span>
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-1">Covers {cycleInfo.periodStart} – {cycleInfo.periodEnd}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Customer</label>
            <select
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={customerId}
              onChange={e => setCustomerId(e.target.value)}
            >
              <option value="">Select a customer</option>
              {eligibleCustomers.map(c => {
                const filed = hasFilingForPeriod(c);
                return (
                  <option key={c.id} value={c.id} disabled={filed}>
                    {c.name}{filed ? ' — already filed' : ''}
                  </option>
                );
              })}
            </select>
            {selectedMonth && eligibleCustomers.length === 0 && (
              <p className="text-xs text-amber-500 mt-1">No customers file in {selectedMonth.value}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Customer Address</label>
            <div className="w-full border border-gray-100 bg-gray-50 rounded-lg px-3 py-2 text-sm text-gray-600 min-h-[38px]">
              {customer?.address || <span className="text-gray-400">No address available</span>}
            </div>
          </div>
        </div>
        <div className="bg-blue-50 rounded-lg p-3 flex items-start gap-2">
          <Info className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-blue-700">
            <p><strong>Covers:</strong> {cycleInfo.periodStart} – {cycleInfo.periodEnd}</p>
            <p className="text-xs text-blue-500 mt-0.5">Cycle: {cycleInfo.cycleStr} · Due: {cycleInfo.dueDate}</p>
          </div>
        </div>
        {alreadyFiled && (
          <div className="mt-3 bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
            <Info className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-red-700">
              <p className="font-semibold">Already filed for {selectedMonth?.value}</p>
              <p className="text-xs text-red-500 mt-0.5">
                {nextPeriodLabel ? `Next available period: ${nextPeriodLabel}` : 'Check the customer\'s filing cycle.'}
              </p>
            </div>
          </div>
        )}
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

        {/* Sales */}
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

        {/* Expenses */}
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

      {/* Initial Filing Status Notice */}
      <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-5 mb-6">
        <h2 className="text-sm font-semibold text-amber-900 flex items-center gap-2 mb-1.5">
          <CheckCircle2 className="w-4 h-4 text-amber-600" /> Initial Filing Status: Draft
        </h2>
        <p className="text-xs text-amber-800 leading-relaxed">
          New filings must be saved as <strong>Draft</strong> first. Saving initiates the return and sets status to <strong>"Confirm Done"</strong> on the tracker. After submitting on the FTA EmaraTax portal, you can mark it as <strong>Filed</strong> from the tracker or edit page.
        </p>
      </div>

      {isFuturePeriod && (
        <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-sm flex items-center gap-3">
          <Info className="w-5 h-5 text-amber-600 flex-shrink-0" />
          <div>
            <p className="font-semibold">Future Period Filing Not Allowed</p>
            <p className="text-xs text-amber-700 mt-0.5">
              Tax returns cannot be submitted for future periods ({selectedMonth?.value}). Sales and expense data cannot be verified until the tax period ends on <strong>{cycleInfo.periodEnd}</strong>.
            </p>
          </div>
        </div>
      )}

      <div className="flex justify-end gap-3">
        <Link to="/filings" className="px-5 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors">Cancel</Link>
        <button onClick={save} disabled={saving || !customerId || alreadyFiled || isFuturePeriod} className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50">
          {saving ? 'Saving...' : 'Save Filing'}
        </button>
      </div>

      {/* Custom Month & Year Picker Modal */}
      {showCustomPicker && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-xl max-w-sm w-full p-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-blue-600" /> Select Filing Month &amp; Year
              </h3>
              <button onClick={() => setShowCustomPicker(false)} className="text-gray-400 hover:text-gray-600 text-lg font-semibold">✕</button>
            </div>
            <p className="text-xs text-gray-500 mb-4">Choose an older filing month and year prior to recent periods.</p>

            <div className="grid grid-cols-2 gap-3 mb-6">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Month</label>
                <select
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={pickerMonth}
                  onChange={e => setPickerMonth(parseInt(e.target.value))}
                >
                  {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map((m, idx) => (
                    <option key={m} value={idx}>{m}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Year</label>
                <select
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={pickerYear}
                  onChange={e => setPickerYear(parseInt(e.target.value))}
                >
                  {[2026, 2025, 2024, 2023, 2022, 2021, 2020].map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button onClick={() => setShowCustomPicker(false)} className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
              <button
                onClick={() => {
                  const d = new Date(pickerYear, pickerMonth, 1);
                  const now = new Date();
                  if (pickerYear > now.getFullYear() || (pickerYear === now.getFullYear() && pickerMonth > now.getMonth())) {
                    alert('Future filing months are not allowed.');
                    return;
                  }
                  const monthObj = { value: format(d, 'MMMM yyyy'), date: d };
                  setCustomMonths(prev => [...prev, monthObj]);
                  setSelectedMonth(monthObj);
                  setShowCustomPicker(false);
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium"
              >
                Apply Month
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}