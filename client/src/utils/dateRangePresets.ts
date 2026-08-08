export interface DatePreset {
  label: string;
  getDates: () => { start: string; end: string };
}

export const DATE_PRESETS: DatePreset[] = [
  {
    label: 'All Time',
    getDates: () => ({ start: '', end: '' }),
  },
  {
    label: 'Today',
    getDates: () => {
      const today = new Date().toISOString().split('T')[0];
      return { start: today, end: today };
    },
  },
  {
    label: 'This Month',
    getDates: () => {
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
      return { start, end };
    },
  },
  {
    label: 'Last Month',
    getDates: () => {
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0];
      const end = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0];
      return { start, end };
    },
  },
  {
    label: 'This Year',
    getDates: () => {
      const year = new Date().getFullYear();
      return { start: `${year}-01-01`, end: `${year}-12-31` };
    },
  },
];
