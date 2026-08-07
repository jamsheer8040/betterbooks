import { useState, useRef, useEffect } from 'react';
import { Calendar } from 'lucide-react';
import { DATE_RANGE_PRESETS } from '@/utils/dateRangePresets';

export default function DateRangeFilter({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const preset = value?.preset || 'all';

  useEffect(() => {
    const handleClickOutside = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const label = DATE_RANGE_PRESETS.find(p => p.value === preset)?.label || 'All Time';

  const selectPreset = (p) => {
    if (p === 'custom') {
      onChange({ preset: 'custom', start: value?.start || '', end: value?.end || '' });
    } else {
      onChange({ preset: p, start: '', end: '' });
      setOpen(false);
    }
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700 min-w-40"
      >
        <Calendar className="w-3.5 h-3.5 text-gray-400" />
        {preset === 'custom' && value?.start && value?.end ? `${value.start} → ${value.end}` : label}
      </button>
      {open && (
        <div className="absolute z-20 mt-1 right-0 w-56 bg-white border border-gray-200 rounded-lg shadow-lg p-1">
          {DATE_RANGE_PRESETS.map(p => (
            <button
              key={p.value}
              type="button"
              onClick={() => selectPreset(p.value)}
              className={`w-full text-left px-3 py-2 text-sm rounded-md ${preset === p.value ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700 hover:bg-gray-50'}`}
            >
              {p.label}
            </button>
          ))}
          {preset === 'custom' && (
            <div className="p-2 space-y-2 border-t border-gray-100 mt-1">
              <div>
                <label className="block text-xs text-gray-500 mb-1">From</label>
                <input type="date" value={value?.start || ''} onChange={e => onChange({ ...value, preset: 'custom', start: e.target.value })} className="w-full border border-gray-200 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">To</label>
                <input type="date" value={value?.end || ''} onChange={e => onChange({ ...value, preset: 'custom', end: e.target.value })} className="w-full border border-gray-200 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <button type="button" onClick={() => setOpen(false)} className="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-md py-1.5 font-medium">Apply</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}