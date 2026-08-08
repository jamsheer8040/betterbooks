'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Header } from '@/components/Header';
import { Customer } from '@/types';
import { api } from '@/lib/api';
import {
  FileText,
  AlertTriangle,
  Clock,
  CheckCircle2,
  ExternalLink,
  Search,
  Building,
} from 'lucide-react';

interface TrackedDoc {
  id: string;
  customerId: string;
  customerName: string;
  companyName?: string | null;
  docTitle: string;
  docType: string;
  expiryDate: string;
  daysRemaining: number;
  fileUrl?: string | null;
}

export default function DocumentTrackerPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const res = await api.customers.list();
      if (res.data) setCustomers(res.data);
    } catch (e) {
      console.error('Failed to load customers:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  // Aggregate all tracked documents
  const allDocs: TrackedDoc[] = [];
  const now = new Date();

  customers.forEach((c) => {
    if (c.trade_license_expiry) {
      const expiry = new Date(c.trade_license_expiry);
      const diffDays = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      allDocs.push({
        id: `tl-${c.id}`,
        customerId: c.id,
        customerName: c.name,
        companyName: c.company_name,
        docTitle: 'Trade License',
        docType: 'License',
        expiryDate: c.trade_license_expiry.split('T')[0],
        daysRemaining: diffDays,
        fileUrl: c.trade_license_url,
      });
    }

    (c.documents || []).forEach((doc: any) => {
      if (doc.expiry_date) {
        const expiry = new Date(doc.expiry_date);
        const diffDays = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        allDocs.push({
          id: doc.id,
          customerId: c.id,
          customerName: c.name,
          companyName: c.company_name,
          docTitle: doc.label,
          docType: doc.document_type || 'Document',
          expiryDate: doc.expiry_date.split('T')[0],
          daysRemaining: diffDays,
          fileUrl: doc.file_url,
        });
      }
    });
  });

  const filteredDocs = allDocs.filter(
    (d) =>
      !search ||
      d.customerName?.toLowerCase().includes(search.toLowerCase()) ||
      d.docTitle?.toLowerCase().includes(search.toLowerCase()) ||
      d.companyName?.toLowerCase().includes(search.toLowerCase())
  );

  // Group into Kanban categories
  const expiredDocs = filteredDocs.filter((d) => d.daysRemaining < 0);
  const expiring7Days = filteredDocs.filter((d) => d.daysRemaining >= 0 && d.daysRemaining <= 7);
  const expiring30Days = filteredDocs.filter((d) => d.daysRemaining > 7 && d.daysRemaining <= 30);
  const activeDocs = filteredDocs.filter((d) => d.daysRemaining > 30);

  const renderCard = (doc: TrackedDoc) => (
    <div
      key={doc.id}
      className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs hover:shadow-xs transition space-y-3"
    >
      <div className="flex items-start justify-between">
        <Link
          href={`/customers/${doc.customerId}`}
          className="text-xs font-bold text-slate-900 hover:text-blue-600 transition"
        >
          {doc.customerName}
        </Link>
        <span className="px-2 py-0.5 text-[10px] font-semibold bg-slate-100 text-slate-600 rounded-full">
          {doc.docType}
        </span>
      </div>

      <div>
        <h4 className="text-xs font-semibold text-slate-700">{doc.docTitle}</h4>
        <p className="text-[11px] text-slate-400">Expires: {doc.expiryDate}</p>
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-slate-100">
        <span
          className={`text-[10px] font-bold px-2 py-0.5 rounded ${
            doc.daysRemaining < 0
              ? 'bg-rose-100 text-rose-700'
              : doc.daysRemaining <= 7
              ? 'bg-amber-100 text-amber-700'
              : doc.daysRemaining <= 30
              ? 'bg-yellow-100 text-yellow-800'
              : 'bg-emerald-100 text-emerald-700'
          }`}
        >
          {doc.daysRemaining < 0 ? `Expired ${Math.abs(doc.daysRemaining)}d ago` : `${doc.daysRemaining} days left`}
        </span>

        {doc.fileUrl && (
          <a
            href={doc.fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] font-semibold text-blue-600 hover:underline inline-flex items-center gap-1"
          >
            <span>View</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        )}
      </div>
    </div>
  );

  return (
    <>
      <Header
        title="Document & License Expiry Tracker"
        subtitle="Visual Kanban pipeline for Trade Licenses, Passports, Emirates IDs, and Ejari expiries"
      />

      <div className="p-8 space-y-6">
        {/* Search */}
        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Search by customer name, company, or document..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* 4-Column Kanban Matrix */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Column 1: Expired */}
          <div className="bg-rose-50/60 rounded-2xl border border-rose-200/80 p-4 space-y-3 flex flex-col">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
                <h3 className="text-xs font-bold text-rose-900 uppercase tracking-wider">Expired</h3>
              </div>
              <span className="px-2 py-0.5 bg-rose-200 text-rose-800 text-xs font-bold rounded-full">
                {expiredDocs.length}
              </span>
            </div>
            <div className="space-y-3 flex-1 overflow-y-auto max-h-[calc(100vh-280px)]">
              {expiredDocs.map(renderCard)}
              {expiredDocs.length === 0 && (
                <div className="py-8 text-center text-xs text-rose-400 font-medium">No expired documents</div>
              )}
            </div>
          </div>

          {/* Column 2: Expiring in 7 Days */}
          <div className="bg-amber-50/60 rounded-2xl border border-amber-200/80 p-4 space-y-3 flex flex-col">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                <h3 className="text-xs font-bold text-amber-900 uppercase tracking-wider">Due in 7 Days</h3>
              </div>
              <span className="px-2 py-0.5 bg-amber-200 text-amber-800 text-xs font-bold rounded-full">
                {expiring7Days.length}
              </span>
            </div>
            <div className="space-y-3 flex-1 overflow-y-auto max-h-[calc(100vh-280px)]">
              {expiring7Days.map(renderCard)}
              {expiring7Days.length === 0 && (
                <div className="py-8 text-center text-xs text-amber-400 font-medium">No urgent expiries</div>
              )}
            </div>
          </div>

          {/* Column 3: Expiring in 30 Days */}
          <div className="bg-yellow-50/60 rounded-2xl border border-yellow-200/80 p-4 space-y-3 flex flex-col">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-yellow-500" />
                <h3 className="text-xs font-bold text-yellow-900 uppercase tracking-wider">Due in 30 Days</h3>
              </div>
              <span className="px-2 py-0.5 bg-yellow-200 text-yellow-800 text-xs font-bold rounded-full">
                {expiring30Days.length}
              </span>
            </div>
            <div className="space-y-3 flex-1 overflow-y-auto max-h-[calc(100vh-280px)]">
              {expiring30Days.map(renderCard)}
              {expiring30Days.length === 0 && (
                <div className="py-8 text-center text-xs text-yellow-500 font-medium">None due this month</div>
              )}
            </div>
          </div>

          {/* Column 4: Good Standing */}
          <div className="bg-emerald-50/60 rounded-2xl border border-emerald-200/80 p-4 space-y-3 flex flex-col">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <h3 className="text-xs font-bold text-emerald-900 uppercase tracking-wider">Good Standing</h3>
              </div>
              <span className="px-2 py-0.5 bg-emerald-200 text-emerald-800 text-xs font-bold rounded-full">
                {activeDocs.length}
              </span>
            </div>
            <div className="space-y-3 flex-1 overflow-y-auto max-h-[calc(100vh-280px)]">
              {activeDocs.map(renderCard)}
              {activeDocs.length === 0 && (
                <div className="py-8 text-center text-xs text-emerald-500 font-medium">No documents</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
