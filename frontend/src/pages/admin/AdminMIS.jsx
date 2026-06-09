import { useEffect, useState } from 'react'
import api from '../../services/api'
import { PageLoader } from '../../components/shared/LoadingSpinner'

export default function AdminMIS() {
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ dateFrom: '', dateTo: '' })
  const [generating, setGenerating] = useState(false)
  const [msg, setMsg] = useState('')

  const fetch = () => {
    setLoading(true)
    api.get('/admin/mis').then(({ data }) => setReports(data.data.reports))
      .catch(() => {}).finally(() => setLoading(false))
  }
  useEffect(() => { fetch() }, [])

  const handleGenerate = async (e) => {
    e.preventDefault(); setMsg(''); setGenerating(true)
    try {
      const { data } = await api.post('/admin/mis/generate', form)
      setMsg('MIS report generated and emailed to Super Admins!')
      fetch()
    } catch (err) {
      setMsg('Failed: ' + (err.response?.data?.message || 'error'))
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="space-y-5 max-w-4xl">
      <h1 className="text-xl font-bold text-zinc-900">MIS Reports</h1>

      {/* Generate form */}
      <div className="card p-5">
        <h2 className="text-sm font-semibold text-zinc-700 mb-4">Generate MIS Report</h2>
        <form onSubmit={handleGenerate} className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="label">From *</label>
            <input className="input" type="date" value={form.dateFrom} onChange={e => setForm(f => ({ ...f, dateFrom: e.target.value }))} required />
          </div>
          <div>
            <label className="label">To *</label>
            <input className="input" type="date" value={form.dateTo} onChange={e => setForm(f => ({ ...f, dateTo: e.target.value }))} required />
          </div>
          <button type="submit" className="btn-primary" disabled={generating}>
            {generating ? 'Generating…' : '📊 Generate Report'}
          </button>
        </form>
        {msg && <p className={`mt-3 text-sm ${msg.startsWith('MIS') ? 'text-green-700' : 'text-red-600'}`}>{msg}</p>}
      </div>

      {/* Reports list */}
      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-zinc-100">
          <h2 className="text-sm font-semibold text-zinc-700">Past Reports</h2>
        </div>
        {loading ? <PageLoader /> : reports.length === 0 ? (
          <p className="py-10 text-center text-sm text-zinc-400">No reports generated yet</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-100 bg-zinc-50">
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase text-zinc-500">Report Date</th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase text-zinc-500">Generated</th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase text-zinc-500">Sent At</th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase text-zinc-500">Download</th>
              </tr>
            </thead>
            <tbody>
              {reports.map(r => (
                <tr key={r.id} className="border-b border-zinc-50 hover:bg-zinc-50">
                  <td className="px-5 py-3 font-medium text-zinc-900">{new Date(r.reportDate).toLocaleDateString('en-IN',{day:'numeric',month:'long',year:'numeric'})}</td>
                  <td className="px-5 py-3 text-zinc-500">{new Date(r.createdAt).toLocaleString('en-IN',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}</td>
                  <td className="px-5 py-3 text-zinc-500">{r.sentAt ? new Date(r.sentAt).toLocaleString('en-IN',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}) : '—'}</td>
                  <td className="px-5 py-3">
                    {r.pdfUrl ? (
                      <a href={`/api/admin/mis/${r.id}/download`} target="_blank" rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-medium text-red-600 hover:text-red-700">
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        PDF
                      </a>
                    ) : <span className="text-xs text-zinc-400">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
