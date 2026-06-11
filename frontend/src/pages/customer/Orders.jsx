import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../../services/api'
import StatusBadge from '../../components/shared/StatusBadge'
import { PageLoader } from '../../components/shared/LoadingSpinner'
import EmptyState from '../../components/shared/EmptyState'
import { PackageIcon } from '../../components/shared/Icons'

const STATUSES = ['', 'PENDING', 'ASSIGNED', 'BOOKED', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED', 'EXCEPTION', 'CANCELLED']

export default function Orders() {
  const [orders, setOrders] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState('')
  const [search, setSearch] = useState('')
  const limit = 10

  const fetchOrders = (pg = 1, st = status, q = search) => {
    setLoading(true)
    const params = new URLSearchParams({ page: pg, limit })
    if (st) params.set('status', st)
    if (q) params.set('search', q)
    api.get(`/orders?${params}`).then(({ data }) => {
      setOrders(data.data.orders)
      setTotal(data.data.total)
    }).catch(() => {}).finally(() => setLoading(false))
  }

  useEffect(() => { fetchOrders(1, status, search) }, [status])

  const handleSearch = (e) => {
    e.preventDefault()
    setPage(1); fetchOrders(1, status, search)
  }

  const totalPages = Math.ceil(total / limit)

  return (
    <div className="max-w-5xl space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-zinc-900">My Orders</h1>
        <Link to="/book" className="btn-primary">+ Book Shipment</Link>
      </div>

      {/* Filters */}
      <div className="card p-4 flex flex-col sm:flex-row gap-3">
        <form onSubmit={handleSearch} className="flex flex-1 gap-2">
          <input className="input flex-1" placeholder="Search by docket number…"
            value={search} onChange={e => setSearch(e.target.value)} />
          <button type="submit" className="btn-secondary shrink-0">Search</button>
        </form>
        <select className="input sm:w-48" value={status} onChange={e => { setStatus(e.target.value); setPage(1) }}>
          <option value="">All Statuses</option>
          {STATUSES.filter(Boolean).map(s => (
            <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
          ))}
        </select>
      </div>

      <div className="card overflow-hidden">
        {loading ? <PageLoader /> : orders.length === 0 ? (
          <EmptyState icon={<PackageIcon className="h-12 w-12" />} title="No orders found" description="Book your first shipment to get started." />
        ) : (
          <>
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-100 bg-zinc-50">
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">Docket No</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">Item Description</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">Weight</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">Service</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map(order => (
                    <tr key={order.id} className="border-b border-zinc-50 hover:bg-zinc-50 transition">
                      <td className="px-6 py-4">
                        <Link to={`/orders/${order.clientDocketNo}`} className="font-mono font-semibold text-red-600 hover:text-red-700 hover:underline">
                          {order.clientDocketNo}
                        </Link>
                      </td>
                      <td className="px-6 py-4 text-zinc-700 max-w-[160px] truncate">{order.itemDescription || '—'}</td>
                      <td className="px-6 py-4 text-zinc-600">{order.actualWeight ? `${order.actualWeight} kg` : '—'}</td>
                      <td className="px-6 py-4 text-zinc-600">{order.serviceType}</td>
                      <td className="px-6 py-4"><StatusBadge status={order.status} /></td>
                      <td className="px-6 py-4 text-zinc-500">{new Date(order.createdAt).toLocaleDateString('en-IN')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden space-y-3 p-4">
              {orders.map(order => (
                <div key={order.id} className="rounded-lg border border-zinc-200 bg-white p-4">
                  <div className="flex items-start justify-between gap-2">
                    <Link to={`/orders/${order.clientDocketNo}`} className="font-mono text-sm font-semibold text-red-600 hover:text-red-700">
                      {order.clientDocketNo}
                    </Link>
                    <StatusBadge status={order.status} />
                  </div>
                  <p className="mt-1 text-sm text-zinc-700 truncate">{order.itemDescription || '—'}</p>
                  <div className="mt-2 flex items-center justify-between text-xs text-zinc-400">
                    <span>{order.serviceType}{order.actualWeight ? ` · ${order.actualWeight} kg` : ''}</span>
                    <span>{new Date(order.createdAt).toLocaleDateString('en-IN')}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-zinc-100 px-6 py-3">
                <p className="text-sm text-zinc-500">Showing {(page - 1) * limit + 1}–{Math.min(page * limit, total)} of {total}</p>
                <div className="flex gap-2">
                  <button onClick={() => { setPage(p => p - 1); fetchOrders(page - 1) }} disabled={page === 1} className="btn-secondary text-xs px-3 py-1.5">← Prev</button>
                  <button onClick={() => { setPage(p => p + 1); fetchOrders(page + 1) }} disabled={page === totalPages} className="btn-secondary text-xs px-3 py-1.5">Next →</button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
