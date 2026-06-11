import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import StatusBadge from '../../components/shared/StatusBadge';
import { PageLoader } from '../../components/shared/LoadingSpinner';

const STATUSES = ['', 'PENDING', 'ASSIGNED', 'BOOKED', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED', 'EXCEPTION', 'CANCELLED'];
const PARTNERS = ['', 'DELHIVERY', 'DP_WORLD', 'VRL', 'DTDC', 'MANUAL'];

export default function AdminOrders() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({ status: '', partner: '', search: '', dateFrom: '', dateTo: '' });
  const limit = 20;

  const fetchOrders = (pg = page, f = filters) => {
    setLoading(true);
    const params = new URLSearchParams({ page: pg, limit });
    if (f.status) params.set('status', f.status);
    if (f.partner) params.set('partner', f.partner);
    if (f.search) params.set('search', f.search);
    if (f.dateFrom) params.set('dateFrom', f.dateFrom);
    if (f.dateTo) params.set('dateTo', f.dateTo);
    api.get(`/admin/orders?${params}`)
      .then(({ data }) => { setOrders(data.data.orders); setTotal(data.data.total); })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchOrders(1, filters); }, []);

  const setFilter = k => e => {
    const nf = { ...filters, [k]: e.target.value };
    setFilters(nf); setPage(1); fetchOrders(1, nf);
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-4 max-w-full">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-zinc-900">Order Management</h1>
        <button onClick={() => navigate('/admin/bookings/direct')}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors">
          + New Direct Booking
        </button>
      </div>

      {/* Filters */}
      <div className="card p-4 flex flex-wrap gap-3">
        <input className="input flex-1 min-w-40" placeholder="Search docket…" value={filters.search}
          onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
          onKeyDown={e => e.key === 'Enter' && fetchOrders(1, filters)} />
        <select className="input w-36" value={filters.status} onChange={setFilter('status')}>
          <option value="">All Status</option>
          {STATUSES.filter(Boolean).map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
        </select>
        <select className="input w-36" value={filters.partner} onChange={setFilter('partner')}>
          <option value="">All Partners</option>
          {PARTNERS.filter(Boolean).map(p => <option key={p} value={p}>{p.replace('_', ' ')}</option>)}
        </select>
        <input className="input w-36" type="date" value={filters.dateFrom} onChange={setFilter('dateFrom')} />
        <input className="input w-36" type="date" value={filters.dateTo} onChange={setFilter('dateTo')} />
        <button onClick={() => fetchOrders(1, filters)} className="btn-primary">Search</button>
      </div>

      <div className="card overflow-hidden">
        {loading ? <PageLoader /> : (
          <>
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-100 bg-zinc-50">
                    {['Client Docket', 'Customer / Consignor', 'Consignee', 'Weight', 'Service', 'Status', 'Partner', 'Date', ''].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {orders.map(o => (
                    <tr key={o.id} className="border-b border-zinc-50 hover:bg-zinc-50 transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="font-mono text-xs font-semibold text-blue-700">{o.clientDocketNo}</span>
                        {o.isDirectBooking && <span className="ml-1 text-xs bg-purple-100 text-purple-600 px-1.5 py-0.5 rounded-full">Direct</span>}
                      </td>
                      <td className="px-4 py-3 text-zinc-700 max-w-[140px]">
                        <p className="truncate font-medium">{o.user?.company || o.user?.name || o.consignorName || '—'}</p>
                        {o.consignorCity && <p className="text-xs text-zinc-400 truncate">{o.consignorCity}, {o.consignorState}</p>}
                      </td>
                      <td className="px-4 py-3 text-zinc-600 max-w-[140px]">
                        <p className="truncate">{o.consigneeName || '—'}</p>
                        {o.consigneeCity && <p className="text-xs text-zinc-400 truncate">{o.consigneeCity}, {o.consigneeState}</p>}
                      </td>
                      <td className="px-4 py-3 text-zinc-500 whitespace-nowrap">{o.actualWeight ? `${o.actualWeight} kg` : '—'}</td>
                      <td className="px-4 py-3 text-zinc-500 whitespace-nowrap text-xs">{o.serviceType}</td>
                      <td className="px-4 py-3"><StatusBadge status={o.status} /></td>
                      <td className="px-4 py-3 text-zinc-500 text-xs whitespace-nowrap">{o.shipment?.partnerName?.replace('_', ' ') || '—'}</td>
                      <td className="px-4 py-3 text-zinc-400 text-xs whitespace-nowrap">{new Date(o.createdAt).toLocaleDateString('en-IN')}</td>
                      <td className="px-4 py-3">
                        <Link to={`/admin/orders/${o.id}`} className="text-xs font-medium text-blue-600 hover:text-blue-700 whitespace-nowrap">View →</Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {orders.length === 0 && (
                <p className="px-6 py-10 text-center text-sm text-zinc-400">No orders found</p>
              )}
            </div>

            {/* Mobile cards */}
            <div className="md:hidden space-y-3 p-4">
              {orders.length === 0 ? (
                <p className="text-center text-sm text-zinc-400 py-6">No orders found</p>
              ) : orders.map(o => (
                <div key={o.id} className="rounded-lg border border-zinc-200 bg-white p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-mono text-xs font-semibold text-blue-700">{o.clientDocketNo}</p>
                      {o.isDirectBooking && <span className="mt-0.5 inline-block text-xs bg-purple-100 text-purple-600 px-1.5 py-0.5 rounded-full">Direct</span>}
                    </div>
                    <StatusBadge status={o.status} />
                  </div>
                  <p className="mt-2 text-sm font-medium text-zinc-800">{o.user?.company || o.user?.name || o.consignorName || '—'}</p>
                  {o.consignorCity && <p className="text-xs text-zinc-400">{o.consignorCity}, {o.consignorState}</p>}
                  <div className="mt-2 flex items-center justify-between">
                    <p className="text-xs text-zinc-500">{o.shipment?.partnerName?.replace('_', ' ') || '—'} · {new Date(o.createdAt).toLocaleDateString('en-IN')}</p>
                    <Link to={`/admin/orders/${o.id}`} className="text-xs font-medium text-blue-600 hover:text-blue-700">View →</Link>
                  </div>
                </div>
              ))}
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-zinc-100 px-6 py-3">
                <p className="text-sm text-zinc-500">Showing {(page - 1) * limit + 1}–{Math.min(page * limit, total)} of {total}</p>
                <div className="flex gap-2">
                  <button onClick={() => { setPage(p => p - 1); fetchOrders(page - 1); }} disabled={page === 1}
                    className="btn-secondary text-xs px-3 py-1.5">← Prev</button>
                  <button onClick={() => { setPage(p => p + 1); fetchOrders(page + 1); }} disabled={page === totalPages}
                    className="btn-secondary text-xs px-3 py-1.5">Next →</button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
