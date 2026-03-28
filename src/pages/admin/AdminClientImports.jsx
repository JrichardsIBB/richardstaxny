import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';

const STATUS_COLORS = {
  not_invited: 'bg-gray-100 text-gray-800',
  invited: 'bg-yellow-100 text-yellow-800',
  registered: 'bg-green-100 text-green-800',
};

export default function AdminClientImports() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [sendingId, setSendingId] = useState(null);

  useEffect(() => {
    fetchClients();
  }, []);

  async function fetchClients() {
    const { data } = await supabase
      .from('client_imports')
      .select('*')
      .order('full_name');
    setClients(data || []);
    setLoading(false);
  }

  async function handleCSVUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    try {
      const text = await file.text();
      const lines = text.split('\n').filter((l) => l.trim());
      const headers = lines[0].split(',').map((h) => h.replace(/"/g, '').trim());

      const clientData = [];
      for (let i = 1; i < lines.length; i++) {
        // Parse CSV properly handling quoted fields
        const values = [];
        let current = '';
        let inQuotes = false;
        for (const char of lines[i]) {
          if (char === '"') { inQuotes = !inQuotes; continue; }
          if (char === ',' && !inQuotes) { values.push(current.trim()); current = ''; continue; }
          current += char;
        }
        values.push(current.trim());

        const row = {};
        headers.forEach((h, idx) => { row[h] = values[idx] || ''; });

        // Map to our format - skip SSN/EIN
        const name = row['Client'] || row['client'] || row['Name'] || row['name'] || '';
        const email = row['Email Address'] || row['email'] || row['Email'] || '';
        const phone = row['Phone'] || row['phone'] || '';
        const type = row['Type'] || row['type'] || 'individual';

        if (name) {
          // Validate email format
          const validEmail = email && email.includes('@') ? email : null;

          clientData.push({
            full_name: name,
            email: validEmail,
            phone: phone || null,
            client_type: type,
          });
        }
      }

      // Send to API
      const { data: { session } } = await supabase.auth.getSession();
      const resp = await fetch('/api/admin/import-clients', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ clients: clientData }),
      });

      const result = await resp.json();
      if (!resp.ok) throw new Error(result.error);

      toast.success(`Imported ${result.imported} clients (${result.skipped} skipped)`);
      fetchClients();
    } catch (err) {
      toast.error(`Import failed: ${err.message}`);
    } finally {
      setImporting(false);
      e.target.value = '';
    }
  }

  async function handleSendInvite(clientId, email) {
    if (!email) {
      toast.error('Client has no email address');
      return;
    }

    setSendingId(clientId);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const resp = await fetch('/api/admin/send-invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ client_id: clientId, email }),
      });

      const result = await resp.json();
      if (!resp.ok) throw new Error(result.error);

      toast.success(`Invite sent to ${email}`);
      fetchClients();
    } catch (err) {
      toast.error(`Failed: ${err.message}`);
    } finally {
      setSendingId(null);
    }
  }

  async function handleBulkInvite() {
    const eligible = clients.filter((c) => c.email && c.invite_status === 'not_invited');
    if (eligible.length === 0) {
      toast.error('No eligible clients to invite');
      return;
    }

    const confirmed = window.confirm(`Send invites to ${eligible.length} clients?`);
    if (!confirmed) return;

    toast.success(`Sending ${eligible.length} invites...`);
    for (const client of eligible) {
      await handleSendInvite(client.id, client.email);
    }
  }

  const filtered = clients.filter((c) => {
    const matchSearch = !search || c.full_name?.toLowerCase().includes(search.toLowerCase()) || c.email?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = !filterStatus || c.invite_status === filterStatus;
    return matchSearch && matchStatus;
  });

  const stats = {
    total: clients.length,
    withEmail: clients.filter((c) => c.email).length,
    notInvited: clients.filter((c) => c.invite_status === 'not_invited' && c.email).length,
    invited: clients.filter((c) => c.invite_status === 'invited').length,
    registered: clients.filter((c) => c.invite_status === 'registered').length,
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Client Imports</h1>
          <p className="text-gray-500 mt-1">Import clients and send registration invites</p>
        </div>
        <div className="flex gap-2">
          <label className="cursor-pointer rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition flex items-center gap-2">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
            </svg>
            {importing ? 'Importing...' : 'Upload CSV'}
            <input type="file" accept=".csv" className="hidden" onChange={handleCSVUpload} disabled={importing} />
          </label>
          <button
            onClick={handleBulkInvite}
            disabled={stats.notInvited === 0}
            className="rounded-lg bg-brand-blue-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-blue-600 disabled:opacity-50 transition"
          >
            Invite All ({stats.notInvited})
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <p className="text-sm text-gray-500">Total Clients</p>
          <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <p className="text-sm text-gray-500">Have Email</p>
          <p className="text-2xl font-bold text-brand-blue-500">{stats.withEmail}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <p className="text-sm text-gray-500">Invited</p>
          <p className="text-2xl font-bold text-yellow-600">{stats.invited}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <p className="text-sm text-gray-500">Registered</p>
          <p className="text-2xl font-bold text-green-600">{stats.registered}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-4">
        <input
          type="text"
          placeholder="Search by name or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 max-w-md rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-brand-blue-500 focus:outline-none"
        />
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-blue-500 focus:outline-none">
          <option value="">All Status</option>
          <option value="not_invited">Not Invited</option>
          <option value="invited">Invited</option>
          <option value="registered">Registered</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="h-6 w-6 animate-spin rounded-full border-4 border-brand-blue-500 border-t-transparent" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="px-6 py-12 text-center text-gray-500">
            {clients.length === 0 ? 'No clients imported yet. Upload a CSV to get started.' : 'No clients match your search.'}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Name</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Email</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Phone</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Status</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((client) => (
                <tr key={client.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{client.full_name}</td>
                  <td className="px-4 py-3 text-gray-600">{client.email || <span className="text-gray-400">—</span>}</td>
                  <td className="px-4 py-3 text-gray-600">{client.phone || <span className="text-gray-400">—</span>}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${STATUS_COLORS[client.invite_status]}`}>
                      {client.invite_status?.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {client.email && client.invite_status === 'not_invited' && (
                      <button
                        onClick={() => handleSendInvite(client.id, client.email)}
                        disabled={sendingId === client.id}
                        className="text-xs px-3 py-1.5 rounded bg-brand-blue-500 text-white hover:bg-brand-blue-600 disabled:opacity-50"
                      >
                        {sendingId === client.id ? 'Sending...' : 'Send Invite'}
                      </button>
                    )}
                    {client.invite_status === 'invited' && (
                      <span className="text-xs text-gray-400">
                        Sent {client.invited_at ? new Date(client.invited_at).toLocaleDateString() : ''}
                      </span>
                    )}
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
