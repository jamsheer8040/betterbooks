'use client';

import React, { useState, useEffect } from 'react';
import { Header } from '@/components/Header';
import { Agent } from '@/types';
import { api } from '@/lib/api';
import { CommissionModal } from '@/components/CommissionModal';
import {
  Shield,
  Plus,
  Mail,
  Phone,
  Percent,
  DollarSign,
  Users,
  X,
} from 'lucide-react';

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isCommissionModalOpen, setIsCommissionModalOpen] = useState(false);
  const [selectedAgentId, setSelectedAgentId] = useState('');

  // New Agent Form
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [commissionRate, setCommissionRate] = useState(10);

  const fetchAgents = async () => {
    setLoading(true);
    try {
      const res = await api.agents.list();
      if (res.data) setAgents(res.data);
    } catch (e) {
      console.error('Failed to load agents:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAgents();
  }, []);

  const handleCreateAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.agents.create({
        name,
        email: email || null,
        phone: phone || null,
        commission_rate: commissionRate,
      });
      setIsAddModalOpen(false);
      setName('');
      setEmail('');
      setPhone('');
      setCommissionRate(10);
      fetchAgents();
    } catch (e) {
      console.error('Failed to create agent:', e);
    }
  };

  return (
    <>
      <Header title="Sales Agents Directory" subtitle="Manage external and internal sales agents and default commission rates">
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition"
        >
          <Plus className="w-4 h-4" />
          Add Agent
        </button>
      </Header>

      <div className="p-8 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {agents.map((agent: Agent) => (
            <div
              key={agent.id}
              className="p-5 bg-white rounded-2xl border border-slate-200 shadow-2xs hover:shadow-xs transition flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between">
                  <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
                    <Shield className="w-5 h-5" />
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                    {agent.commission_rate}% Rate
                  </span>
                </div>

                <h3 className="text-base font-bold text-slate-900 mt-3">{agent.name}</h3>

                <div className="mt-2 space-y-1 text-xs text-slate-500">
                  {agent.email && (
                    <div className="flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-slate-400" />
                      <span>{agent.email}</span>
                    </div>
                  )}
                  {agent.phone && (
                    <div className="flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                      <span>{agent.phone}</span>
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-slate-500">Referred Clients</span>
                  <span className="font-bold text-slate-800">{agent.customers?.length || 0}</span>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-end">
                <button
                  onClick={() => {
                    setSelectedAgentId(agent.id);
                    setIsCommissionModalOpen(true);
                  }}
                  className="px-3 py-1.5 text-xs font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-xl transition"
                >
                  + Add Commission
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Add Agent Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md border border-slate-200 p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">Add Sales Agent</h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateAgent} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Agent Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Tariq Mansoor"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
                <input
                  type="email"
                  placeholder="agent@domain.ae"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Phone / WhatsApp</label>
                <input
                  type="text"
                  placeholder="+971 50 XXX XXXX"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Default Commission Rate (%)</label>
                <input
                  type="number"
                  step="0.1"
                  required
                  value={commissionRate}
                  onChange={(e) => setCommissionRate(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl"
                >
                  Create Agent
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <CommissionModal
        isOpen={isCommissionModalOpen}
        onClose={() => setIsCommissionModalOpen(false)}
        onSuccess={fetchAgents}
        defaultAgentId={selectedAgentId}
      />
    </>
  );
}
