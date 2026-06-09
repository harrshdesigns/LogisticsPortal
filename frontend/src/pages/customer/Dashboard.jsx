import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import api from '../../services/api'
import StatusBadge from '../../components/shared/StatusBadge'
import { PageLoader } from '../../components/shared/LoadingSpinner'

export default function Dashboard() {
  const { user } = useAuth()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/orders?limit=5').then(({ data }) => {
      setData(data.data)
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  if (loading) return <PageLoader />

  const orders = data?.orders || []
  const total = data?.total || 0
  const inTransit = orders.filter(o => o.status === 'IN_TRANSIT').length
  const delivered = orders.filter(o => o.status === 'DELIVERED').length
  const pending = orders.filter(o => o.status === 'PENDING').length

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Welcome */}
      <div className="card p-6 bg-gradient-to-r from-red-600 to-red-700 border-0">
        <h1 className="text-xl font-bold text-white">Welcome back, {user?.name?.split(' ')[0]}! 👋</h1>
        <p className="mt-1 text-sm text-red-100">{user?.company || 'Your logistics dashboard'}</p>
        <div className="mt-4">
          <Link to="/book" className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 transition">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Book a Shipment
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Orders" value={total} icon="📦" />
        <StatCard label="In Transit" value={inTransit} icon="🚚" color="amber" />
        <StatCard label="Delivered" value={delivered} icon="✅" color="green" />
        <StatCard label="Pending" value={pending} icon="🕐" color="zinc" />
      </div>

      {/* Recent orders */}
      <div className="card">
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100">
          <h2 className="font-semibold text-zinc-900">Recent Orders</h2>
          <Link to="/orders" className="text-sm font-medium text-red-600 hover:text-red-700">View all →</Link>
        </div>
        {orders.length === 0 ? (
          <div className="px-6 py-10 text-center">
            <p className="text-zinc-500 text-sm">No orders yet.</p>
            <Link to="/book" className="mt-3 btn-primary inline-flex">Book your first shipment</Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-100">
                  <th className="px-6 py-3 text-left font-medium text-zinc-500">Docket No</th>
                  <th className="px-6 py-3 text-left font-medium text-zinc-500">Commodity</th>
                  <th className="px-6 py-3 text-left font-medium text-zinc-500">Service</th>
                  <th className="px-6 py-3 text-left font-medium text-zinc-500">Status</th>
                  <th className="px-6 py-3 text-left font-medium text-zinc-500">Date</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id} className="border-b border-zinc-50 hover:bg-zinc-50 transition">
                    <td className="px-6 py-3">
                      <Link to={`/orders/${order.clientDocketNo}`} className="font-mono font-semibold text-red-600 hover:text-red-700">
                        {order.clientDocketNo}
                      </Link>
                    </td>
                    <td className="px-6 py-3 text-zinc-700">{order.commodity}</td>
                    <td className="px-6 py-3 text-zinc-500">{order.serviceType}</td>
                    <td className="px-6 py-3"><StatusBadge status={order.status} /></td>
                    <td className="px-6 py-3 text-zinc-500">{new Date(order.createdAt).toLocaleDateString('en-IN')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

function StatCard({ label, value, icon, color = 'red' }) {
  const colors = {
    red: 'bg-red-50 text-red-700',
    amber: 'bg-amber-50 text-amber-700',
    green: 'bg-green-50 text-green-700',
    zinc: 'bg-zinc-100 text-zinc-600',
  }
  return (
    <div className="card p-5">
      <div className={`inline-flex h-9 w-9 items-center justify-center rounded-lg text-lg ${colors[color]}`}>{icon}</div>
      <p className="mt-3 text-2xl font-bold text-zinc-900">{value}</p>
      <p className="text-sm text-zinc-500">{label}</p>
    </div>
  )
}
