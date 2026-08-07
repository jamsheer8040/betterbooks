import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';

export default function useAgentPortalData() {
  const { user } = useAuth();
  const [data, setData] = useState({ loading: true, agent: null, customers: [], filings: [], invoices: [], payments: [], documents: [], commissions: [] });

  useEffect(() => {
    if (!user?.email) return;
    const load = async () => {
      const agents = await base44.entities.Agent.list('-created_date', 100);
      const agent = agents.find(item => item.status === 'active' && item.email?.toLowerCase() === user.email.toLowerCase());
      if (!agent) return setData(current => ({ ...current, loading: false }));
      const customers = await base44.entities.Customer.filter({ agent_id: agent.id });
      const customerIds = new Set(customers.map(customer => customer.id));
      const [filings, invoices, payments, commissions] = await Promise.all([
        base44.entities.Filing.list('-created_date', 500),
        base44.entities.Invoice.list('-created_date', 1000),
        base44.entities.Payment.list('-payment_date', 1000),
        base44.entities.Commission.filter({ agent_id: agent.id }),
      ]);
      const documents = customers.flatMap(customer => (customer.documents || []).map(document => ({ ...document, customer_id: customer.id, customer_name: customer.name })));
      setData({
        loading: false,
        agent,
        customers,
        filings: filings.filter(filing => customerIds.has(filing.customer_id)),
        invoices: invoices.filter(invoice => customerIds.has(invoice.customer_id)),
        payments: payments.filter(payment => customerIds.has(payment.customer_id)),
        documents,
        commissions,
      });
    };
    load();
  }, [user?.email]);

  return data;
}