import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';

export default function AdminExports() {
  const [approvedDocs, setApprovedDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [exportingClients, setExportingClients] = useState(false);

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

  async function handleExportDocCSV() {
    setExporting(true);
    try {
      const approved = approvedDocs.filter((d) => d.processing_status === 'approved');
      if (approved.length === 0) { toast.error('No approved documents to export'); return; }

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
        for (const ext of extractions || []) {
          row[ext.field_name] = ext.verified_value || ext.field_value || '';
        }
        rows.push(row);
      }

      const allKeys = new Set();
      for (const row of rows) Object.keys(row).forEach((k) => allKeys.add(k));
      const headers = Array.from(allKeys);

      const csvContent = [
        headers.join(','),
        ...rows.map((row) =>
          headers.map((h) => `"${String(row[h] || '').replace(/"/g, '""')}"`).join(',')
        ),
      ].join('\n');

      downloadFile(csvContent, `richards-tax-documents-${new Date().toISOString().split('T')[0]}.csv`, 'text/csv');

      for (const doc of approved) {
        await supabase.from('document_uploads').update({ processing_status: 'exported' }).eq('id', doc.id);
      }

      toast.success(`Exported ${approved.length} documents`);
      setApprovedDocs((prev) =>
        prev.map((d) => d.processing_status === 'approved' ? { ...d, processing_status: 'exported' } : d)
      );
    } catch (err) {
      toast.error(`Export failed: ${err.message}`);
    } finally {
      setExporting(false);
    }
  }

  async function handleExportClients(format) {
    setExportingClients(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const resp = await fetch(`/api/admin/export-clients?format=${format}`, {
        headers: { 'Authorization': `Bearer ${session.access_token}` },
      });
      if (!resp.ok) {
        const err = await resp.json();
        throw new Error(err.error || 'Export failed');
      }
      const csvText = await resp.text();
      downloadFile(csvText, `richards-tax-clients-${format}-${new Date().toISOString().split('T')[0]}.csv`, 'text/csv');
      toast.success('Client export downloaded!');
    } catch (err) {
      toast.error(`Export failed: ${err.message}`);
    } finally {
      setExportingClients(false);
    }
  }

  async function handleExportDocManifest() {
    setExporting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const resp = await fetch('/api/admin/export-documents?status=all', {
        headers: { 'Authorization': `Bearer ${session.access_token}` },
      });
      if (!resp.ok) throw new Error('Export failed');
      const data = await resp.json();

      // Download manifest
      downloadFile(data.manifest_csv, `document-manifest-${new Date().toISOString().split('T')[0]}.csv`, 'text/csv');

      // Download extractions if available
      if (data.extraction_csv && data.total_documents > 0) {
        setTimeout(() => {
          downloadFile(data.extraction_csv, `extraction-data-${new Date().toISOString().split('T')[0]}.csv`, 'text/csv');
        }, 500);
      }

      toast.success(`Exported manifest for ${data.total_documents} documents across ${data.total_clients} clients`);
    } catch (err) {
      toast.error(`Export failed: ${err.message}`);
    } finally {
      setExporting(false);
    }
  }

  function downloadFile(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }

  const approvedCount = approvedDocs.filter((d) => d.processing_status === 'approved').length;
  const exportedCount = approvedDocs.filter((d) => d.processing_status === 'exported').length;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Exports</h1>
        <p className="text-gray-500 mt-1">Export data for MyTaxPrepOffice and other tools</p>
      </div>

      {/* Export Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Client Export */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center">
              <svg className="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
              </svg>
            </div>
            <div>
              <h2 className="font-semibold text-gray-900">Export Clients</h2>
              <p className="text-xs text-gray-500">Download client list for MyTaxPrepOffice</p>
            </div>
          </div>

          <div className="space-y-2">
            <button
              onClick={() => handleExportClients('mytaxprepoffice')}
              disabled={exportingClients}
              className="w-full rounded-lg bg-green-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50 transition flex items-center justify-center gap-2"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
              </svg>
              {exportingClients ? 'Exporting...' : 'MyTAXPrepOffice Format'}
            </button>
            <button
              onClick={() => handleExportClients('extended')}
              disabled={exportingClients}
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition"
            >
              Extended Format (Split Names + Address)
            </button>
            <button
              onClick={() => handleExportClients('standard')}
              disabled={exportingClients}
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition"
            >
              Standard Format (All Fields)
            </button>
          </div>
        </div>

        {/* Document Export */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <svg className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
            </div>
            <div>
              <h2 className="font-semibold text-gray-900">Export Documents</h2>
              <p className="text-xs text-gray-500">Download AI-extracted tax document data</p>
            </div>
          </div>

          <div className="space-y-2">
            <button
              onClick={handleExportDocCSV}
              disabled={exporting || approvedCount === 0}
              className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 transition flex items-center justify-center gap-2"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
              </svg>
              {exporting ? 'Exporting...' : `Export Approved (${approvedCount})`}
            </button>
            <button
              onClick={handleExportDocManifest}
              disabled={exporting}
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition"
            >
              Download Full Manifest + Extraction Data
            </button>
          </div>

          <div className="mt-4 flex gap-3">
            <div className="flex-1 rounded-lg bg-green-50 border border-green-200 px-3 py-2 text-center">
              <p className="text-xs text-green-600">Ready</p>
              <p className="text-lg font-bold text-green-700">{approvedCount}</p>
            </div>
            <div className="flex-1 rounded-lg bg-gray-50 border border-gray-200 px-3 py-2 text-center">
              <p className="text-xs text-gray-500">Exported</p>
              <p className="text-lg font-bold text-gray-400">{exportedCount}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Documents Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">Document History</h3>
        </div>
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
