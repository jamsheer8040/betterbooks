'use client';

import React, { useState, useEffect } from 'react';
import { Header } from '@/components/Header';
import { ProductService } from '@/types';
import { api } from '@/lib/api';
import {
  Package,
  Plus,
  Trash2,
  Edit2,
  Tag,
  DollarSign,
  X,
} from 'lucide-react';

export default function ProductsMasterPage() {
  const [products, setProducts] = useState<ProductService[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductService | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState<number>(0);
  const [vatRate, setVatRate] = useState<number>(5);
  const [category, setCategory] = useState('Taxation');

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const res = await api.products.list();
      if (res.data) setProducts(res.data);
    } catch (e) {
      console.error('Failed to load products:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleOpenCreate = () => {
    setEditingProduct(null);
    setName('');
    setCode('');
    setDescription('');
    setPrice(0);
    setVatRate(5);
    setCategory('Taxation');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (p: ProductService) => {
    setEditingProduct(p);
    setName(p.name);
    setCode(p.code || '');
    setDescription(p.description || '');
    setPrice(p.price);
    setVatRate(p.vat_rate);
    setCategory(p.category || 'Taxation');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingProduct) {
        await api.products.update(editingProduct.id, {
          name,
          code,
          description,
          price,
          vat_rate: vatRate,
          category,
        });
      } else {
        await api.products.create({
          name,
          code,
          description,
          price,
          vat_rate: vatRate,
          category,
        });
      }
      setIsModalOpen(false);
      fetchProducts();
    } catch (e) {
      console.error('Failed to save product:', e);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this service/product?')) return;
    try {
      await api.products.delete(id);
      fetchProducts();
    } catch (e) {
      console.error('Failed to delete product:', e);
    }
  };

  return (
    <>
      <Header title="Products & Services Catalog" subtitle="Predefined tax consultancy services, fixed filing fees, and billing rates">
        <button
          onClick={handleOpenCreate}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition"
        >
          <Plus className="w-4 h-4" />
          Add Service / Product
        </button>
      </Header>

      <div className="p-8 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {products.map((p) => (
            <div
              key={p.id}
              className="p-5 bg-white rounded-2xl border border-slate-200 shadow-2xs hover:shadow-xs transition flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                    {p.category || 'Service'}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEdit(p)}
                      className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(p.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-slate-100 transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <h3 className="text-base font-bold text-slate-900 mt-3">{p.name}</h3>
                {p.description && (
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2">{p.description}</p>
                )}
                {p.code && (
                  <p className="text-[11px] font-mono text-slate-400 mt-1">Code: {p.code}</p>
                )}
              </div>

              <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs text-slate-400">Standard Rate ({p.vat_rate}% VAT)</span>
                <span className="text-base font-bold text-slate-900">AED {p.price.toFixed(2)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Product Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md border border-slate-200 p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">
                {editingProduct ? 'Edit Service / Item' : 'New Service / Item'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Service / Item Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Quarterly VAT Return Preparation"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Category</label>
                <input
                  type="text"
                  placeholder="Taxation / Auditing / Advisory"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Unit Price (AED) *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="0.00"
                  value={price || ''}
                  onChange={(e) => setPrice(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">VAT Rate (%)</label>
                <input
                  type="number"
                  step="0.1"
                  required
                  value={vatRate}
                  onChange={(e) => setVatRate(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Description</label>
                <textarea
                  rows={2}
                  placeholder="Scope of service details..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl"
                >
                  {editingProduct ? 'Save Changes' : 'Create Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
