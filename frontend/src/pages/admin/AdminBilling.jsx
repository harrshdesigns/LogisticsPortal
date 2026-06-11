import { useEffect, useState } from 'react'
import api from '../../services/api'
import StatusBadge from '../../components/shared/StatusBadge'
import { PageLoader } from '../../components/shared/LoadingSpinner'
import Modal from '../../components/shared/Modal'
import { XMarkIcon } from '../../components/shared/Icons'

export default function AdminBilling() {
  const [invoices, setInvoices] = useState([])
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState({ userId: '', dateFrom: '', dateTo: '', applyGST: true })
  const [lineItems, setLineItems] = useState([{ docketNo: '', date: new Date().toISOString().slice(0,10), commodity: '', weight: '', serviceType: 'SURFACE', amount: '' }])
  const [saving, setSaving] = useState(false)
  const [sending, setSending] = useState(null)
  const [error, setError] = useState('')
  const [msg, setMsg] = useState('')

  const fetchAll = () => {
    setLoading(true)
    Promise.all([
      api.get('/admin/invoices'),
      api.get('/admin/customers?limit=100'),
    ]).then(([inv, cust]) => {
      setInvoices(inv.data.data.invoices)
      setCustomers(cust.data.data.customers)
    }).catch(() => {}).finally(() => setLoading(false))
  }
  useEffect(() => { fetchAll() }, [])

  const setItem = (i, k) => (e) => {
    const items = [...lineItems]
    items[i] = { ...items[i], [k]: e.target.value }
    setLineItems(items)
  }
  const addItem = () => setLineItems(l => [...l, { docketNo: '', date: new Date().toISOString().slice(0,10), commodity: '', weight: '', serviceType: 'SURFACE', amount: '' }])
  const removeItem = (i) => setLineItems(l => l.filter((_, idx) => idx !== i))

  const subtotal = lineItems.reduce((s, i) => s + parseFloat(i.amount || 0), 0)
  const tax = form.applyGST ? subtotal * 0.18 : 0
  const total = subtotal + tax

  const handleCreate = async (e) => {
    e.preventDefault(); setError(''); setSaving(true)
    try {
      await api.post('/admin/invoices', { ...form, lineItems })
      setModalOpen(false); fetchAll()
    } catch (err) {
      setError(err.response?.data?.message || 'Failed')
    } finally {
      setSaving(false)
    }
  }

  const handleSend = async (id) => {
    setSending(id); setMsg('')
    try {
      await api.post(`/admin/invoices/${id}/send`)
      setMsg('Invoice generated and sent!')
      fetchAll()
    } catch (err) {
      setMsg('Failed: ' + (err.response?.data?.message || 'error'))
    } finally {
      setSending(null)
    }
  }

  return (
    <div className="space-y-4 max-w-5xl">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-zinc-900">Billing & Invoices</h1>
        <button onClick={() => { setModalOpen(true); setError('') }} className="btn-primary">+ Generate Invoice</button>
      </div>

      {msg && <div className={`rounded-lg px-4 py-3 text-sm ${msg.startsWith('Invoice') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>{msg}</div>}

      <div className="card overflow-hidden">
        {loading ? <PageLoader /> : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-100 bg-zinc-50">
                {['Invoice No','Customer','Period','Subtotal','Tax','Total','Status','Actions'].map(h => (
                  <th key={h} className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {invoices.map(inv => (
                <tr key={inv.id} className="border-b border-zinc-50 hover:bg-zinc-50">
                  <td className="px-5 py-3 font-mono text-xs font-semibold text-zinc-900">{inv.invoiceNo}</td>
                  <td className="px-5 py-3 text-zinc-700">{inv.user?.company || inv.user?.name}</td>
                  <td className="px-5 py-3 text-zinc-500 text-xs">
                    {new Date(inv.dateFrom).toLocaleDateString('en-IN',{day:'numeric',month:'short'})} – {new Date(inv.dateTo).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'})}
                  </td>
                  <td className="px-5 py-3 text-zinc-700">₹{Number(inv.subtotal).toLocaleString('en-IN')}</td>
                  <td className="px-5 py-3 text-zinc-500">₹{Number(inv.tax).toLocaleString('en-IN')}</td>
                  <td className="px-5 py-3 font-semibold">₹{Number(inv.totalAmount).toLocaleString('en-IN')}</td>
                  <td className="px-5 py-3"><StatusBadge status={inv.status} /></td>
                  <td className="px-5 py-3 flex gap-2 flex-wrap">
                    {inv.pdfUrl && (
                      <a href={`/storage/pdfs/${inv.invoiceNo}.pdf`} target="_blank" rel="noreferrer"
                        className="text-xs font-medium text-blue-600 hover:underline">PDF</a>
                    )}
                    {inv.status !== 'PAID' && (
                      <button onClick={() => handleSend(inv.id)} disabled={sending === inv.id}
                        className="text-xs font-medium text-red-600 hover:text-red-700 disabled:opacity-50">
                        {sending === inv.id ? 'Sending…' : 'Send'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {invoices.length === 0 && (
                <tr><td colSpan={8} className="py-10 text-center text-sm text-zinc-400">No invoices yet</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Generate Invoice" size="xl">
        <form onSubmit={handleCreate} className="space-y-5">
          {error && <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>}

          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-3 sm:col-span-1">
              <label className="label">Customer *</label>
              <select className="input" value={form.userId} onChange={e => setForm(f => ({ ...f, userId: e.target.value }))} required>
                <option value="">Select customer</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.company || c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">From *</label>
              <input className="input" type="date" value={form.dateFrom} onChange={e => setForm(f => ({ ...f, dateFrom: e.target.value }))} required />
            </div>
            <div>
              <label className="label">To *</label>
              <input className="input" type="date" value={form.dateTo} onChange={e => setForm(f => ({ ...f, dateTo: e.target.value }))} required />
            </div>
          </div>

          {/* Line Items */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="label mb-0">Line Items</label>
              <button type="button" onClick={addItem} className="text-sm text-red-600 hover:text-red-700 font-medium">+ Add row</button>
            </div>
            <div className="overflow-x-auto rounded-lg border border-zinc-200">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-zinc-50 border-b border-zinc-200">
                    <th className="px-3 py-2 text-left text-xs font-semibold text-zinc-500">Docket No</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-zinc-500">Date</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-zinc-500">Commodity</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-zinc-500">Weight</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-zinc-500">Service</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-zinc-500">Amount (₹)</th>
                    <th className="px-3 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {lineItems.map((item, i) => (
                    <tr key={i} className="border-b border-zinc-100">
                      <td className="px-2 py-1"><input className="input text-xs py-1.5 w-28" value={item.docketNo} onChange={setItem(i,'docketNo')} placeholder="CLT-2026-…" /></td>
                      <td className="px-2 py-1"><input className="input text-xs py-1.5 w-28" type="date" value={item.date} onChange={setItem(i,'date')} /></td>
                      <td className="px-2 py-1"><input className="input text-xs py-1.5 w-28" value={item.commodity} onChange={setItem(i,'commodity')} /></td>
                      <td className="px-2 py-1"><input className="input text-xs py-1.5 w-20" value={item.weight} onChange={setItem(i,'weight')} placeholder="kg" /></td>
                      <td className="px-2 py-1">
                        <select className="input text-xs py-1.5 w-24" value={item.serviceType} onChange={setItem(i,'serviceType')}>
                          <option>SURFACE</option><option>AIR</option><option>EXPRESS</option>
                        </select>
                      </td>
                      <td className="px-2 py-1"><input className="input text-xs py-1.5 w-24" type="number" value={item.amount} onChange={setItem(i,'amount')} placeholder="0" required /></td>
                      <td className="px-2 py-1">
                        <button type="button" onClick={() => removeItem(i)} className="text-zinc-400 hover:text-red-600"><XMarkIcon className="h-3.5 w-3.5" /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Totals */}
          <div className="flex items-end justify-between">
            <label className="flex items-center gap-2 text-sm text-zinc-700 cursor-pointer">
              <input type="checkbox" checked={form.applyGST} onChange={e => setForm(f => ({ ...f, applyGST: e.target.checked }))} className="accent-red-600" />
              Apply GST (18%)
            </label>
            <div className="text-right text-sm space-y-1">
              <p className="text-zinc-500">Subtotal: <span className="font-semibold text-zinc-800">₹{subtotal.toLocaleString('en-IN')}</span></p>
              {form.applyGST && <p className="text-zinc-500">GST (18%): <span className="font-semibold text-zinc-800">₹{tax.toLocaleString('en-IN')}</span></p>}
              <p className="text-base font-bold text-zinc-900">Total: ₹{total.toLocaleString('en-IN')}</p>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Creating…' : 'Create Invoice'}</button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
