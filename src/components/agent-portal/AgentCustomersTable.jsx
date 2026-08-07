export default function AgentCustomersTable({ customers }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
      <table className="min-w-full text-sm">
        <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
          <tr><th className="px-5 py-3">Customer</th><th className="px-5 py-3">TRN</th><th className="px-5 py-3">Contact</th><th className="px-5 py-3">Filing cycle</th><th className="px-5 py-3">Status</th></tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {customers.map(customer => <tr key={customer.id}>
            <td className="px-5 py-4"><p className="font-medium text-gray-900">{customer.name}</p><p className="text-xs text-gray-400">{customer.address || '—'}</p></td>
            <td className="px-5 py-4 text-gray-600">{customer.trn || '—'}</td>
            <td className="px-5 py-4 text-gray-600">{customer.contact_person || customer.email || '—'}</td>
            <td className="px-5 py-4 text-gray-600">{customer.filing_cycle || '—'}</td>
            <td className="px-5 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-medium ${customer.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>{customer.status || 'active'}</span></td>
          </tr>)}
          {!customers.length && <tr><td colSpan="5" className="px-5 py-12 text-center text-gray-400">No customers are assigned to you.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}