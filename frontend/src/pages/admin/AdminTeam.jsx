import { useEffect, useState } from 'react'
import api from '../../services/api'
import { PageLoader } from '../../components/shared/LoadingSpinner'
import Modal from '../../components/shared/Modal'
import { useAuth } from '../../context/AuthContext'

const ALL_PERMISSIONS = [
  'VIEW_ORDERS', 'ASSIGN_ORDERS', 'MANAGE_BILLING', 'VIEW_CUSTOMERS', 'MANAGE_TEAM', 'VIEW_MIS'
]

export default function AdminTeam() {
  const { user } = useAuth()
  const [admins, setAdmins] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editModal, setEditModal] = useState(null)
  const [form, setForm] = useState({ name: '', email: '', password: '', permissions: [] })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  if (user?.role !== 'SUPER_ADMIN') {
    return <div className="card p-8 text-center text-zinc-500">This page is for Super Admins only.</div>
  }

  const fetch = () => {
    setLoading(true)
    api.get('/admin/admins').then(({ data }) => setAdmins(data.data.admins))
      .catch(() => {}).finally(() => setLoading(false))
  }
  useEffect(() => { fetch() }, [])

  const togglePerm = (p, perms, setPerms) => {
    if (perms.includes(p)) setPerms(perms.filter(x => x !== p))
    else setPerms([...perms, p])
  }

  const handleCreate = async (e) => {
    e.preventDefault(); setError(''); setSaving(true)
    try {
      await api.post('/admin/admins', form)
      setModalOpen(false); setForm({ name: '', email: '', password: '', permissions: [] }); fetch()
    } catch (err) {
      setError(err.response?.data?.message || 'Failed')
    } finally {
      setSaving(false)
    }
  }

  const handleEditSave = async (id, permissions, isActive) => {
    try {
      await api.put(`/admin/admins/${id}`, { permissions, isActive })
      setEditModal(null); fetch()
    } catch (err) {
      alert(err.response?.data?.message || 'Failed')
    }
  }

  return (
    <div className="space-y-4 max-w-4xl">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-zinc-900">Admin Team</h1>
        <button onClick={() => { setModalOpen(true); setError('') }} className="btn-primary">+ Add Admin</button>
      </div>

      <div className="card overflow-hidden">
        {loading ? <PageLoader /> : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-100 bg-zinc-50">
                {['Name','Email','Role','Permissions','Status','Actions'].map(h => (
                  <th key={h} className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {admins.map(admin => (
                <tr key={admin.id} className="border-b border-zinc-50 hover:bg-zinc-50">
                  <td className="px-5 py-3 font-semibold text-zinc-900">{admin.name}</td>
                  <td className="px-5 py-3 text-zinc-600 text-xs">{admin.email}</td>
                  <td className="px-5 py-3">
                    <span className={`badge ${admin.role === 'SUPER_ADMIN' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                      {admin.role.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-5 py-3 max-w-xs">
                    <div className="flex flex-wrap gap-1">
                      {(admin.adminRole?.permissions || []).map(p => (
                        <span key={p} className="badge bg-zinc-100 text-zinc-600 text-[10px]">{p.replace('_', ' ')}</span>
                      ))}
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    <span className={`badge ${admin.isActive ? 'bg-green-100 text-green-700' : 'bg-zinc-100 text-zinc-500'}`}>
                      {admin.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    {admin.role !== 'SUPER_ADMIN' && (
                      <button onClick={() => setEditModal(admin)} className="text-xs font-medium text-red-600 hover:text-red-700">Edit</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Create Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Add Admin User">
        <form onSubmit={handleCreate} className="space-y-4">
          {error && <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>}
          <div>
            <label className="label">Full Name *</label>
            <input className="input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
          </div>
          <div>
            <label className="label">Email *</label>
            <input className="input" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required />
          </div>
          <div>
            <label className="label">Password *</label>
            <input className="input" type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} required minLength={8} />
          </div>
          <div>
            <label className="label">Permissions</label>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {ALL_PERMISSIONS.map(p => (
                <label key={p} className="flex items-center gap-2 text-sm text-zinc-700 cursor-pointer">
                  <input type="checkbox" className="accent-red-600"
                    checked={form.permissions.includes(p)}
                    onChange={() => setForm(f => ({ ...f, permissions: togglePerm(p, f.permissions, () => {}) || (f.permissions.includes(p) ? f.permissions.filter(x => x !== p) : [...f.permissions, p]) }))} />
                  {p.replace(/_/g, ' ')}
                </label>
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Creating…' : 'Create Admin'}</button>
          </div>
        </form>
      </Modal>

      {/* Edit Modal */}
      {editModal && (
        <EditAdminModal admin={editModal} onClose={() => setEditModal(null)} onSave={handleEditSave} />
      )}
    </div>
  )
}

function EditAdminModal({ admin, onClose, onSave }) {
  const [perms, setPerms] = useState(admin.adminRole?.permissions || [])
  const [isActive, setIsActive] = useState(admin.isActive)
  const toggle = (p) => setPerms(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p])

  return (
    <Modal open onClose={onClose} title={`Edit ${admin.name}`}>
      <div className="space-y-4">
        <div>
          <label className="label">Permissions</label>
          <div className="grid grid-cols-2 gap-2 mt-2">
            {ALL_PERMISSIONS.map(p => (
              <label key={p} className="flex items-center gap-2 text-sm text-zinc-700 cursor-pointer">
                <input type="checkbox" className="accent-red-600" checked={perms.includes(p)} onChange={() => toggle(p)} />
                {p.replace(/_/g, ' ')}
              </label>
            ))}
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm text-zinc-700 cursor-pointer">
          <input type="checkbox" className="accent-red-600" checked={isActive} onChange={e => setIsActive(e.target.checked)} />
          Account is active
        </label>
        <div className="flex justify-end gap-3 pt-2">
          <button onClick={onClose} className="btn-secondary">Cancel</button>
          <button onClick={() => onSave(admin.id, perms, isActive)} className="btn-primary">Save Changes</button>
        </div>
      </div>
    </Modal>
  )
}
