// Quarter logic:
// Q1 = Mar-Apr-May, filed in June (28th)
// Q2 = Jun-Jul-Aug, filed in September (28th)
// Q3 = Sep-Oct-Nov, filed in December (28th)
// Q4 = Dec-Jan-Feb, filed in March (28th)

export const QUARTERS = {
  Q1: { months: [2, 3, 4],  name: 'Q1', label: 'Mar – May', filingMonth: 5,  color: 'purple' },
  Q2: { months: [5, 6, 7],  name: 'Q2', label: 'Jun – Aug', filingMonth: 8,  color: 'teal' },
  Q3: { months: [8, 9, 10], name: 'Q3', label: 'Sep – Nov', filingMonth: 11, color: 'amber' },
  Q4: { months: [11, 0, 1], name: 'Q4', label: 'Dec – Feb', filingMonth: 2,  color: 'coral' },
};

export const QUARTER_COLORS = {
  purple: { bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-200', solid: 'bg-purple-500', light: 'bg-purple-50' },
  teal:   { bg: 'bg-teal-100',   text: 'text-teal-700',   border: 'border-teal-200',   solid: 'bg-teal-500',   light: 'bg-teal-50' },
  amber:  { bg: 'bg-amber-100',  text: 'text-amber-700',  border: 'border-amber-200',  solid: 'bg-amber-500',  light: 'bg-amber-50' },
  coral:  { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-200', solid: 'bg-orange-500', light: 'bg-orange-50' },
};

export function getQuarterForMonth(monthIndex) {
  for (const [key, q] of Object.entries(QUARTERS)) {
    if (q.months.includes(monthIndex)) return { key, ...q };
  }
  return null;
}

export function getCurrentQuarter() {
  const now = new Date();
  return getQuarterForMonth(now.getMonth());
}

// Returns the filing deadline date for a given quarter and year
// Deadline is always the 28th of the filing month
// Q4 spans Dec-Feb, so filing in March is the following year
export function getFilingDeadline(quarterKey, year) {
  const q = QUARTERS[quarterKey];
  // Q4 starts in Dec; the filing month (March) is in the next year
  const filingYear = quarterKey === 'Q4' ? year + 1 : year;
  return new Date(filingYear, q.filingMonth, 28);
}

// Returns the next upcoming filing deadline
export function getNextFilingDeadline() {
  const now = new Date();
  const year = now.getFullYear();

  // Check all quarters this year and next
  const candidates = [];
  for (const key of ['Q1', 'Q2', 'Q3', 'Q4']) {
    candidates.push({ key, deadline: getFilingDeadline(key, year) });
    candidates.push({ key, deadline: getFilingDeadline(key, year + 1) });
  }

  const future = candidates.filter(c => c.deadline >= now).sort((a, b) => a.deadline - b.deadline);
  return future[0] || null;
}

export function getDaysRemaining(date) {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);
  return Math.ceil((target - now) / (1000 * 60 * 60 * 24));
}

export function getFilingMonthName(quarterKey, year) {
  const q = QUARTERS[quarterKey];
  const filingYear = quarterKey === 'Q4' ? year + 1 : year;
  return new Date(filingYear, q.filingMonth, 1).toLocaleString('default', { month: 'long', year: 'numeric' });
}

// Given a filing's period_start, determine which quarter it belongs to
export function getQuarterFromPeriod(periodStart) {
  if (!periodStart) return null;
  const d = new Date(periodStart);
  return getQuarterForMonth(d.getMonth());
}

export const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];