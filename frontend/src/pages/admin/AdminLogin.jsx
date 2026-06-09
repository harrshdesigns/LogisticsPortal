import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

export default function AdminLogin() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault(); setError(''); setLoading(true)
    try {
      const user = await login(form.email, form.password)
      if (!['ADMIN', 'SUPER_ADMIN'].includes(user.role)) {
        setError('This login is for admin users only')
        return
      }
      navigate('/admin')
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-zinc-900 flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-red-600">
            <svg className="h-7 w-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-white">ShipEase Admin</h1>
          <p className="text-sm text-zinc-400 mt-1">Operations & Management Portal</p>
        </div>

        <div className="rounded-xl bg-zinc-800 border border-zinc-700 p-6 shadow-xl">
          <h2 className="text-base font-semibold text-white mb-5">Admin Login</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-lg bg-red-900/40 border border-red-700 px-4 py-3 text-sm text-red-300">{error}</div>
            )}
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1">Email</label>
              <input className="w-full rounded-lg border border-zinc-600 bg-zinc-700 px-3.5 py-2.5 text-sm text-white placeholder-zinc-400 outline-none focus:border-red-500 focus:ring-2 focus:ring-red-900"
                type="email" placeholder="admin@shipease.in" value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1">Password</label>
              <input className="w-full rounded-lg border border-zinc-600 bg-zinc-700 px-3.5 py-2.5 text-sm text-white placeholder-zinc-400 outline-none focus:border-red-500 focus:ring-2 focus:ring-red-900"
                type="password" placeholder="••••••••" value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))} required />
            </div>
            <button type="submit" disabled={loading}
              className="w-full rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-50">
              {loading ? 'Signing in…' : 'Sign in to Admin'}
            </button>
          </form>
        </div>

        <p className="mt-4 text-center text-sm text-zinc-500">
          Customer portal? <Link to="/login" className="text-zinc-400 hover:text-white underline">Customer login</Link>
        </p>
      </div>
    </div>
  )
}
