import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { supabase } from '../../lib/supabase';

function StatCard({ label, value, icon, color, to }) {
  const content = (
    <div className={`rounded-xl bg-white border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow`}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-gray-500">{label}</span>
        <div className={`h-10 w-10 rounded-lg ${color} flex items-center justify-center`}>
          <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d={icon} />
          </svg>
        </div>
      </div>
      <p className="text-3xl font-bold text-gray-900">{value}</p>
    </div>
  );

  return to ? <Link to={to}>{content}</Link> : content;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    totalDocs: 0,
    pendingDocs: 0,
    extractedDocs: 0,
    reviewDocs: 0,
    approvedDocs: 0,
    errorDocs: 0,
    totalClients: 0,
  });
  const [recentDocs, setRecentDocs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDashboard() {
      try {
        // Fetch document counts by status
        const { data: docs } = await supabase
          .from('document_uploads')
          .select('id, processing_status');

        const counts = {
          totalDocs: docs?.length || 0,
          pendingDocs: 0,
          extractedDocs: 0,
          reviewDocs: 0,
          approvedDocs: 0,
          errorDocs: 0,
        };

        for (const doc of docs || []) {
          const s = doc.processing_status || 'pending';
          if (s === 'pending' || s === 'processing') counts.pendingDocs++;
          else if (s === 'extracted' || s === 'classified') counts.extractedDocs++;
          else if (s === 'review') counts.reviewDocs++;
          else if (s === 'approved' || s === 'exported') counts.approvedDocs++;
          else if (s === 'error') counts.errorDocs++;
        }

        // Fetch unique clients
        const { data: clients } = await supabase
          .from('profiles')
          .select('id')
          .eq('role', 'tax_filer');

        counts.totalClients = clients?.length || 0;

        setStats(counts);

        // Fetch recent documents
        const { data: recent } = await supabase
          .from('document_uploads')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(10);

        setRecentDocs(recent || []);
      } catch (err) {
        console.error('Dashboard fetch error:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchDashboard();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-blue-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 mt-1">Overview of document processing pipeline</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          label="Total Documents"
          value={stats.totalDocs}
          icon="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          color="bg-brand-blue-500"
          to="/admin/documents"
        />
        <StatCard
          label="Pending Processing"
          value={stats.pendingDocs}
          icon="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
          color="bg-yellow-500"
          to="/admin/processing"
        />
        <StatCard
          label="Ready for Review"
          value={stats.reviewDocs + stats.extractedDocs}
          icon="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
          color="bg-purple-500"
          to="/admin/documents?status=extracted"
        />
        <StatCard
          label="Total Clients"
          value={stats.totalClients}
          icon="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
          color="bg-green-500"
          to="/admin/clients"
        />
      </div>

      {/* Status Summary Bar */}
      {stats.totalDocs > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-8 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Pipeline Status</h2>
          <div className="flex rounded-full overflow-hidden h-4 bg-gray-100">
            {stats.approvedDocs > 0 && (
              <div
                className="bg-green-500 transition-all"
                style={{ width: `${(stats.approvedDocs / stats.totalDocs) * 100}%` }}
                title={`${stats.approvedDocs} approved`}
              />
            )}
            {(stats.reviewDocs + stats.extractedDocs) > 0 && (
              <div
                className="bg-purple-500 transition-all"
                style={{ width: `${((stats.reviewDocs + stats.extractedDocs) / stats.totalDocs) * 100}%` }}
                title={`${stats.reviewDocs + stats.extractedDocs} ready for review`}
              />
            )}
            {stats.pendingDocs > 0 && (
              <div
                className="bg-yellow-500 transition-all"
                style={{ width: `${(stats.pendingDocs / stats.totalDocs) * 100}%` }}
                title={`${stats.pendingDocs} pending`}
              />
            )}
            {stats.errorDocs > 0 && (
              <div
                className="bg-red-500 transition-all"
                style={{ width: `${(stats.errorDocs / stats.totalDocs) * 100}%` }}
                title={`${stats.errorDocs} errors`}
              />
            )}
          </div>
          <div className="flex flex-wrap gap-4 mt-3 text-xs text-gray-500">
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-green-500" /> Approved ({stats.approvedDocs})</span>
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-purple-500" /> Review ({stats.reviewDocs + stats.extractedDocs})</span>
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-yellow-500" /> Pending ({stats.pendingDocs})</span>
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-red-500" /> Errors ({stats.errorDocs})</span>
          </div>
        </div>
      )}

      {/* Recent Documents */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">Recent Documents</h2>
          <Link to="/admin/documents" className="text-sm text-brand-blue-500 hover:underline">
            View all
          </Link>
        </div>
        {recentDocs.length === 0 ? (
          <div className="px-6 py-12 text-center text-gray-500">
            No documents uploaded yet.
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {recentDocs.map((doc) => (
              <div key={doc.id} className="px-6 py-3 flex items-center justify-between hover:bg-gray-50">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-gray-900">{doc.file_name}</p>
                  <p className="text-xs text-gray-500">
                    {new Date(doc.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                    {doc.doc_category && (
                      <span className="ml-2 inline-block rounded bg-brand-blue-50 px-2 py-0.5 text-brand-blue-600 font-medium uppercase">
                        {doc.doc_category}
                      </span>
                    )}
                  </p>
                </div>
                <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${
                  doc.processing_status === 'approved' || doc.processing_status === 'exported'
                    ? 'bg-green-100 text-green-800'
                    : doc.processing_status === 'error'
                    ? 'bg-red-100 text-red-800'
                    : doc.processing_status === 'extracted' || doc.processing_status === 'review'
                    ? 'bg-purple-100 text-purple-800'
                    : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {doc.processing_status || 'pending'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
