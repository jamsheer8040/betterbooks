'use client';

import React, { useState, useEffect } from 'react';
import { Customer, ProductService, Invoice } from '@/types';
import { api } from '@/lib/api';
import { X, Plus, Trash2, Receipt, Calculator, Building } from 'lucide-react';

interface InvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newInvoice?: Invoice) => void;
  defaultCustomerId?: string;
}

export function InvoiceModal({ isOpen, onClose, onSuccess, defaultCustomerId }: InvoiceModalProps) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<ProductService[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [customerId, setCustomerId] = useState(defaultCustomerId || '');
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState('');
  const [type, setType] = useState('standard');
  const [notes, setNotes] = useState('Payment is due within 14 days of invoice date.');
  const [terms, setTerms] = useState('All bank charges to be borne by the remitter.');

  const [items, setItems] = useState<Array<{
    product_service_id?: string;
    description: string;
    quantity: number;
    unit_price: number;
    discount: number;
    vat_rate: number;
  }>>([
    { description: 'Quarterly VAT Return Filing & Compliance Fee', quantity: 1, unit_price: 1500, discount: 0, vat_rate: 5 },
  ]);

  useEffect(() => {
    if (isOpen) {
      if (defaultCustomerId) setCustomerId(defaultCustomerId);

      Promise.all([api.customers.list(), api.products.list()])
        .then(([custRes, prodRes]) => {
          if (custRes.data) setCustomers(custRes.data);
          if (prodRes.data) setProducts(prodRes.data);
        })
        .catch(console.error);
    }
  }, [isOpen, defaultCustomerId]);

  const handleAddItem = () => {
    setItems([...items, { description: '', quantity: 1, unit_price: 0, discount: 0, vat_rate: 5 }]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  const handleProductSelect = (index: number, productId: string) => {
    const product = products.find((p) => p.id === productId);
    if (!product) return;

    const newItems = [...items];
    newItems[index] = {
      product_service_id: product.id,
      description: product.name,
      quantity: 1,
      unit_price: product.price,
      discount: 0,
      vat_rate: product.vat_rate,
    };
    setItems(newItems);
  };

  const handleItemChange = (index: number, field: string, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  // Calculate totals
  let subtotal = 0;
  let vatTotal = 0;

  items.forEach((item) => {
    const lineSub = (item.quantity || 0) * (item.unit_price || 0) - (item.discount || 0);
    const lineVat = (lineSub * (item.vat_rate || 5)) / 100;
    subtotal += lineSub;
    vatTotal += lineVat;
  });

  const grandTotal = subtotal + vatTotal;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerId) {
      setError('Please select a customer');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await api.invoices.create({
        customer_id: customerId,
        invoice_date: invoiceDate,
        due_date: dueDate || null,
        type,
        notes,
        terms_and_conditions: terms,
        items,
      });

      onSuccess(res.data);
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to create invoice');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col border border-slate-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Create Tax Invoice / Bill</h2>
              <p className="text-xs text-slate-500">Generate FTA-compliant VAT invoice with double-entry accounting</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto flex-1">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-medium">
              {error}
            </div>
          )}

          {/* Top Meta info */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-200/70">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Customer <span className="text-rose-500">*</span>
              </label>
              <select
                required
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 transition"
              >
                <option value="">-- Select Customer --</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.trn ? `(TRN: ${c.trn})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Invoice Date</label>
              <input
                type="date"
                required
                value={invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Due Date</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 transition"
              />
            </div>
          </div>

          {/* Line Items Table */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Line Items</h3>
              <button
                type="button"
                onClick={handleAddItem}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Item
              </button>
            </div>

            <div className="space-y-2">
              {items.map((item, idx) => (
                <div
                  key={idx}
                  className="grid grid-cols-12 gap-2 items-center p-3 bg-white border border-slate-200 rounded-xl shadow-2xs"
                >
                  <div className="col-span-12 sm:col-span-3">
                    <select
                      onChange={(e) => handleProductSelect(idx, e.target.value)}
                      className="w-full px-2 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-600"
                    >
                      <option value="">Quick Catalog Item...</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} (AED {p.price})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="col-span-12 sm:col-span-4">
                    <input
                      type="text"
                      required
                      placeholder="Item Description"
                      value={item.description}
                      onChange={(e) => handleItemChange(idx, 'description', e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white"
                    />
                  </div>

                  <div className="col-span-4 sm:col-span-1">
                    <input
                      type="number"
                      min="1"
                      placeholder="Qty"
                      value={item.quantity}
                      onChange={(e) => handleItemChange(idx, 'quantity', parseFloat(e.target.value) || 0)}
                      className="w-full px-2 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-center"
                    />
                  </div>

                  <div className="col-span-4 sm:col-span-2">
                    <input
                      type="number"
                      step="0.01"
                      placeholder="Unit Price"
                      value={item.unit_price}
                      onChange={(e) => handleItemChange(idx, 'unit_price', parseFloat(e.target.value) || 0)}
                      className="w-full px-2 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-right"
                    />
                  </div>

                  <div className="col-span-3 sm:col-span-1 text-right text-xs font-semibold text-slate-700">
                    AED {((item.quantity * item.unit_price - item.discount) * (1 + (item.vat_rate || 5) / 100)).toFixed(2)}
                  </div>

                  <div className="col-span-1 text-right">
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(idx)}
                      disabled={items.length <= 1}
                      className="p-1 text-slate-400 hover:text-rose-600 disabled:opacity-30"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Totals Summary */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-200/70">
            <div className="w-full sm:w-1/2 space-y-2">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Notes to Customer</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-xl"
                />
              </div>
            </div>

            <div className="w-full sm:w-72 space-y-2 text-right">
              <div className="flex justify-between text-xs text-slate-600">
                <span>Subtotal:</span>
                <span className="font-semibold text-slate-800">AED {subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-xs text-slate-600">
                <span>VAT (5%):</span>
                <span className="font-semibold text-slate-800">AED {vatTotal.toFixed(2)}</span>
              </div>
              <div className="pt-2 border-t border-slate-200 flex justify-between text-sm font-bold text-slate-900">
                <span>Total Due:</span>
                <span className="text-blue-600">AED {grandTotal.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Footer buttons */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md shadow-blue-500/20 transition disabled:opacity-50"
            >
              {loading ? 'Creating Invoice...' : 'Generate & Issue Invoice'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
