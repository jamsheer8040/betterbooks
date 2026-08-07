import {
  startOfDay, endOfDay, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter,
  startOfYear, endOfYear, subMonths, subQuarters, subYears,
} from 'date-fns';

export const DATE_RANGE_PRESETS = [
  { value: 'all', label: 'All Time' },
  { value: 'today', label: 'Today' },
  { value: 'this_month', label: 'This Month' },
  { value: 'this_quarter', label: 'This Quarter' },
  { value: 'this_year', label: 'This Year' },
  { value: 'previous_month', label: 'Previous Month' },
  { value: 'previous_quarter', label: 'Previous Quarter' },
  { value: 'previous_year', label: 'Previous Year' },
  { value: 'custom', label: 'Custom Range' },
];

// Returns { start: Date, end: Date } or null for 'all' / 'custom' (custom uses manual dates)
export function getPresetRange(preset) {
  const now = new Date();
  switch (preset) {
    case 'today':
      return { start: startOfDay(now), end: endOfDay(now) };
    case 'this_month':
      return { start: startOfMonth(now), end: endOfMonth(now) };
    case 'this_quarter':
      return { start: startOfQuarter(now), end: endOfQuarter(now) };
    case 'this_year':
      return { start: startOfYear(now), end: endOfYear(now) };
    case 'previous_month': {
      const d = subMonths(now, 1);
      return { start: startOfMonth(d), end: endOfMonth(d) };
    }
    case 'previous_quarter': {
      const d = subQuarters(now, 1);
      return { start: startOfQuarter(d), end: endOfQuarter(d) };
    }
    case 'previous_year': {
      const d = subYears(now, 1);
      return { start: startOfYear(d), end: endOfYear(d) };
    }
    default:
      return null;
  }
}

// Resolves a filter state { preset, start, end } into concrete { start: Date, end: Date } | null
export function resolveDateRange(filter) {
  if (!filter || filter.preset === 'all') return null;
  if (filter.preset === 'custom') {
    if (!filter.start || !filter.end) return null;
    return { start: startOfDay(new Date(filter.start)), end: endOfDay(new Date(filter.end)) };
  }
  return getPresetRange(filter.preset);
}