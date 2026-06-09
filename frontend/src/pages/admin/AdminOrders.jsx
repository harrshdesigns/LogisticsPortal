import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../../services/api'
import StatusBadge from '../../components/shared/StatusBadge'
import { PageLoader } from '../../components/shared/LoadingSpinner'

const STATUSES = ['', 'PENDING', 'ASSIGNED', 'BOOKED', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED', 'EXCEPTION', 'CANCELLED']
const PARTNERS = ['', 'DELHIVERY', 'DP_WORLD', 'VRL', 'DTDC', 'MANUAL']

export default function AdminOrders() {
  const [orders, setOrders] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [filters, setFilters] = useState({ status: '', partner: '', search: '', dateFrom: '', dateTo: '' })
  const limit = 20

  const fetchOrders = (pg = page, f = filters) => {
    setLoading(true)
    const params = new URLSearchParams({ page: pg, limit })
    if (f.status) params.set('status', f.status)
    if (f.partner) params.set('partner', f.partner)
    if (f.search) params.set('search', f.search)
    if (f.dateFrom) params.set('dateFrom', f.dateFrom)
    if (f.dateTo) params.set('dateTo', f.dateTo)
    api.get(`/admin/orders?${params}`).then(({ data }) => {
      setOrders(data.data.orders); setTotal(data.data.total)
    }).catch(() => {}).finally(() => setLoading(false))
  }

  useEffect(() => { fetchOrders(1, filters) }, [])

  const setFilter = (k) => (e) => {
    const nf = { ...filters, [k]: e.target.value }
    setFilters(nf); setPage(1); fetchOrders(1, nf)
  }

  const totalPages = Math.ceil(total / limit)

  return (
    <div className="space-y-4 max-w-full">
      <h1 className="text-xl font-bold text-zinc-900">Order Management</h1>

      {/* Filters */}
      <div className="card p-4 flex flex-wrap gap-3">
        <input className="input flex-1 min-w-40" placeholder="Search docket…" value={filters.search}
          onChange={e => { const nf = { ...filters, search: e.target.value }; setFilters(nf) }}
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
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-100 bg-zinc-50">
                    {['Client Docket','Customer','Commodity','Weight','Service','Status','Partner','Partner Docket','Date',''].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {orders.map(o => (
                    <tr key={o.id} className="border-b border-zinc-50 hover:bg-zinc-50">
                      <td className="px-4 py-3 font-mono text-xs font-semibold text-red-600 whitespace-nowrap">{o.clientDocketNo}</td>
                      <td className="px-4 py-3 text-zinc-700 max-w-[120px] truncate">{o.user?.company || o.user?.name}</td>
                      <td className="px-4 py-3 text-zinc-600 max-w-[120px] truncate">{o.commodity}</td>
                      <td className="px-4 py-3 text-zinc-500 whitespace-nowrap">{o.weight} kg</td>
                      <td className="px-4 py-3 text-zinc-500 whitespace-nowrap">{o.serviceType}</td>
                      <td className="px-4 py-3"><StatusBadge status={o.status} /></td>
                      <td className="px-4 py-3 text-zinc-500 text-xs whitespace-nowrap">{o.shipment?.partnerName?.replace('_', ' ') || '—'}</td>
                      <td className="px-4 py-3 font-mono text-xs text-zinc-400 whitespace-nowrap">{o.shipment?.partnerDocketNo || '—'}</td>
                      <td className="px-4 py-3 text-zinc-400 text-xs whitespace-nowrap">{new Date(o.createdAt).toLocaleDateString('en-IN')}</td>
                      <td className="px-4 py-3">
                        <Link to={`/admin/orders/${o.id}`} className="text-xs font-medium text-red-600 hover:text-red-700 whitespace-nowrap">View →</Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {orders.length === 0 && <p className="px-6 py-10 text-center text-sm text-zinc-400">No orders found</p>}
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-zinc-100 px-6 py-3">
                <p className="text-sm text-zinc-500">Showing {(page-1)*limit+1}–{Math.min(page*limit,total)} of {total}</p>
                <div className="flex gap-2">
                  <button onClick={() => { setPage(p => p-1); fetchOrders(page-1) }} disabled={page===1} className="btn-secondary text-xs px-3 py-1.5">← Prev</button>
                  <button onClick={() => { setPage(p => p+1); fetchOrders(page+1) }} disabled={page===totalPages} className="btn-secondary text-xs px-3 py-1.5">Next →</button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
