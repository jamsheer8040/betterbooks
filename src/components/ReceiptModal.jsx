import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { X, Download, CheckSquare, Square, Info, Wallet, FileText, Coins, User } from 'lucide-react';
import { jsPDF } from 'jspdf';
import { Link } from 'react-router-dom';

const fmt = (n) => (n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function generateReceiptNumber() {
  const now = new Date();
  return `REC-${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}-${Math.floor(Math.random()*1000).toString().padStart(3,'0')}`;
}

function downloadReceiptPDF(inv, company) {
  const doc = new jsPDF();
  
  // Header accent bar
  doc.setFillColor(88, 28, 135); doc.rect(0, 0, 210, 38, 'F');
  doc.setFillColor(147, 51, 234); doc.rect(0, 38, 210, 4, 'F');
  
  doc.setTextColor(255,255,255); doc.setFontSize(20); doc.setFont('helvetica','bold');
  doc.text(company?.company_name || 'PAYMENT RECEIPT', 20, 18);
  doc.setFontSize(10); doc.setFont('helvetica','normal');
  doc.text(`Receipt #: ${inv.invoice_number || ''}`, 20, 28);
  doc.setFontSize(9); doc.text(`Date: ${inv.invoice_date || ''}`, 150, 22);
  if (company?.trn) doc.text(`Company TRN: ${company.trn}`, 150, 28);
  
  doc.setTextColor(0,0,0);

  let y = 52;
  doc.setFontSize(8); doc.setTextColor(100,116,139);
  doc.text('RECEIVED FROM', 20, y);
  doc.setFontSize(11); doc.setTextColor(15,23,42); doc.setFont('helvetica','bold');
  doc.text(inv.customer_name || '', 20, y+7);
  doc.setFontSize(9); doc.setFont('helvetica','normal'); doc.setTextColor(71,85,105);
  if (inv.customer_trn) doc.text(`TRN: ${inv.customer_trn}`, 20, y+14);

  if (inv.wallet_name) {
    y += 24;
    doc.setFontSize(8); doc.setTextColor(100,116,139); doc.text('PAID TO WALLET', 20, y);
    doc.setFontSize(10); doc.setTextColor(88,28,135); doc.setFont('helvetica','bold');
    doc.text(inv.wallet_name, 20, y+6);
    doc.setFont('helvetica','normal'); doc.setTextColor(0,0,0);
  }

  y = 95;
  doc.setFillColor(241,245,249); doc.setDrawColor(203,213,225);
  doc.rect(15, y, 180, 9, 'FD');
  doc.setFontSize(8); doc.setFont('helvetica','bold'); doc.setTextColor(71,85,105);
  doc.text('Payment Item / Invoice Reference', 20, y+6.5);
  doc.text('Amount (AED)', 188, y+6.5, { align: 'right' });
  doc.setFont('helvetica','normal'); doc.setTextColor(0,0,0);
  y += 9;

  (inv.line_items || []).forEach((item, i) => {
    if (i%2===0) { doc.setFillColor(248,250,252); doc.rect(15,y,180,9,'F'); }
    doc.setDrawColor(226,232,240); doc.line(15,y+9,195,y+9);
    doc.setFontSize(9.5);
    doc.text(item.description||'Payment Item', 20, y+6.5);
    doc.text(`AED ${fmt(item.amount)}`, 188, y+6.5, { align:'right' });
    y += 9;
  });

  y += 6;
  doc.setFillColor(88,28,135); doc.roundedRect(130,y,65,14,2,2,'F');
  doc.setTextColor(255,255,255); doc.setFont('helvetica','bold'); doc.setFontSize(10);
  doc.text('TOTAL PAID', 135, y+9);
  doc.text(`AED ${fmt(inv.total)}`, 188, y+9, { align:'right' });
  doc.setFont('helvetica','normal'); doc.setTextColor(0,0,0);

  const pageH = doc.internal.pageSize.height;
  doc.setFillColor(248,250,252); doc.rect(0,pageH-14,210,14,'F');
  doc.setFontSize(7.5); doc.setTextColor(148,163,184);
  doc.text(`${company?.company_name || 'VAT Manager'} — Payment Receipt`, 15, pageH-5);
  doc.text('Page 1', 195, pageH-5, { align:'right' });

  doc.save(`Receipt_${inv.invoice_number}.pdf`);
}

export default function ReceiptModal({ customer: initialCustomer, filing, monthKey, wallets = [], invoiceTotal, alreadyReceiptedTotal, onSaved, onClose }) {
  const [saving, setSaving] = useState(false);
  const [company, setCompany] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(initialCustomer || null);
  const [openInvoices, setOpenInvoices] = useState([]);
  const [selectedInvoiceIds, setSelectedInvoiceIds] = useState([]);
  const [allocations, setAllocations] = useState({});
  const [loadingInvoices, setLoadingInvoices] = useState(false);
  const today = new Date().toISOString().split('T')[0];

  const remaining = invoiceTotal != null ? invoiceTotal - (alreadyReceiptedTotal || 0) : null;
  const defaultFee = (remaining != null && remaining > 0) ? remaining : (selectedCustomer?.service_fee || 300);

  const [form, setForm] = useState({
    invoice_number: generateReceiptNumber(),
    invoice_date: today,
    customer_name: selectedCustomer?.name || '',
    customer_trn: selectedCustomer?.trn || '',
    wallet_id: wallets?.[0]?.id || '',
    wallet_name: wallets?.[0]?.name || '',
    notes: '',
  });

  const [advanceAmount, setAdvanceAmount] = useState(defaultFee);

  // Load company settings and customer list if customer not provided
  useEffect(() => {
    base44.entities.CompanySettings.list().then(data => {
      if (data && data.length > 0) setCompany(data[0]);
    });
    if (!initialCustomer) {
      base44.entities.Customer.filter({ status: 'active' }).then(custs => {
        setCustomers(custs);
      });
    }
  }, [initialCustomer]);

  // Fetch open invoices when selected customer changes
  useEffect(() => {
    if (!selectedCustomer?.id) {
      setOpenInvoices([]);
      setSelectedInvoiceIds([]);
      setAllocations({});
      return;
    }
    setLoadingInvoices(true);
    Promise.all([
      base44.entities.Invoice.filter({ customer_id: selectedCustomer.id }),
      base44.entities.Payment.list()
    ]).then(([allInvoices, allPayments]) => {
      const openList = allInvoices.filter(inv => {
        if (inv.type !== 'vat_invoice' || inv.status === 'paid' || inv.status === 'cancelled') return false;
        const paysSum = allPayments.filter(p => p.invoice_id === inv.id).reduce((s, p) => s + (p.amount || 0), 0);
        inv.unpaidBalance = Math.max(0, (inv.total || 0) - paysSum);
        return inv.unpaidBalance > 0.01;
      });
      setOpenInvoices(openList);
      setSelectedInvoiceIds([]);
      setAllocations({});
      setLoadingInvoices(false);
    }).catch(err => {
      console.error('Error fetching open invoices:', err);
      setLoadingInvoices(false);
    });
  }, [selectedCustomer?.id]);

  useEffect(() => {
    if (!form.wallet_id && wallets && wallets.length > 0) {
      setForm(f => ({
        ...f,
        wallet_id: wallets[0].id,
        wallet_name: wallets[0].name || ''
      }));
    }
  }, [wallets, form.wallet_id]);

  const handleCustomerSelect = (customerId) => {
    const cust = customers.find(c => c.id === customerId) || null;
    setSelectedCustomer(cust);
    setForm(f => ({
      ...f,
      customer_name: cust?.name || '',
      customer_trn: cust?.trn || '',
    }));
    setAdvanceAmount(cust?.service_fee || 300);
  };

  const toggleInvoiceSelect = (inv) => {
    const isSelected = selectedInvoiceIds.includes(inv.id);
    if (isSelected) {
      setSelectedInvoiceIds(prev => prev.filter(id => id !== inv.id));
      setAllocations(prev => {
        const updated = { ...prev };
        delete updated[inv.id];
        return updated;
      });
    } else {
      setSelectedInvoiceIds(prev => [...prev, inv.id]);
      setAllocations(prev => ({
        ...prev,
        [inv.id]: inv.unpaidBalance
      }));
    }
  };

  const updateAllocation = (invId, val) => {
    setAllocations(prev => ({
      ...prev,
      [invId]: parseFloat(val) || 0
    }));
  };

  const handleWalletChange = (id) => {
    const w = (wallets || []).find(w => w.id === id);
    setForm(f => ({ ...f, wallet_id: id, wallet_name: w?.name || '' }));
  };

  const isAdvance = selectedInvoiceIds.length === 0;

  const total = isAdvance
    ? (parseFloat(advanceAmount) || 0)
    : selectedInvoiceIds.reduce((sum, id) => sum + (parseFloat(allocations[id]) || 0), 0);

  const missingCustomer = !selectedCustomer;
  const invalidAmount = total <= 0;
  const missingWallet = !form.wallet_id;

  const save = async (andDownload = false) => {
    if (missingCustomer || invalidAmount || missingWallet) return;
    setSaving(true);
    try {
      const selectedInvs = openInvoices.filter(inv => selectedInvoiceIds.includes(inv.id));
      let receiptItems = [];
      let recNotes = form.notes || '';

      if (isAdvance) {
        receiptItems = [{
          description: `Customer Advance Payment — ${selectedCustomer?.name || 'Customer'}`,
          amount: total
        }];
        recNotes = recNotes ? `${recNotes} | Customer Advance` : 'Customer Advance';
      } else {
        receiptItems = selectedInvs.map(inv => ({
          description: `Payment for Invoice ${inv.invoice_number}${inv.month_key ? ` (${inv.month_key})` : ''}`,
          amount: parseFloat(allocations[inv.id]) || inv.unpaidBalance
        }));
        const invNums = selectedInvs.map(i => i.invoice_number).join(', ');
        recNotes = recNotes ? `${recNotes} | Invoices: ${invNums}` : `Paid Invoices: ${invNums}`;
      }

      const recPayload = {
        ...form,
        customer_name: selectedCustomer.name,
        customer_trn: selectedCustomer.trn || '',
        notes: recNotes,
        line_items: receiptItems,
        type: 'service_receipt',
        customer_id: selectedCustomer.id,
        filing_id: filing?.id || '',
        month_key: monthKey || '',
        subtotal: total,
        vat_amount: 0,
        total,
        is_advance: isAdvance,
        linked_invoice_ids: selectedInvoiceIds,
      };

      const rec = await base44.entities.Invoice.create(recPayload);

      // If linked to open invoices, record payment against each selected invoice & update invoice status
      if (!isAdvance && selectedInvs.length > 0) {
        for (const inv of selectedInvs) {
          const payAmt = parseFloat(allocations[inv.id]) || inv.unpaidBalance;
          if (payAmt <= 0) continue;

          await base44.entities.Payment.create({
            invoice_id: inv.id,
            invoice_number: inv.invoice_number,
            customer_id: selectedCustomer.id,
            customer_name: selectedCustomer.name,
            amount: payAmt,
            payment_date: form.invoice_date,
            payment_method: 'other',
            wallet_id: form.wallet_id,
            wallet_name: form.wallet_name,
            reference_number: form.invoice_number,
            notes: `Receipt ${form.invoice_number}`,
          });

          const isFullyPaid = payAmt >= inv.unpaidBalance - 0.01;
          await base44.entities.Invoice.update(inv.id, {
            status: isFullyPaid ? 'paid' : 'partially_paid'
          });
        }
      }

      // If created as Customer Advance, record CustomerFund
      if (isAdvance) {
        await base44.entities.CustomerFund.create({
          customer_id: selectedCustomer.id,
          customer_name: selectedCustomer.name,
          amount: total,
          remaining_balance: total,
          payment_date: form.invoice_date,
          wallet_id: form.wallet_id,
          wallet_name: form.wallet_name,
          notes: 'Customer Advance Receipt ' + form.invoice_number,
        });
      }

      if (andDownload) {
        downloadReceiptPDF({ ...rec, ...form, line_items: receiptItems, total }, company);
      }
      onSaved(rec);
    } catch (err) {
      console.error('Error saving receipt:', err);
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Payment Receipt</h2>
            <p className="text-xs text-gray-500 mt-0.5">{selectedCustomer?.name || 'Manual Receipt'} {monthKey ? `· ${monthKey}` : ''}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 cursor-pointer"><X className="w-5 h-5" /></button>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-4 space-y-4">
          {/* Customer Selection (If not pre-selected) */}
          {!initialCustomer && (
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1 flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-blue-600" /> Select Customer <span className="text-red-500">*</span>
              </label>
              <select
                className={`w-full border rounded-lg px-3 py-2 text-sm bg-white font-medium ${missingCustomer ? 'border-red-400 bg-red-50/30' : 'border-gray-200'}`}
                value={selectedCustomer?.id || ''}
                onChange={e => handleCustomerSelect(e.target.value)}
              >
                <option value="">-- Choose a Customer (Required) --</option>
                {customers.map(c => (
                  <option key={c.id} value={c.id}>{c.name}{c.trn ? ` (TRN: ${c.trn})` : ''}</option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Receipt #</label>
              <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono" value={form.invoice_number} onChange={e => setForm(f=>({...f,invoice_number:e.target.value}))} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Receipt Date</label>
              <input type="date" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={form.invoice_date} onChange={e => setForm(f=>({...f,invoice_date:e.target.value}))} />
            </div>
          </div>

          {/* Wallet selector (Mandatory) */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1 flex items-center gap-1">
              <Wallet className="w-3.5 h-3.5 text-purple-600" /> Collect into Wallet <span className="text-red-500">*</span>
            </label>
            {!wallets || wallets.length === 0 ? (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-xs text-red-700 font-medium">
                ⚠️ No active wallets found. <Link to="/wallets" className="underline font-bold">Add a wallet first</Link> before collecting receipts.
              </div>
            ) : (
              <select
                className={`w-full border rounded-lg px-3 py-2 text-sm bg-white font-medium ${missingWallet ? 'border-red-400 bg-red-50/30' : 'border-gray-200'}`}
                value={form.wallet_id}
                onChange={e => handleWalletChange(e.target.value)}
              >
                <option value="">-- Select Collection Wallet (Required) --</option>
                {wallets.map(w => <option key={w.id} value={w.id}>{w.name}{w.bank_name ? ` — ${w.bank_name}` : ''}</option>)}
              </select>
            )}
            {missingWallet && wallets?.length > 0 && (
              <p className="text-xs text-red-600 font-semibold mt-1">Selecting a collection wallet is mandatory for receipts.</p>
            )}
          </div>

          {/* Invoices Selection for Receipt */}
          {selectedCustomer && (
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5 flex items-center justify-between">
                <span>Select Open Invoices (1 or More)</span>
                <span className="text-[11px] text-purple-600 font-medium">{selectedInvoiceIds.length} selected</span>
              </label>
              
              {loadingInvoices ? (
                <p className="text-xs text-gray-400 italic">Checking open invoices for {selectedCustomer.name}...</p>
              ) : openInvoices.length > 0 ? (
                <div className="space-y-2 max-h-48 overflow-y-auto border border-gray-200 rounded-xl p-2.5 bg-gray-50/50">
                  {openInvoices.map(inv => {
                    const isChecked = selectedInvoiceIds.includes(inv.id);
                    return (
                      <div
                        key={inv.id}
                        className={`p-2.5 rounded-xl border text-xs transition-all ${isChecked ? 'bg-purple-50/80 border-purple-300 text-purple-900 shadow-2xs' : 'bg-white border-gray-200 hover:bg-gray-50 text-gray-700'}`}
                      >
                        <div className="flex items-center justify-between cursor-pointer" onClick={() => toggleInvoiceSelect(inv)}>
                          <div className="flex items-center gap-2">
                            {isChecked ? <CheckSquare className="w-4 h-4 text-purple-600 shrink-0" /> : <Square className="w-4 h-4 text-gray-400 shrink-0" />}
                            <div>
                              <p className="font-semibold text-gray-900 flex items-center gap-1.5">
                                <FileText className="w-3 h-3 text-blue-500" /> {inv.invoice_number}
                              </p>
                              <p className="text-[10px] text-gray-500">{inv.invoice_date} {inv.month_key ? `· ${inv.month_key}` : ''}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-purple-700">AED {fmt(inv.unpaidBalance)}</p>
                            <p className="text-[10px] text-gray-400">Total: AED {fmt(inv.total)}</p>
                          </div>
                        </div>

                        {isChecked && (
                          <div className="mt-2 pt-2 border-t border-purple-200/60 flex items-center justify-between gap-2" onClick={e => e.stopPropagation()}>
                            <span className="text-[11px] font-medium text-purple-800">Amount Paying against this Invoice:</span>
                            <div className="flex items-center gap-1">
                              <span className="text-xs text-gray-500 font-semibold">AED</span>
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                max={inv.unpaidBalance}
                                className="w-28 border border-purple-300 rounded-lg px-2.5 py-1 text-right text-xs font-bold bg-white text-purple-900 focus:outline-none focus:ring-1 focus:ring-purple-500"
                                value={allocations[inv.id] ?? inv.unpaidBalance}
                                onChange={e => updateAllocation(inv.id, e.target.value)}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 text-xs text-gray-500 flex items-center gap-2">
                  <Info className="w-4 h-4 text-blue-500 shrink-0" />
                  <span>No open unpaid invoices found for {selectedCustomer.name}.</span>
                </div>
              )}
            </div>
          )}

          {/* Customer Advance Entry when 0 invoices selected */}
          {selectedCustomer && isAdvance && (
            <div className="bg-purple-50/70 border border-purple-200 rounded-xl p-3.5 space-y-2 text-xs">
              <div className="flex items-center gap-2 text-purple-900 font-semibold">
                <Coins className="w-4 h-4 text-purple-600 shrink-0" />
                <span>Record as Customer Advance</span>
              </div>
              <p className="text-purple-700 text-[11px]">
                No invoice is selected. This receipt will be added to <strong>{selectedCustomer.name}</strong> as an Advance Payment to settle future invoices.
              </p>
              <div className="pt-1 flex items-center justify-between">
                <label className="font-medium text-purple-900">Advance Receiving Amount (AED):</label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  className="w-32 border border-purple-300 rounded-lg px-3 py-1.5 text-right font-bold text-sm bg-white text-purple-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  value={advanceAmount}
                  onChange={e => setAdvanceAmount(e.target.value)}
                  placeholder="0.00"
                />
              </div>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Notes / Remarks (optional)</label>
            <input
              type="text"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="e.g. Payment ref, cheque #, bank receipt..."
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
            />
          </div>

          {missingCustomer && (
            <p className="text-xs font-semibold text-red-600 bg-red-50 p-2.5 rounded-lg border border-red-100">
              ⚠️ Please select a customer to create a receipt.
            </p>
          )}

          {invalidAmount && selectedCustomer && (
            <p className="text-xs font-semibold text-red-600 bg-red-50 p-2.5 rounded-lg border border-red-100">
              ⚠️ Receipt total amount must be greater than AED 0.00.
            </p>
          )}

          <div className="bg-purple-50 rounded-xl p-4 flex justify-between items-center border border-purple-100">
            <div>
              <span className="block text-xs text-purple-600 font-medium">Receipt Total Amount</span>
              <span className="text-[10px] text-gray-400">{isAdvance ? 'Customer Advance Payment' : `${selectedInvoiceIds.length} Invoice(s) Selected`}</span>
            </div>
            <span className="text-2xl font-bold text-purple-700">AED {fmt(total)}</span>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-gray-200">
          <button onClick={onClose} className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 font-medium cursor-pointer">Cancel</button>
          <button onClick={() => save(false)} disabled={saving || missingCustomer || invalidAmount || missingWallet} className="px-4 py-2 border border-purple-200 text-purple-700 rounded-lg text-sm hover:bg-purple-50 font-medium disabled:opacity-50 cursor-pointer">Save</button>
          <button onClick={() => save(true)} disabled={saving || missingCustomer || invalidAmount || missingWallet} className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium disabled:opacity-50 cursor-pointer">
            <Download className="w-4 h-4" /> Save & Download
          </button>
        </div>
      </div>
    </div>
  );
}