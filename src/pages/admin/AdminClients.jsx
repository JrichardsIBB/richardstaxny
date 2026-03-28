import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

export default function AdminClients() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    async function fetchClients() {
      try {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('*')
          .eq('role', 'tax_filer')
          .order('created_at', { ascending: false });

        // Fetch doc counts per client
        const enriched = [];
        for (const p of profiles || []) {
          const { count } = await supabase
            .from('document_uploads')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', p.id);

          enriched.push({ ...p, doc_count: count || 0 });
        }

        setClients(enriched);
      } catch (err) {
        console.error('Fetch clients error:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchClients();
  }, []);

  const filtered = search
    ? clients.filter(
        (c) =>
          c.full_name?.toLowerCase().includes(search.toLowerCase()) ||
          c.email?.toLowerCase().includes(search.toLowerCase())
      )
    : clients;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Clients</h1>
        <p className="text-gray-500 mt-1">{clients.length} tax filers</p>
      </div>

      {/* Search */}
      <div className="mb-6">
        <input
          type="text"
          placeholder="Search by name or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-md rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-brand-blue-500 focus:outline-none focus:ring-2 focus:ring-brand-blue-500/20"
        />
      </div>

      {/* Clients Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="h-6 w-6 animate-spin rounded-full border-4 border-brand-blue-500 border-t-transparent" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="px-6 py-12 text-center text-gray-500">
            {search ? 'No clients match your search' : 'No clients yet'}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left font-medium text-gray-600">Client</th>
                <th className="px-6 py-3 text-left font-medium text-gray-600">Email</th>
                <th className="px-6 py-3 text-center font-medium text-gray-600">Documents</th>
                <th className="px-6 py-3 text-left font-medium text-gray-600">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((client) => (
                <tr key={client.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full bg-brand-blue-100 flex items-center justify-center">
                        <span className="text-sm font-semibold text-brand-blue-600">
                          {client.full_name?.[0]?.toUpperCase() || client.email?.[0]?.toUpperCase() || '?'}
                        </span>
                      </div>
                      <span className="font-medium text-gray-900">
                        {client.full_name || 'No name'}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-gray-600">{client.email}</td>
                  <td className="px-6 py-4 text-center">
                    <span className="inline-block rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">
                      {client.doc_count}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-500">
                    {new Date(client.created_at).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
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
