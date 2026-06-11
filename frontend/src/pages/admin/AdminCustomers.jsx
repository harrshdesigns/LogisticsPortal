import { useEffect, useState } from 'react'
import api from '../../services/api'
import { PageLoader } from '../../components/shared/LoadingSpinner'

export default function AdminCustomers() {
  const [customers, setCustomers] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const limit = 20

  const fetch = (pg = 1) => {
    setLoading(true)
    api.get(`/admin/customers?page=${pg}&limit=${limit}`).then(({ data }) => {
      setCustomers(data.data.customers); setTotal(data.data.total)
    }).catch(() => {}).finally(() => setLoading(false))
  }

  useEffect(() => { fetch(1) }, [])

  const totalPages = Math.ceil(total / limit)

  return (
    <div className="space-y-4 max-w-5xl">
      <h1 className="text-xl font-bold text-zinc-900">Customers ({total})</h1>

      <div className="card overflow-hidden">
        {loading ? <PageLoader /> : (
          <>
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-100 bg-zinc-50">
                    {['Company','Contact','Email','Phone','GSTIN','Total Orders','Last Order','Status'].map(h => (
                      <th key={h} className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {customers.map(c => (
                    <tr key={c.id} className="border-b border-zinc-50 hover:bg-zinc-50">
                      <td className="px-5 py-3 font-semibold text-zinc-900">{c.company || '—'}</td>
                      <td className="px-5 py-3 text-zinc-700">{c.name}</td>
                      <td className="px-5 py-3 text-zinc-600 text-xs">{c.email}</td>
                      <td className="px-5 py-3 text-zinc-500">{c.phone || '—'}</td>
                      <td className="px-5 py-3 text-zinc-400 text-xs font-mono">{c.gstin || '—'}</td>
                      <td className="px-5 py-3 text-center font-semibold text-zinc-800">{c._count?.orders || 0}</td>
                      <td className="px-5 py-3 text-zinc-400 text-xs">
                        {c.orders?.[0]?.createdAt ? new Date(c.orders[0].createdAt).toLocaleDateString('en-IN') : '—'}
                      </td>
                      <td className="px-5 py-3">
                        <span className={`badge ${c.isActive ? 'bg-green-100 text-green-700' : 'bg-zinc-100 text-zinc-500'}`}>
                          {c.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            {customers.length === 0 ? (
              <p className="py-10 text-center text-sm text-zinc-400">No customers found</p>
            ) : (
              <div className="md:hidden space-y-3 p-4">
                {customers.map(c => (
                  <div key={c.id} className="rounded-lg border border-zinc-200 bg-white p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-zinc-900">{c.company || c.name}</p>
                        {c.company && <p className="text-xs text-zinc-500">{c.name}</p>}
                      </div>
                      <span className={`badge shrink-0 ${c.isActive ? 'bg-green-100 text-green-700' : 'bg-zinc-100 text-zinc-500'}`}>
                        {c.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <div className="mt-2 space-y-0.5 text-xs text-zinc-500">
                      <p>{c.email}</p>
                      {c.phone && <p>{c.phone}</p>}
                    </div>
                    <div className="mt-2 flex items-center justify-between text-xs text-zinc-400">
                      <span>{c._count?.orders || 0} orders</span>
                      {c.orders?.[0]?.createdAt && <span>Last: {new Date(c.orders[0].createdAt).toLocaleDateString('en-IN')}</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-zinc-100 px-6 py-3">
                <p className="text-sm text-zinc-500">{(page-1)*limit+1}–{Math.min(page*limit,total)} of {total}</p>
                <div className="flex gap-2">
                  <button onClick={() => { setPage(p => p-1); fetch(page-1) }} disabled={page===1} className="btn-secondary text-xs px-3 py-1.5">← Prev</button>
                  <button onClick={() => { setPage(p => p+1); fetch(page+1) }} disabled={page===totalPages} className="btn-secondary text-xs px-3 py-1.5">Next →</button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
