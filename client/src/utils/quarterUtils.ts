export const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export const MONTH_NAMES_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

export const FILING_CYCLES = [
  { value: 'Jan-Apr-Jul-Oct', label: 'Jan - Apr - Jul - Oct (Cycle 1)' },
  { value: 'Feb-May-Aug-Nov', label: 'Feb - May - Aug - Nov (Cycle 2)' },
  { value: 'Mar-Jun-Sep-Dec', label: 'Mar - Jun - Sep - Dec (Cycle 3)' },
];

export function getFilingMonthsForCycle(cycle: string): number[] {
  switch (cycle) {
    case 'Jan-Apr-Jul-Oct':
      return [1, 4, 7, 10];
    case 'Feb-May-Aug-Nov':
      return [2, 5, 8, 11];
    case 'Mar-Jun-Sep-Dec':
      return [3, 6, 9, 12];
    default:
      return [1, 4, 7, 10];
  }
}

export function isFilingMonth(cycle: string, monthIndex: number): boolean {
  const months = getFilingMonthsForCycle(cycle);
  return months.includes(monthIndex + 1);
}

export function getQuarterPeriodForFilingMonth(filingMonth: number, year: number) {
  // A filing month covers the preceding 3 months
  // e.g. Filing Month 1 (Jan) -> Oct 1 to Dec 31 of year-1
  let endMonth = filingMonth - 1;
  let endYear = year;
  if (endMonth === 0) {
    endMonth = 12;
    endYear = year - 1;
  }

  let startMonth = endMonth - 2;
  let startYear = endYear;
  if (startMonth <= 0) {
    startMonth += 12;
    startYear -= 1;
  }

  const startDate = new Date(startYear, startMonth - 1, 1);
  const endDate = new Date(endYear, endMonth, 0); // Last day of endMonth
  const dueDate = new Date(year, filingMonth - 1, 28); // 28th of filing month

  return {
    start_date: startDate.toISOString().split('T')[0],
    end_date: endDate.toISOString().split('T')[0],
    due_date: dueDate.toISOString().split('T')[0],
    period_label: `${MONTH_NAMES_SHORT[startMonth - 1]} ${startYear} – ${MONTH_NAMES_SHORT[endMonth - 1]} ${endYear}`,
    filing_month_label: `${MONTH_NAMES[filingMonth - 1]} ${year}`,
  };
}

export function calculateDaysRemaining(dueDateStr: string): number {
  if (!dueDateStr) return 0;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const due = new Date(dueDateStr);
  due.setHours(0, 0, 0, 0);
  const diffTime = due.getTime() - now.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}
