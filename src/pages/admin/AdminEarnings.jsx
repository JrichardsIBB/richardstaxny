import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';

const STATUS_COLORS = {
  pending: 'bg-yellow-100 text-yellow-800',
  paid: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
};

export default function AdminEarnings() {
  const { user } = useAuth();
  const [earnings, setEarnings] = useState([]);
  const [serviceFees, setServiceFees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterService, setFilterService] = useState('');

  // Form state
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [selectedFee, setSelectedFee] = useState('');
  const [serviceType, setServiceType] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [feeType, setFeeType] = useState('service_fee');
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    const [earningsRes, feesRes] = await Promise.all([
      supabase.from('earnings').select('*').order('created_at', { ascending: false }),
      supabase.from('service_fees').select('*').eq('is_active', true).order('name'),
    ]);
    setEarnings(earningsRes.data || []);
    setServiceFees(feesRes.data || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  function handleFeeSelect(feeId) {
    setSelectedFee(feeId);
    const fee = serviceFees.find((f) => f.id === feeId);
    if (fee) {
      setServiceType(fee.name);
      setAmount(fee.default_amount.toString());
      setFeeType('service_fee');
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!clientName.trim() || !amount || !serviceType.trim()) {
      toast.error('Please fill in client name, service, and amount');
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.from('earnings').insert({
        client_name: clientName.trim(),
        client_email: clientEmail.trim() || null,
        service_fee_id: selectedFee || null,
        service_type: serviceType.trim(),
        description: description.trim() || null,
        amount: parseFloat(amount),
        fee_type: feeType,
        status: 'pending',
        created_by: user.id,
      });
      if (error) throw error;
      toast.success('Earning added!');
      resetForm();
      fetchData();
    } catch (err) {
      toast.error(`Failed: ${err.message}`);
    } finally {
      setSaving(false);
    }
  }

  function resetForm() {
    setClientName(''); setClientEmail(''); setSelectedFee('');
    setServiceType(''); setAmount(''); setDescription('');
    setFeeType('service_fee'); setShowForm(false);
  }

  async function handleMarkPaid(id) {
    await supabase.from('earnings').update({ status: 'paid', paid_at: new Date().toISOString() }).eq('id', id);
    toast.success('Marked as paid');
    fetchData();
  }

  async function handleCancel(id) {
    await supabase.from('earnings').update({ status: 'cancelled' }).eq('id', id);
    toast.success('Cancelled');
    fetchData();
  }

  const filtered = earnings.filter((e) => {
    if (filterStatus && e.status !== filterStatus) return false;
    if (filterService && e.service_type !== filterService) return false;
    return true;
  });

  const totalEarnings = earnings.filter((e) => e.status !== 'cancelled').reduce((s, e) => s + parseFloat(e.amount), 0);
  const totalPaid = earnings.filter((e) => e.status === 'paid').reduce((s, e) => s + parseFloat(e.amount), 0);
  const totalPending = earnings.filter((e) => e.status === 'pending').reduce((s, e) => s + parseFloat(e.amount), 0);
  const paidCount = earnings.filter((e) => e.status === 'paid').length;

  // Monthly breakdown
  const monthlyData = {};
  earnings.filter((e) => e.status !== 'cancelled').forEach((e) => {
    const month = new Date(e.created_at).toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
    monthlyData[month] = (monthlyData[month] || 0) + parseFloat(e.amount);
  });
  const months = Object.entries(monthlyData).slice(0, 6).reverse();
  const maxMonthly = Math.max(...months.map(([, v]) => v), 1);

  const uniqueServices = [...new Set(earnings.map((e) => e.service_type))];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Earnings & Payouts</h1>
          <p className="text-gray-500 mt-1">Track your tax service income and payout history</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="rounded-lg bg-brand-blue-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-blue-600 transition flex items-center gap-2"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Add Earning
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500">Total Earnings</span>
            <div className="h-9 w-9 rounded-lg bg-green-100 flex items-center justify-center">
              <svg className="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
              </svg>
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900">${totalEarnings.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500">Net Revenue (Paid)</span>
            <div className="h-9 w-9 rounded-lg bg-emerald-100 flex items-center justify-center">
              <svg className="h-5 w-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <p className="text-2xl font-bold text-green-600">${totalPaid.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500">Pending</span>
            <div className="h-9 w-9 rounded-lg bg-yellow-100 flex items-center justify-center">
              <svg className="h-5 w-5 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <p className="text-2xl font-bold text-yellow-600">${totalPending.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500">Paid Invoices</span>
            <div className="h-9 w-9 rounded-lg bg-blue-100 flex items-center justify-center">
              <span className="text-sm font-bold text-blue-600">#</span>
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900">{paidCount}</p>
        </div>
      </div>

      {/* Monthly Chart */}
      {months.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm mb-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Monthly Earnings</h2>
          <div className="flex items-end gap-3 h-32">
            {months.map(([month, val]) => (
              <div key={month} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-xs font-semibold text-gray-700">${(val / 1000).toFixed(1)}k</span>
                <div
                  className="w-full rounded-t bg-brand-blue-500 transition-all"
                  style={{ height: `${(val / maxMonthly) * 100}%`, minHeight: '4px' }}
                />
                <span className="text-[10px] text-gray-400">{month}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add Earning Form */}
      {showForm && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm mb-6">
          <h2 className="font-semibold text-gray-900 mb-4">Add New Earning</h2>
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Client Name *</label>
                <input type="text" value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="Client name"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-blue-500 focus:outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Client Email</label>
                <input type="email" value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} placeholder="client@email.com"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-blue-500 focus:outline-none" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Service Type *</label>
                <select value={selectedFee} onChange={(e) => handleFeeSelect(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-blue-500 focus:outline-none">
                  <option value="">Select a service (or type custom below)</option>
                  {serviceFees.map((fee) => (
                    <option key={fee.id} value={fee.id}>{fee.name} — ${fee.default_amount}</option>
                  ))}
                </select>
                <input type="text" value={serviceType} onChange={(e) => { setServiceType(e.target.value); setSelectedFee(''); setFeeType('manual'); }}
                  placeholder="Or enter custom service type" className="w-full mt-2 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-blue-500 focus:outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount ($) *</label>
                <input type="number" step="0.01" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-blue-500 focus:outline-none" />
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional notes"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-blue-500 focus:outline-none" />
            </div>

            <div className="flex gap-2">
              <button type="submit" disabled={saving}
                className="rounded-lg bg-brand-blue-500 px-5 py-2 text-sm font-semibold text-white hover:bg-brand-blue-600 disabled:opacity-50 transition">
                {saving ? 'Saving...' : 'Add Earning'}
              </button>
              <button type="button" onClick={resetForm} className="rounded-lg border border-gray-300 px-5 py-2 text-sm text-gray-600 hover:bg-gray-50 transition">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-3 mb-4">
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-blue-500 focus:outline-none">
          <option value="">All Status</option>
          <option value="pending">Pending</option>
          <option value="paid">Paid</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <select value={filterService} onChange={(e) => setFilterService(e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-blue-500 focus:outline-none">
          <option value="">All Services</option>
          {uniqueServices.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {/* Earnings Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="h-6 w-6 animate-spin rounded-full border-4 border-brand-blue-500 border-t-transparent" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="px-6 py-12 text-center text-gray-500">
            {earnings.length === 0 ? 'No earnings recorded yet. Add your first earning above.' : 'No earnings match your filters.'}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Date</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Client</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Service</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">Amount</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Status</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((earning) => (
                <tr key={earning.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-500">
                    {new Date(earning.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{earning.client_name}</p>
                    {earning.client_email && <p className="text-xs text-gray-400">{earning.client_email}</p>}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {earning.service_type}
                    {earning.description && <p className="text-xs text-gray-400 mt-0.5">{earning.description}</p>}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-gray-900">
                    ${parseFloat(earning.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${STATUS_COLORS[earning.status]}`}>
                      {earning.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {earning.status === 'pending' && (
                        <>
                          <button onClick={() => handleMarkPaid(earning.id)}
                            className="text-xs px-2.5 py-1 rounded bg-green-500 text-white hover:bg-green-600">
                            Mark Paid
                          </button>
                          <button onClick={() => handleCancel(earning.id)}
                            className="text-xs px-2.5 py-1 rounded bg-gray-200 text-gray-600 hover:bg-gray-300">
                            Cancel
                          </button>
                        </>
                      )}
                      {earning.status === 'paid' && earning.paid_at && (
                        <span className="text-xs text-gray-400">
                          {new Date(earning.paid_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
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
  );
}
