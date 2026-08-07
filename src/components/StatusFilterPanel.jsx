import { ChevronDown } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

export default function StatusFilterPanel({ filters, onChange }) {
  const items = [
    { key: 'submission', label: 'Submission' },
    { key: 'payment', label: 'Payment Made' },
    { key: 'service', label: 'Service Charge' },
  ];

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button type="button" className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">
          Status <ChevronDown className="h-4 w-4 text-gray-400" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-56 rounded-xl border-gray-200 p-3">
        <p className="mb-2 text-sm font-semibold text-gray-800">Status</p>
        <div className="space-y-1">
          {items.map(({ key, label }) => {
            const value = filters[key];
            const nextValue = value === null ? true : value ? false : null;
            const valueLabel = value === null ? 'All' : value ? 'Done' : 'Not done';
            return (
              <button key={key} type="button" onClick={() => onChange(key, nextValue)} className="flex w-full items-center justify-between rounded-lg px-2 py-2 text-sm text-gray-700 hover:bg-gray-50">
                <span>{label}</span>
                <span className={`rounded-md px-2 py-1 text-xs font-medium ${value === null ? 'bg-gray-100 text-gray-500' : value ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                  {valueLabel}
                </span>
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}