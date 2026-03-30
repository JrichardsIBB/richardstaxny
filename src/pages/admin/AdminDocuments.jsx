import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

const STATUS_OPTIONS = ['pending', 'processing', 'extracted', 'classified', 'review', 'approved', 'exported', 'error'];
const CATEGORY_OPTIONS = ['w-2', '1099-nec', '1099-int', '1099-div', '1099-misc', '1098', '1095', 'receipt', 'id', 'other'];

const STATUS_COLORS = {
  pending: 'bg-yellow-100 text-yellow-800',
  processing: 'bg-blue-100 text-blue-800',
  extracted: 'bg-purple-100 text-purple-800',
  classified: 'bg-indigo-100 text-indigo-800',
  review: 'bg-orange-100 text-orange-800',
  approved: 'bg-green-100 text-green-800',
  exported: 'bg-emerald-100 text-emerald-800',
  error: 'bg-red-100 text-red-800',
};

export default function AdminDocuments() {
  const { user } = useAuth();
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [extractions, setExtractions] = useState([]);
  const [processing, setProcessing] = useState(false);

  const fetchDocuments = useCallback(async () => {
    try {
      let query = supabase
        .from('document_uploads')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (filterStatus) query = query.eq('processing_status', filterStatus);
      if (filterCategory) query = query.eq('doc_category', filterCategory);

      const { data, error } = await query;
      if (error) throw error;
      setDocuments(data || []);
    } catch (err) {
      console.error('Fetch documents error:', err);
      toast.error('Failed to load documents');
    } finally {
      setLoading(false);
    }
  }, [filterStatus, filterCategory]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  async function handleProcess(docId) {
    setProcessing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();

      const resp = await fetch('/api/process-document', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ document_id: docId }),
      });

      const result = await resp.json();
      if (!resp.ok) throw new Error(result.error);

      toast.success(`Processed: ${result.category} (${Math.round(result.confidence * 100)}% confidence)`);
      fetchDocuments();
    } catch (err) {
      toast.error(`Processing failed: ${err.message}`);
    } finally {
      setProcessing(false);
    }
  }

  async function handleBatchProcess() {
    const pending = documents.filter((d) => d.processing_status === 'pending');
    if (pending.length === 0) {
      toast.error('No pending documents to process');
      return;
    }

    toast.success(`Processing ${pending.length} documents...`);
    for (const doc of pending) {
      await handleProcess(doc.id);
    }
  }

  async function handleRetry(docId) {
    setProcessing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();

      // Reset status via admin API
      const resetResp = await fetch('/api/admin/documents', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ document_id: docId, processing_status: 'pending' }),
      });

      if (!resetResp.ok) {
        const err = await resetResp.json();
        throw new Error(err.error || 'Failed to reset document');
      }

      toast.success('Document reset — reprocessing...');
      // Now process it
      await handleProcess(docId);
    } catch (err) {
      toast.error(`Retry failed: ${err.message}`);
    } finally {
      setProcessing(false);
    }
  }

  async function handleClearJobs() {
    try {
      await supabase
        .from('processing_jobs')
        .delete()
        .in('status', ['failed', 'completed']);

      toast.success('Old processing jobs cleared');
    } catch (err) {
      toast.error('Failed to clear jobs');
    }
  }

  async function handleApprove(docId) {
    try {
      await supabase
        .from('document_uploads')
        .update({
          processing_status: 'approved',
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', docId);

      toast.success('Document approved');
      fetchDocuments();
      if (selectedDoc?.id === docId) {
        setSelectedDoc((prev) => ({ ...prev, processing_status: 'approved' }));
      }
    } catch (err) {
      toast.error('Failed to approve');
    }
  }

  async function viewExtractions(doc) {
    setSelectedDoc(doc);
    const { data } = await supabase
      .from('extraction_results')
      .select('*')
      .eq('document_id', doc.id)
      .order('field_name');
    setExtractions(data || []);
  }

  async function handleVerifyField(extractionId, verifiedValue) {
    try {
      await supabase
        .from('extraction_results')
        .update({ is_verified: true, verified_value: verifiedValue })
        .eq('id', extractionId);

      setExtractions((prev) =>
        prev.map((e) =>
          e.id === extractionId ? { ...e, is_verified: true, verified_value: verifiedValue } : e
        )
      );
      toast.success('Field verified');
    } catch (err) {
      toast.error('Failed to verify field');
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Documents</h1>
          <p className="text-gray-500 mt-1">{documents.length} documents</p>
        </div>
        <button
          onClick={handleBatchProcess}
          disabled={processing}
          className="rounded-lg bg-brand-blue-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-blue-600 disabled:opacity-50 transition"
        >
          {processing ? 'Processing...' : 'Process All Pending'}
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-blue-500 focus:outline-none"
        >
          <option value="">All Statuses</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-blue-500 focus:outline-none"
        >
          <option value="">All Categories</option>
          {CATEGORY_OPTIONS.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      <div className="flex gap-6">
        {/* Documents Table */}
        <div className={`${selectedDoc ? 'w-1/2' : 'w-full'} transition-all`}>
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center h-48">
                <div className="h-6 w-6 animate-spin rounded-full border-4 border-brand-blue-500 border-t-transparent" />
              </div>
            ) : documents.length === 0 ? (
              <div className="px-6 py-12 text-center text-gray-500">No documents found</div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">File</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Category</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Status</th>
                    <th className="px-4 py-3 text-right font-medium text-gray-600">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {documents.map((doc) => (
                    <tr
                      key={doc.id}
                      className={`hover:bg-gray-50 cursor-pointer ${selectedDoc?.id === doc.id ? 'bg-brand-blue-50' : ''}`}
                      onClick={() => viewExtractions(doc)}
                    >
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900 truncate max-w-[200px]">{doc.file_name}</p>
                        <p className="text-xs text-gray-500">
                          {new Date(doc.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        {doc.doc_category ? (
                          <span className="inline-block rounded bg-brand-blue-50 px-2 py-0.5 text-xs font-medium text-brand-blue-600 uppercase">
                            {doc.doc_category}
                          </span>
                        ) : (
                          <span className="text-gray-400 text-xs">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${STATUS_COLORS[doc.processing_status] || STATUS_COLORS.pending}`}>
                          {doc.processing_status || 'pending'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                          {(doc.processing_status === 'pending') && (
                            <button
                              onClick={() => handleProcess(doc.id)}
                              disabled={processing}
                              className="text-xs px-2.5 py-1 rounded bg-brand-blue-500 text-white hover:bg-brand-blue-600 disabled:opacity-50"
                            >
                              Process
                            </button>
                          )}
                          {(doc.processing_status === 'error') && (
                            <button
                              onClick={() => handleRetry(doc.id)}
                              disabled={processing}
                              className="text-xs px-2.5 py-1 rounded bg-orange-500 text-white hover:bg-orange-600 disabled:opacity-50"
                            >
                              Retry
                            </button>
                          )}
                          {(doc.processing_status === 'extracted' || doc.processing_status === 'review') && (
                            <button
                              onClick={() => handleApprove(doc.id)}
                              className="text-xs px-2.5 py-1 rounded bg-green-500 text-white hover:bg-green-600"
                            >
                              Approve
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Extraction Detail Panel */}
        {selectedDoc && (
          <div className="w-1/2">
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm sticky top-8">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <h2 className="font-semibold text-gray-900">{selectedDoc.file_name}</h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {selectedDoc.doc_category?.toUpperCase() || 'Unclassified'}
                    {selectedDoc.doc_year && ` \u00B7 ${selectedDoc.doc_year}`}
                    {selectedDoc.confidence_score && ` \u00B7 ${Math.round(selectedDoc.confidence_score * 100)}% confidence`}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedDoc(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="px-6 py-4 max-h-[600px] overflow-y-auto">
                {extractions.length === 0 ? (
                  <p className="text-gray-500 text-sm text-center py-8">
                    No extracted fields yet. Process the document first.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {extractions.map((ext) => (
                      <div key={ext.id} className="border border-gray-200 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-medium text-gray-500 uppercase">
                            {ext.field_name.replace(/_/g, ' ')}
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-400">
                              {Math.round(ext.confidence * 100)}%
                            </span>
                            {ext.is_verified && (
                              <span className="text-xs text-green-600 font-medium">Verified</span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            defaultValue={ext.verified_value || ext.field_value || ''}
                            className="flex-1 rounded border border-gray-300 px-2.5 py-1.5 text-sm focus:border-brand-blue-500 focus:outline-none"
                            onBlur={(e) => {
                              if (e.target.value !== (ext.verified_value || ext.field_value || '')) {
                                handleVerifyField(ext.id, e.target.value);
                              }
                            }}
                          />
                          {!ext.is_verified && (
                            <button
                              onClick={() => handleVerifyField(ext.id, ext.field_value)}
                              className="text-xs px-2 py-1.5 rounded bg-green-100 text-green-700 hover:bg-green-200"
                            >
                              Confirm
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
