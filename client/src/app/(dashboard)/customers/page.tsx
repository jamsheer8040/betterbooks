'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Header } from '@/components/Header';
import { Customer } from '@/types';
import { api } from '@/lib/api';
import { CustomerModal } from '@/components/CustomerModal';
import { InvoiceModal } from '@/components/InvoiceModal';
import { FILING_CYCLES } from '@/utils/quarterUtils';
import { exportToCSV } from '@/utils/exportToExcel';
import {
  Users,
  Search,
  Plus,
  Building,
  Phone,
  Mail,
  Calendar,
  FileText,
  Receipt,
  Download,
  ExternalLink,
  ChevronRight,
  Shield,
} from 'lucide-react';

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [cycleFilter, setCycleFilter] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [targetCustomerId, setTargetCustomerId] = useState('');

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const res = await api.customers.list();
      if (res.data) setCustomers(res.data);
    } catch (e) {
      console.error('Failed to fetch customers:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const filteredCustomers = customers.filter((c) => {
    const matchesCycle = !cycleFilter || c.filing_cycle === cycleFilter;
    const matchesSearch =
      !search ||
      c.name?.toLowerCase().includes(search.toLowerCase()) ||
      c.company_name?.toLowerCase().includes(search.toLowerCase()) ||
      c.trn?.includes(search) ||
      c.email?.toLowerCase().includes(search.toLowerCase()) ||
      c.mobile?.includes(search);
    return matchesCycle && matchesSearch;
  });

  const handleExport = () => {
    const exportData = filteredCustomers.map((c) => ({
      'Customer Name': c.name,
      'Company Name': c.company_name || '',
      'TRN': c.trn || '',
      'Cycle': c.filing_cycle,
      'Email': c.email || '',
      'Mobile': c.mobile || '',
      'Agent': c.agent?.name || 'Direct',
      'Status': c.status,
    }));
    exportToCSV(exportData, 'Customers_Export');
  };

  const openInvoiceForCustomer = (customerId: string) => {
    setTargetCustomerId(customerId);
    setIsInvoiceModalOpen(true);
  };

  return (
    <>
      <Header title="Customer Directory" subtitle="Manage registered UAE tax entities, filing cycles, and documents">
        <div className="flex items-center gap-2">
          <button
            onClick={handleExport}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl shadow-xs transition"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>
          <button
            onClick={() => {
              setSelectedCustomer(null);
              setIsCustomerModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition"
          >
            <Plus className="w-4 h-4" />
            New Customer
          </button>
        </div>
      </Header>

      <div className="p-8 space-y-6">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Search by customer name, company, TRN, email, or mobile..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center gap-3">
            <select
              value={cycleFilter}
              onChange={(e) => setCycleFilter(e.target.value)}
              className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-medium"
            >
              <option value="">All Filing Cycles</option>
              {FILING_CYCLES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Customer Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <th className="py-3.5 px-6">Customer & Company</th>
                  <th className="py-3.5 px-4">Tax Registration (TRN)</th>
                  <th className="py-3.5 px-4">Filing Cycle</th>
                  <th className="py-3.5 px-4">Assigned Agent</th>
                  <th className="py-3.5 px-4">Contact Info</th>
                  <th className="py-3.5 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredCustomers.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/70 transition group">
                    <td className="py-4 px-6">
                      <Link href={`/customers/${c.id}`} className="block">
                        <div className="font-bold text-slate-900 group-hover:text-blue-600 transition flex items-center gap-1.5">
                          <span>{c.name}</span>
                          <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600 transition" />
                        </div>
                        {c.company_name && (
                          <div className="text-[11px] text-slate-500">{c.company_name}</div>
                        )}
                      </Link>
                    </td>

                    <td className="py-4 px-4 font-mono font-medium text-slate-700">
                      {c.trn || <span className="text-slate-400 font-sans italic">Not registered</span>}
                    </td>

                    <td className="py-4 px-4">
                      <span className="inline-flex px-2.5 py-1 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                        {c.filing_cycle}
                      </span>
                    </td>

                    <td className="py-4 px-4">
                      {c.agent ? (
                        <div className="flex items-center gap-1.5 text-slate-800 font-medium">
                          <Shield className="w-3.5 h-3.5 text-purple-600" />
                          <span>{c.agent.name}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400">Direct</span>
                      )}
                    </td>

                    <td className="py-4 px-4 text-slate-600 space-y-0.5">
                      {c.mobile && (
                        <div className="flex items-center gap-1.5 text-[11px]">
                          <Phone className="w-3 h-3 text-slate-400" />
                          <span>{c.mobile}</span>
                        </div>
                      )}
                      {c.email && (
                        <div className="flex items-center gap-1.5 text-[11px]">
                          <Mail className="w-3 h-3 text-slate-400" />
                          <span className="truncate max-w-[140px]">{c.email}</span>
                        </div>
                      )}
                    </td>

                    <td className="py-4 px-6 text-right space-x-2">
                      <button
                        onClick={() => openInvoiceForCustomer(c.id)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition"
                      >
                        <Receipt className="w-3 h-3" />
                        Invoice
                      </button>
                      <button
                        onClick={() => {
                          setSelectedCustomer(c);
                          setIsCustomerModalOpen(true);
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}

                {filteredCustomers.length === 0 && !loading && (
                  <tr>
                    <td colSpan={6} className="py-10 text-center text-xs text-slate-400">
                      No customers found. Click &quot;New Customer&quot; above to create one.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <CustomerModal
        isOpen={isCustomerModalOpen}
        onClose={() => setIsCustomerModalOpen(false)}
        onSuccess={fetchCustomers}
        customer={selectedCustomer}
      />

      <InvoiceModal
        isOpen={isInvoiceModalOpen}
        onClose={() => setIsInvoiceModalOpen(false)}
        onSuccess={fetchCustomers}
        defaultCustomerId={targetCustomerId}
      />
    </>
  );
}
