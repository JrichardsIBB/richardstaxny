import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';

export default function AdminProcessing() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchJobs() {
      try {
        const { data } = await supabase
          .from('processing_jobs')
          .select('*, document_uploads(file_name)')
          .order('created_at', { ascending: false })
          .limit(50);

        setJobs(data || []);
      } catch (err) {
        console.error('Fetch jobs error:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchJobs();

    // Subscribe to realtime changes
    const channel = supabase
      .channel('processing-jobs')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'processing_jobs' }, () => {
        fetchJobs();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const STATUS_ICON = {
    queued: { color: 'text-gray-400', bg: 'bg-gray-100' },
    running: { color: 'text-blue-500', bg: 'bg-blue-100' },
    completed: { color: 'text-green-500', bg: 'bg-green-100' },
    failed: { color: 'text-red-500', bg: 'bg-red-100' },
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Processing Pipeline</h1>
        <p className="text-gray-500 mt-1">AI document processing jobs</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {['queued', 'running', 'completed', 'failed'].map((status) => {
          const count = jobs.filter((j) => j.status === status).length;
          const style = STATUS_ICON[status];
          return (
            <div key={status} className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className={`h-10 w-10 rounded-lg ${style.bg} flex items-center justify-center`}>
                  <span className={`text-lg font-bold ${style.color}`}>{count}</span>
                </div>
                <span className="text-sm font-medium text-gray-600 capitalize">{status}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Jobs Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="h-6 w-6 animate-spin rounded-full border-4 border-brand-blue-500 border-t-transparent" />
          </div>
        ) : jobs.length === 0 ? (
          <div className="px-6 py-12 text-center text-gray-500">
            No processing jobs yet. Process a document from the Documents page.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left font-medium text-gray-600">Document</th>
                <th className="px-6 py-3 text-left font-medium text-gray-600">Type</th>
                <th className="px-6 py-3 text-left font-medium text-gray-600">Status</th>
                <th className="px-6 py-3 text-left font-medium text-gray-600">Duration</th>
                <th className="px-6 py-3 text-left font-medium text-gray-600">Result</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {jobs.map((job) => {
                const duration =
                  job.started_at && job.completed_at
                    ? `${((new Date(job.completed_at) - new Date(job.started_at)) / 1000).toFixed(1)}s`
                    : job.started_at
                    ? 'Running...'
                    : '—';

                return (
                  <tr key={job.id} className="hover:bg-gray-50">
                    <td className="px-6 py-3">
                      <span className="font-medium text-gray-900">
                        {job.document_uploads?.file_name || 'Unknown'}
                      </span>
                    </td>
                    <td className="px-6 py-3">
                      <span className="rounded bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600 uppercase">
                        {job.job_type}
                      </span>
                    </td>
                    <td className="px-6 py-3">
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${
                        STATUS_ICON[job.status]?.bg || 'bg-gray-100'
                      } ${STATUS_ICON[job.status]?.color || 'text-gray-600'}`}>
                        {job.status === 'running' && (
                          <span className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
                        )}
                        {job.status}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-gray-500">{duration}</td>
                    <td className="px-6 py-3 text-xs text-gray-500 max-w-[200px] truncate">
                      {job.result
                        ? `${job.result.category || ''} ${job.result.fields_extracted ? `(${job.result.fields_extracted} fields)` : ''}`
                        : job.error_message || '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
