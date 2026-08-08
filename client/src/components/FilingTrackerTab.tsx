'use client';

import React, { useState, useEffect } from 'react';
import { Customer, FilingMilestone } from '@/types';
import { api } from '@/lib/api';
import { MONTH_NAMES_SHORT, isFilingMonth, FILING_CYCLES } from '@/utils/quarterUtils';
import { exportToCSV } from '@/utils/exportToExcel';
import {
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Clock,
  AlertCircle,
  Download,
  Filter,
  RefreshCw,
  Search,
} from 'lucide-react';

export function FilingTrackerTab() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [cycleFilter, setCycleFilter] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any[]>([]);

  const fetchMatrix = async () => {
    setLoading(true);
    try {
      const res = await api.filings.getMatrix(year);
      if (res.data) {
        setData(res.data);
      }
    } catch (e) {
      console.error('Failed to load matrix:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMatrix();
  }, [year]);

  const handleMilestoneToggle = async (customer: Customer, monthIndex: number, currentMilestone?: FilingMilestone) => {
    const monthKey = `${year}-${String(monthIndex + 1).padStart(2, '0')}`;
    let nextStatus = 'in_progress';

    if (!currentMilestone || currentMilestone.status === 'pending') {
      nextStatus = 'in_progress';
    } else if (currentMilestone.status === 'in_progress') {
      nextStatus = 'filed';
    } else if (currentMilestone.status === 'filed') {
      nextStatus = 'pending';
    }

    try {
      await api.filings.updateMilestone({
        customer_id: customer.id,
        month_key: monthKey,
        year,
        status: nextStatus,
        filed_date: nextStatus === 'filed' ? new Date().toISOString() : null,
      });

      // Optimistically update local data
      setData((prev) =>
        prev.map((c) => {
          if (c.id === customer.id) {
            const existingMilestones = c.milestones || [];
            const filtered = existingMilestones.filter((m: any) => m.month_key !== monthKey);
            return {
              ...c,
              milestones: [...filtered, { customer_id: c.id, month_key: monthKey, year, status: nextStatus }],
            };
          }
          return c;
        })
      );
    } catch (e) {
      console.error('Failed to update milestone:', e);
    }
  };

  const filteredData = data.filter((c) => {
    const matchesCycle = !cycleFilter || c.filing_cycle === cycleFilter;
    const matchesSearch =
      !search ||
      c.name?.toLowerCase().includes(search.toLowerCase()) ||
      c.company_name?.toLowerCase().includes(search.toLowerCase()) ||
      c.trn?.includes(search);
    return matchesCycle && matchesSearch;
  });

  const handleExport = () => {
    const exportRows = filteredData.map((c) => {
      const row: any = {
        Customer: c.name,
        TRN: c.trn || '',
        Cycle: c.filing_cycle,
      };
      MONTH_NAMES_SHORT.forEach((m, idx) => {
        const applicable = isFilingMonth(c.filing_cycle, idx);
        if (!applicable) {
          row[m] = 'N/A';
        } else {
          const monthKey = `${year}-${String(idx + 1).padStart(2, '0')}`;
          const milestone = c.milestones?.find((item: any) => item.month_key === monthKey);
          row[m] = milestone?.status || 'pending';
        }
      });
      return row;
    });

    exportToCSV(exportRows, `VAT_Filing_Tracker_${year}`);
  };

  return (
    <div className="space-y-4">
      {/* Controls Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          {/* Year Switcher */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setYear(year - 1)}
              className="p-1.5 hover:bg-white text-slate-700 rounded-lg transition"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 text-sm font-bold text-slate-800">{year}</span>
            <button
              onClick={() => setYear(year + 1)}
              className="p-1.5 hover:bg-white text-slate-700 rounded-lg transition"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Search */}
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search company or TRN..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          {/* Filing Cycle Filter */}
          <select
            value={cycleFilter}
            onChange={(e) => setCycleFilter(e.target.value)}
            className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-medium"
          >
            <option value="">All Filing Cycles</option>
            {FILING_CYCLES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>

          <button
            onClick={fetchMatrix}
            title="Refresh tracker data"
            className="p-2 text-slate-600 hover:bg-slate-100 rounded-xl transition"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={handleExport}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Tracker Matrix Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <th className="py-3 px-4 min-w-[200px]">Customer / Company</th>
                <th className="py-3 px-3 min-w-[130px]">Cycle</th>
                {MONTH_NAMES_SHORT.map((m, idx) => (
                  <th key={m} className="py-3 px-2 text-center min-w-[65px]">
                    {m}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredData.map((customer) => (
                <tr key={customer.id} className="hover:bg-slate-50/70 transition">
                  <td className="py-3 px-4">
                    <div className="font-semibold text-slate-900">{customer.name}</div>
                    <div className="text-[11px] text-slate-400 font-mono">
                      {customer.trn ? `TRN: ${customer.trn}` : customer.company_name || 'No TRN'}
                    </div>
                  </td>
                  <td className="py-3 px-3">
                    <span className="inline-block px-2 py-0.5 text-[10px] font-medium rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                      {customer.filing_cycle}
                    </span>
                  </td>

                  {MONTH_NAMES_SHORT.map((_, mIdx) => {
                    const applicable = isFilingMonth(customer.filing_cycle, mIdx);
                    if (!applicable) {
                      return (
                        <td key={mIdx} className="py-3 px-2 text-center">
                          <span className="text-slate-300 font-bold">•</span>
                        </td>
                      );
                    }

                    const monthKey = `${year}-${String(mIdx + 1).padStart(2, '0')}`;
                    const milestone = customer.milestones?.find((m: any) => m.month_key === monthKey);
                    const status = milestone?.status || 'pending';

                    return (
                      <td key={mIdx} className="py-3 px-2 text-center">
                        <button
                          onClick={() => handleMilestoneToggle(customer, mIdx, milestone)}
                          title={`Click to cycle: Pending -> In Progress -> Filed (Current: ${status})`}
                          className={`w-8 h-8 rounded-xl inline-flex items-center justify-center transition shadow-2xs ${
                            status === 'filed'
                              ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200 border border-emerald-300'
                              : status === 'in_progress'
                              ? 'bg-amber-100 text-amber-700 hover:bg-amber-200 border border-amber-300'
                              : 'bg-slate-100 text-slate-400 hover:bg-slate-200 border border-slate-200'
                          }`}
                        >
                          {status === 'filed' ? (
                            <CheckCircle2 className="w-4 h-4" />
                          ) : status === 'in_progress' ? (
                            <Clock className="w-4 h-4" />
                          ) : (
                            <span className="text-[10px] font-bold">DUE</span>
                          )}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}

              {filteredData.length === 0 && !loading && (
                <tr>
                  <td colSpan={14} className="py-8 text-center text-slate-400 text-xs">
                    No customers found matching the search criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
