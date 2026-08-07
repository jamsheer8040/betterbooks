export default function InvoicePresentationOptions({ form, setForm, company }) {
  const options = { logo: true, bank: true, terms: true, custom_1: true, custom_2: true, ...(form.display_options || {}) };
  const toggle = (key) => setForm(current => ({ ...current, display_options: { ...options, [key]: !options[key] } }));
  const fields = [
    ['logo', 'Company logo', Boolean(company?.logo_url)],
    ['bank', 'Bank account details', Boolean(company?.bank_name || company?.bank_account_name || company?.bank_iban || company?.bank_account_number)],
    ['terms', 'Terms & conditions', Boolean(company?.invoice_terms_conditions)],
    ['custom_1', company?.custom_field_1_label || 'Custom field 1', Boolean(company?.custom_field_1_label)],
    ['custom_2', company?.custom_field_2_label || 'Custom field 2', Boolean(company?.custom_field_2_label)],
  ];

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 mb-5">
      <h2 className="text-sm font-semibold text-gray-700 mb-1">Invoice Content</h2>
      <p className="text-xs text-gray-500 mb-3">Choose what appears on this invoice.</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {fields.map(([key, label, available]) => available && (
          <button key={key} type="button" onClick={() => toggle(key)} className={`flex items-center justify-between rounded-lg border px-3 py-2 text-sm ${options[key] ? 'border-blue-200 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-500'}`}>
            {label}<span className={`w-2.5 h-2.5 rounded-full ${options[key] ? 'bg-blue-600' : 'bg-gray-300'}`} />
          </button>
        ))}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
        {company?.custom_field_1_label && options.custom_1 && <div><label className="block text-xs font-medium text-gray-600 mb-1">{company.custom_field_1_label}</label><input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={form.custom_field_1 || ''} onChange={e => setForm(current => ({ ...current, custom_field_1: e.target.value }))} /></div>}
        {company?.custom_field_2_label && options.custom_2 && <div><label className="block text-xs font-medium text-gray-600 mb-1">{company.custom_field_2_label}</label><input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={form.custom_field_2 || ''} onChange={e => setForm(current => ({ ...current, custom_field_2: e.target.value }))} /></div>}
      </div>
    </div>
  );
}