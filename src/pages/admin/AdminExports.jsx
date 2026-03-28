import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';

export default function AdminExports() {
  const [approvedDocs, setApprovedDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    async function fetchApproved() {
      try {
        const { data } = await supabase
          .from('document_uploads')
          .select('*')
          .in('processing_status', ['approved', 'exported'])
          .order('created_at', { ascending: false });

        setApprovedDocs(data || []);
      } catch (err) {
        console.error('Fetch exports error:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchApproved();
  }, []);

  async function handleExportCSV() {
    setExporting(true);
    try {
      // Fetch all approved docs with their extraction results
      const approved = approvedDocs.filter((d) => d.processing_status === 'approved');

      if (approved.length === 0) {
        toast.error('No approved documents to export');
        return;
      }

      const rows = [];
      for (const doc of approved) {
        const { data: extractions } = await supabase
          .from('extraction_results')
          .select('*')
          .eq('document_id', doc.id);

        const row = {
          file_name: doc.file_name,
          category: doc.doc_category || '',
          tax_year: doc.doc_year || '',
          uploaded_at: doc.created_at,
          client_name: doc.client_name || '',
          client_email: doc.client_email || '',
        };

        // Add extraction fields as columns
        for (const ext of extractions || []) {
          row[ext.field_name] = ext.verified_value || ext.field_value || '';
        }

        rows.push(row);
      }

      // Generate CSV
      const allKeys = new Set();
      for (const row of rows) {
        Object.keys(row).forEach((k) => allKeys.add(k));
      }
      const headers = Array.from(allKeys);

      const csvContent = [
        headers.join(','),
        ...rows.map((row) =>
          headers.map((h) => {
            const val = String(row[h] || '').replace(/"/g, '""');
            return `"${val}"`;
          }).join(',')
        ),
      ].join('\n');

      // Download
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `richards-tax-export-${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
      URL.revokeObjectURL(url);

      // Update status to exported
      for (const doc of approved) {
        await supabase
          .from('document_uploads')
          .update({ processing_status: 'exported' })
          .eq('id', doc.id);
      }

      toast.success(`Exported ${approved.length} documents`);

      // Refresh
      setApprovedDocs((prev) =>
        prev.map((d) =>
          d.processing_status === 'approved' ? { ...d, processing_status: 'exported' } : d
        )
      );
    } catch (err) {
      toast.error(`Export failed: ${err.message}`);
    } finally {
      setExporting(false);
    }
  }

  const approvedCount = approvedDocs.filter((d) => d.processing_status === 'approved').length;
  const exportedCount = approvedDocs.filter((d) => d.processing_status === 'exported').length;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Exports</h1>
          <p className="text-gray-500 mt-1">Export approved documents for MyTaxPrepOffice</p>
        </div>
        <button
          onClick={handleExportCSV}
          disabled={exporting || approvedCount === 0}
          className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50 transition flex items-center gap-2"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          {exporting ? 'Exporting...' : `Export CSV (${approvedCount})`}
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <p className="text-sm text-gray-500 mb-1">Ready to Export</p>
          <p className="text-3xl font-bold text-green-600">{approvedCount}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <p className="text-sm text-gray-500 mb-1">Already Exported</p>
          <p className="text-3xl font-bold text-gray-400">{exportedCount}</p>
        </div>
      </div>

      {/* Documents */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="h-6 w-6 animate-spin rounded-full border-4 border-brand-blue-500 border-t-transparent" />
          </div>
        ) : approvedDocs.length === 0 ? (
          <div className="px-6 py-12 text-center text-gray-500">
            No approved documents to export. Process and approve documents first.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left font-medium text-gray-600">File</th>
                <th className="px-6 py-3 text-left font-medium text-gray-600">Category</th>
                <th className="px-6 py-3 text-left font-medium text-gray-600">Year</th>
                <th className="px-6 py-3 text-left font-medium text-gray-600">Client</th>
                <th className="px-6 py-3 text-left font-medium text-gray-600">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {approvedDocs.map((doc) => (
                <tr key={doc.id} className="hover:bg-gray-50">
                  <td className="px-6 py-3 font-medium text-gray-900">{doc.file_name}</td>
                  <td className="px-6 py-3">
                    <span className="rounded bg-brand-blue-50 px-2 py-0.5 text-xs font-medium text-brand-blue-600 uppercase">
                      {doc.doc_category || '—'}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-gray-600">{doc.doc_year || '—'}</td>
                  <td className="px-6 py-3 text-gray-600">{doc.client_name || '—'}</td>
                  <td className="px-6 py-3">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                      doc.processing_status === 'exported'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-green-100 text-green-800'
                    }`}>
                      {doc.processing_status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
