import { useEffect, useState } from 'react';
import { X, Download, MessageCircle } from 'lucide-react';
import { getInvoicePDFPreviewUrl, downloadInvoicePDF } from '@/utils/invoiceTemplates';

export default function InvoicePreviewModal({ invoice, company, template = 'standard', onClose, onShare }) {
  const [previewUrl, setPreviewUrl] = useState(null);

  useEffect(() => {
    let url;
    getInvoicePDFPreviewUrl(invoice, company, template).then(u => { url = u; setPreviewUrl(u); });
    return () => { if (url) URL.revokeObjectURL(url); };
  }, [invoice, company, template]);

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl h-[85vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-800">{invoice.invoice_number} · {invoice.customer_name}</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
        </div>
        <div className="flex-1 bg-gray-100 overflow-hidden">
          {previewUrl ? (
            <iframe src={previewUrl} title="Invoice Preview" className="w-full h-full" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">Loading preview…</div>
          )}
        </div>
        <div className="p-4 border-t border-gray-100 flex items-center justify-end gap-2">
          <button onClick={onShare} className="flex items-center gap-1.5 px-4 py-2 border border-green-200 text-green-600 rounded-lg text-sm font-medium hover:bg-green-50 transition-colors"><MessageCircle className="w-4 h-4" /> Share on WhatsApp</button>
          <button onClick={() => downloadInvoicePDF(invoice, company, template)} className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"><Download className="w-4 h-4" /> Download</button>
        </div>
      </div>
    </div>
  );
}