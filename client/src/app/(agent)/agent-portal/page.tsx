'use client';

import React, { useState, useEffect } from 'react';
import { Header } from '@/components/Header';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import {
  Shield,
  Users,
  Percent,
  Receipt,
  DollarSign,
  CheckCircle2,
  Clock,
  ArrowRight,
} from 'lucide-react';

export default function AgentPortalPage() {
  const { user } = useAuth();
  const [agentData, setAgentData] = useState<any>(null);
  const [commissions, setCommissions] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAgentDetails = async () => {
      setLoading(true);
      try {
        if (user?.agent_id) {
          const [agentRes, commRes, custRes] = await Promise.all([
            api.agents.get(user.agent_id),
            api.commissions.list(),
            api.customers.list(),
          ]);

          if (agentRes.data) setAgentData(agentRes.data);
          if (commRes.data) {
            // Filter commissions for this agent
            setCommissions(commRes.data.filter((c: any) => c.agent_id === user.agent_id));
          }
          if (custRes.data) {
            // Filter customers assigned to this agent
            setCustomers(custRes.data.filter((c: any) => c.agent_id === user.agent_id));
          }
        }
      } catch (e) {
        console.error('Failed to load agent info:', e);
      } finally {
        setLoading(false);
      }
    };

    fetchAgentDetails();
  }, [user]);

  const totalEarned = commissions.reduce((acc: number, c: any) => acc + (c.amount || 0), 0);
  const totalPaid = commissions
    .filter((c: any) => c.status === 'released')
    .reduce((acc: number, c: any) => acc + (c.amount || 0), 0);
  const pendingPayout = commissions
    .filter((c: any) => c.status !== 'released')
    .reduce((acc: number, c: any) => acc + (c.amount || 0), 0);

  return (
    <>
      <Header
        title={`Sales Portal: ${agentData?.name || user?.name}`}
        subtitle="Track referred clients, commission earnings, and payout status"
      />

      <div className="p-8 space-y-6">
        {/* Banner */}
        <div className="p-6 bg-gradient-to-r from-purple-900 to-indigo-900 rounded-2xl text-white shadow-xl shadow-purple-500/10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <span className="text-xs text-purple-300 font-semibold uppercase tracking-wider">
              Commission Rate: {agentData?.commission_rate || 10}%
            </span>
            <div className="text-3xl font-black text-white mt-1">
              AED {totalEarned.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-purple-200 mt-1">Total Lifetime Commissions Earned</p>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <span className="text-xs text-purple-200">Pending Payout</span>
              <div className="text-xl font-bold text-amber-300">
                AED {pendingPayout.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </div>
            </div>
          </div>
        </div>

        {/* Referred Clients & Commissions Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Referred Customers */}
          <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">Your Referred Clients ({customers.length})</h3>
            </div>

            <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
              {customers.map((c: any) => (
                <div key={c.id} className="py-3 flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-slate-800">{c.name}</h4>
                    <p className="text-[11px] text-slate-400">
                      {c.company_name} • Cycle: {c.filing_cycle}
                    </p>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700">
                    Active
                  </span>
                </div>
              ))}
              {customers.length === 0 && (
                <div className="py-8 text-center text-xs text-slate-400">No clients assigned yet.</div>
              )}
            </div>
          </div>

          {/* Commission History */}
          <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">Commission Ledger</h3>
            </div>

            <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
              {commissions.map((c: any) => (
                <div key={c.id} className="py-3 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-slate-800">AED {c.amount.toFixed(2)}</span>
                    <p className="text-[11px] text-slate-400">
                      {new Date(c.date).toLocaleDateString('en-GB')} • {c.notes || 'Commission'}
                    </p>
                  </div>
                  <div>
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold capitalize ${
                        c.status === 'released'
                          ? 'bg-emerald-50 text-emerald-700'
                          : c.status === 'approved'
                          ? 'bg-blue-50 text-blue-700'
                          : 'bg-amber-50 text-amber-700'
                      }`}
                    >
                      {c.status.replace('_', ' ')}
                    </span>
                  </div>
                </div>
              ))}
              {commissions.length === 0 && (
                <div className="py-8 text-center text-xs text-slate-400">No commissions recorded yet.</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
