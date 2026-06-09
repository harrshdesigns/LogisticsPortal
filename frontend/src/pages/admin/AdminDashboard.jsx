import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import api from '../../services/api'
import StatusBadge from '../../components/shared/StatusBadge'
import { PageLoader } from '../../components/shared/LoadingSpinner'

const PARTNER_COLORS = { DELHIVERY: '#dc2626', DP_WORLD: '#2563eb', VRL: '#16a34a', DTDC: '#d97706', MANUAL: '#71717a' }

export default function AdminDashboard() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/admin/dashboard').then(({ data }) => setStats(data.data))
      .catch(() => {}).finally(() => setLoading(false))
  }, [])

  if (loading) return <PageLoader />

  const chartData = (stats?.ordersByPartner || []).map(p => ({
    name: p.partner?.replace('_', ' '),
    count: p.count,
    fill: PARTNER_COLORS[p.partner] || '#71717a',
  }))

  return (
    <div className="space-y-6 max-w-6xl">
      <h1 className="text-xl font-bold text-zinc-900">Dashboard</h1>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard label="Orders Today" value={stats?.totalToday ?? 0} icon="📋" />
        <StatCard label="Pending" value={stats?.pending ?? 0} icon="⏳" color="amber" />
        <StatCard label="In Transit" value={stats?.inTransit ?? 0} icon="🚚" color="blue" />
        <StatCard label="Delivered Today" value={stats?.deliveredToday ?? 0} icon="✅" color="green" />
        <StatCard label="Customers" value={stats?.totalCustomers ?? 0} icon="👥" color="purple" />
        <StatCard label="Unassigned" value={stats?.pending ?? 0} icon="⚠️" color="red" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart */}
        <div className="card p-5 lg:col-span-1">
          <h2 className="text-sm font-semibold text-zinc-700 mb-4">Orders by Partner</h2>
          {chartData.length === 0 ? (
            <p className="text-sm text-zinc-400 py-8 text-center">No bookings yet</p>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartData} barSize={28}>
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} width={30} />
                <Tooltip formatter={(v) => [`${v} orders`, 'Orders']} />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {chartData.map((d, i) => <Cell key={i} fill={d.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Recent Orders */}
        <div className="card lg:col-span-2">
          <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100">
            <h2 className="text-sm font-semibold text-zinc-700">Recent Orders</h2>
            <Link to="/admin/orders" className="text-xs font-medium text-red-600 hover:text-red-700">View all →</Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-50">
                  <th className="px-5 py-2.5 text-left text-xs font-semibold text-zinc-400">Docket</th>
                  <th className="px-5 py-2.5 text-left text-xs font-semibold text-zinc-400">Customer</th>
                  <th className="px-5 py-2.5 text-left text-xs font-semibold text-zinc-400">Status</th>
                  <th className="px-5 py-2.5 text-left text-xs font-semibold text-zinc-400">Partner</th>
                </tr>
              </thead>
              <tbody>
                {(stats?.recentOrders || []).map(o => (
                  <tr key={o.id} className="border-b border-zinc-50 hover:bg-zinc-50">
                    <td className="px-5 py-3">
                      <Link to={`/admin/orders/${o.id}`} className="font-mono text-xs font-semibold text-red-600 hover:text-red-700">{o.clientDocketNo}</Link>
                    </td>
                    <td className="px-5 py-3 text-zinc-700 text-xs">{o.user?.company || o.user?.name}</td>
                    <td className="px-5 py-3"><StatusBadge status={o.status} /></td>
                    <td className="px-5 py-3 text-zinc-500 text-xs">{o.shipment?.partnerName?.replace('_', ' ') || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

function StatCard({ label, value, icon, color = 'zinc' }) {
  const colors = { zinc: 'bg-zinc-50 text-zinc-600', red: 'bg-red-50 text-red-600', amber: 'bg-amber-50 text-amber-700', blue: 'bg-blue-50 text-blue-700', green: 'bg-green-50 text-green-700', purple: 'bg-purple-50 text-purple-700' }
  return (
    <div className="card p-4">
      <div className={`inline-flex h-8 w-8 items-center justify-center rounded-lg text-base ${colors[color]}`}>{icon}</div>
      <p className="mt-2 text-2xl font-bold text-zinc-900">{value}</p>
      <p className="text-xs text-zinc-500">{label}</p>
    </div>
  )
}
