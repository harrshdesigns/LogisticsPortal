import { useEffect, useState } from 'react'
import api from '../../services/api'
import { PageLoader } from '../../components/shared/LoadingSpinner'
import Modal from '../../components/shared/Modal'
import EmptyState from '../../components/shared/EmptyState'
import { MapPinIcon } from '../../components/shared/Icons'

const STATES = ['Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh','Goa','Gujarat','Haryana','Himachal Pradesh','Jharkhand','Karnataka','Kerala','Madhya Pradesh','Maharashtra','Manipur','Meghalaya','Mizoram','Nagaland','Odisha','Punjab','Rajasthan','Sikkim','Tamil Nadu','Telangana','Tripura','Uttar Pradesh','Uttarakhand','West Bengal','Delhi','Chandigarh','Jammu & Kashmir','Ladakh','Puducherry']

const COUNTRY_CODES = ['+91','+1','+44','+61','+971','+65','+60','+66','+49','+33']

const emptyForm = { label: '', contactName: '', countryCode: '+91', phone: '', email: '', addressLine1: '', addressLine2: '', city: '', state: '', pincode: '', isDefault: false }

export default function AddressBook() {
  const [addresses, setAddresses] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const fetch = () => {
    api.get('/addresses').then(({ data }) => setAddresses(data.data.addresses))
      .catch(() => {}).finally(() => setLoading(false))
  }
  useEffect(() => { fetch() }, [])

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }))

  const handleSave = async (e) => {
    e.preventDefault(); setError(''); setSaving(true)
    try {
      await api.post('/addresses', form)
      setModalOpen(false); setForm(emptyForm); fetch()
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <PageLoader />

  return (
    <div className="max-w-3xl space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-zinc-900">Address Book</h1>
        <button onClick={() => { setForm(emptyForm); setModalOpen(true) }} className="btn-primary">+ Add Address</button>
      </div>

      {addresses.length === 0 ? (
        <div className="card">
          <EmptyState icon={<MapPinIcon className="h-12 w-12" />} title="No saved addresses" description="Save your frequently used pickup and delivery addresses." action={
            <button onClick={() => setModalOpen(true)} className="btn-primary">Add Address</button>
          } />
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {addresses.map(addr => (
            <div key={addr.id} className="card p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-zinc-900">{addr.label}</p>
                  {addr.isDefault && <span className="badge bg-green-100 text-green-700 mt-1">Default</span>}
                </div>
              </div>
              <div className="mt-3 text-sm text-zinc-600 space-y-0.5">
                <p className="font-medium text-zinc-800">{addr.contactName}</p>
                <p>{addr.phone}</p>
                <p>{addr.addressLine1}</p>
                {addr.addressLine2 && <p>{addr.addressLine2}</p>}
                <p>{addr.city}, {addr.state} – {addr.pincode}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Add New Address">
        <form onSubmit={handleSave} className="space-y-4">
          {error && <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>}
          <div>
            <label className="label">Label *</label>
            <input className="input" placeholder="e.g. Main Office, Warehouse" value={form.label} onChange={set('label')} required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Contact Name *</label>
              <input className="input" value={form.contactName} onChange={set('contactName')} required />
            </div>
            <div>
              <label className="label">Phone *</label>
              <div className="flex gap-1.5">
                <select className="input w-20 shrink-0" value={form.countryCode} onChange={set('countryCode')}>
                  {COUNTRY_CODES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <input className="input flex-1" value={form.phone} onChange={set('phone')} required placeholder="Phone number" />
              </div>
            </div>
            <div className="col-span-2">
              <label className="label">Email</label>
              <input className="input" type="email" value={form.email} onChange={set('email')} placeholder="email@example.com" />
            </div>
          </div>
          <div>
            <label className="label">Address Line 1 *</label>
            <input className="input" value={form.addressLine1} onChange={set('addressLine1')} required />
          </div>
          <div>
            <label className="label">Address Line 2</label>
            <input className="input" value={form.addressLine2} onChange={set('addressLine2')} />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="label">City *</label>
              <input className="input" value={form.city} onChange={set('city')} required />
            </div>
            <div>
              <label className="label">Pincode *</label>
              <input className="input" value={form.pincode} onChange={set('pincode')} required maxLength={6} />
            </div>
            <div>
              <label className="label">State *</label>
              <select className="input" value={form.state} onChange={set('state')} required>
                <option value="">Select</option>
                {STATES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm text-zinc-700 cursor-pointer">
            <input type="checkbox" checked={form.isDefault} onChange={set('isDefault')} className="accent-red-600" />
            Set as default address
          </label>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save Address'}</button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
