import { useState } from 'react';
import { CircleDollarSign, FileText, FolderClock, LayoutDashboard, Receipt, Users } from 'lucide-react';
import useAgentPortalData from '@/hooks/use-agent-portal-data';
import AgentCommissionsTable from '@/components/agent-portal/AgentCommissionsTable';
import AgentCustomersTable from '@/components/agent-portal/AgentCustomersTable';
import AgentDashboard from '@/components/agent-portal/AgentDashboard';
import AgentDocumentsTable from '@/components/agent-portal/AgentDocumentsTable';
import AgentFilingsTable from '@/components/agent-portal/AgentFilingsTable';
import AgentInvoicesTable from '@/components/agent-portal/AgentInvoicesTable';

const tabs = [{ id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard }, { id: 'customers', label: 'Customers', icon: Users }, { id: 'filings', label: 'All Filings', icon: FileText }, { id: 'documents', label: 'Document Tracker', icon: FolderClock }, { id: 'invoices', label: 'Invoices', icon: Receipt }, { id: 'commissions', label: 'Commissions', icon: CircleDollarSign }];

export default function AgentPortal() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const { loading, agent, customers, filings, invoices, payments, documents, commissions } = useAgentPortalData();
  if (loading) return <div className="py-16 text-center text-gray-400">Loading your portal…</div>;
  if (!agent) return <div className="py-16 text-center text-gray-400">Your agent profile is not available.</div>;
  if (!customers.length) return <div><div className="mb-6"><h1 className="text-2xl font-bold text-gray-900">Welcome, {agent.name}</h1><p className="mt-1 text-sm text-gray-500">View your assigned customer information.</p></div><div className="py-16 text-center text-gray-400">No customers are linked to your account yet.</div></div>;
  return <div><div className="mb-6"><h1 className="text-2xl font-bold text-gray-900">Welcome, {agent.name}</h1><p className="mt-1 text-sm text-gray-500">View your assigned customer information.</p></div><div className="mb-5 flex flex-wrap gap-1 rounded-xl border border-gray-200 bg-white p-1">{tabs.map(tab => { const Icon = tab.icon; return <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium ${activeTab === tab.id ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}><Icon className="h-4 w-4" />{tab.label}</button>; })}</div>{activeTab === 'dashboard' && <AgentDashboard customers={customers} documents={documents} invoices={invoices} filings={filings} />}{activeTab === 'customers' && <AgentCustomersTable customers={customers} />}{activeTab === 'filings' && <AgentFilingsTable filings={filings} />}{activeTab === 'documents' && <AgentDocumentsTable documents={documents} />}{activeTab === 'invoices' && <AgentInvoicesTable invoices={invoices} payments={payments} />}{activeTab === 'commissions' && <AgentCommissionsTable commissions={commissions} />}</div>;
}