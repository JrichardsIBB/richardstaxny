import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAdmin } from '../../context/AdminContext';
import toast from 'react-hot-toast';

const ROLES = ['owner', 'admin', 'tax_agent', 'tax_filer'];

const ROLE_COLORS = {
  owner: 'bg-red-100 text-red-800',
  admin: 'bg-purple-100 text-purple-800',
  tax_agent: 'bg-blue-100 text-blue-800',
  tax_filer: 'bg-gray-100 text-gray-800',
};

export default function AdminUsers() {
  const { isOwner } = useAdmin();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchUsers() {
      try {
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .order('role')
          .order('created_at', { ascending: false });

        setUsers(data || []);
      } catch (err) {
        console.error('Fetch users error:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchUsers();
  }, []);

  async function handleRoleChange(userId, newRole) {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('id', userId);

      if (error) throw error;

      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
      );

      toast.success(`Role updated to ${newRole.replace('_', ' ')}`);
    } catch (err) {
      toast.error(`Failed to update role: ${err.message}`);
    }
  }

  if (!isOwner) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Only owners can manage user roles.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
        <p className="text-gray-500 mt-1">Manage roles and permissions</p>
      </div>

      {/* Role Legend */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6 shadow-sm">
        <p className="text-sm font-medium text-gray-700 mb-2">Role Permissions</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          <div className="space-y-1">
            <span className="rounded-full bg-red-100 text-red-800 px-2 py-0.5 font-semibold">Owner</span>
            <p className="text-gray-500">Full access + user management</p>
          </div>
          <div className="space-y-1">
            <span className="rounded-full bg-purple-100 text-purple-800 px-2 py-0.5 font-semibold">Admin</span>
            <p className="text-gray-500">Full access to admin panel</p>
          </div>
          <div className="space-y-1">
            <span className="rounded-full bg-blue-100 text-blue-800 px-2 py-0.5 font-semibold">Tax Agent</span>
            <p className="text-gray-500">View, process, review documents</p>
          </div>
          <div className="space-y-1">
            <span className="rounded-full bg-gray-100 text-gray-800 px-2 py-0.5 font-semibold">Tax Filer</span>
            <p className="text-gray-500">Upload documents, view own data</p>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="h-6 w-6 animate-spin rounded-full border-4 border-brand-blue-500 border-t-transparent" />
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left font-medium text-gray-600">User</th>
                <th className="px-6 py-3 text-left font-medium text-gray-600">Email</th>
                <th className="px-6 py-3 text-left font-medium text-gray-600">Current Role</th>
                <th className="px-6 py-3 text-left font-medium text-gray-600">Change Role</th>
                <th className="px-6 py-3 text-left font-medium text-gray-600">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full bg-brand-blue-100 flex items-center justify-center">
                        <span className="text-sm font-semibold text-brand-blue-600">
                          {u.full_name?.[0]?.toUpperCase() || u.email?.[0]?.toUpperCase() || '?'}
                        </span>
                      </div>
                      <span className="font-medium text-gray-900">
                        {u.full_name || 'No name'}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-gray-600">{u.email}</td>
                  <td className="px-6 py-4">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${ROLE_COLORS[u.role] || ROLE_COLORS.tax_filer}`}>
                      {u.role?.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <select
                      value={u.role}
                      onChange={(e) => handleRoleChange(u.id, e.target.value)}
                      className="rounded border border-gray-300 px-2 py-1 text-xs focus:border-brand-blue-500 focus:outline-none"
                    >
                      {ROLES.map((role) => (
                        <option key={role} value={role}>
                          {role.replace('_', ' ')}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-6 py-4 text-gray-500 text-xs">
                    {new Date(u.created_at).toLocaleDateString('en-US', {
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
