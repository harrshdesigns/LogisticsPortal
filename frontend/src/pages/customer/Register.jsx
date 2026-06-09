import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

export default function Register() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: '', email: '', password: '', company: '', gstin: '', phone: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(''); setLoading(true)
    try {
      await register(form)
      navigate('/')
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-zinc-50 flex">
      <div className="hidden lg:flex lg:w-1/2 flex-col items-center justify-center bg-red-600 p-12">
        <div className="max-w-sm text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20">
            <svg className="h-9 w-9 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-white">ShipEase</h1>
          <p className="mt-3 text-lg text-red-100">Start shipping smarter today</p>
          <p className="mt-6 text-sm text-red-200">Join thousands of businesses that trust ShipEase for their logistics needs.</p>
        </div>
      </div>

      <div className="flex flex-1 items-center justify-center p-6">
        <div className="w-full max-w-md">
          <h2 className="text-2xl font-bold text-zinc-900">Create account</h2>
          <p className="mt-1 text-sm text-zinc-500">Get started with ShipEase</p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            {error && (
              <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="label">Full name *</label>
                <input className="input" placeholder="Rajan Mehta" value={form.name} onChange={set('name')} required />
              </div>
              <div className="col-span-2">
                <label className="label">Email address *</label>
                <input className="input" type="email" placeholder="rajan@company.com" value={form.email} onChange={set('email')} required />
              </div>
              <div className="col-span-2">
                <label className="label">Password *</label>
                <input className="input" type="password" placeholder="••••••••" value={form.password} onChange={set('password')} required minLength={8} />
              </div>
              <div>
                <label className="label">Company name</label>
                <input className="input" placeholder="Mehta Textiles" value={form.company} onChange={set('company')} />
              </div>
              <div>
                <label className="label">Phone</label>
                <input className="input" placeholder="9876543210" value={form.phone} onChange={set('phone')} maxLength={10} />
              </div>
              <div className="col-span-2">
                <label className="label">GSTIN</label>
                <input className="input" placeholder="27AABCM1234F1Z5" value={form.gstin} onChange={set('gstin')} />
              </div>
            </div>

            <button type="submit" className="btn-primary w-full" disabled={loading}>
              {loading ? 'Creating account…' : 'Create account'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-zinc-500">
            Already have an account?{' '}
            <Link to="/login" className="font-semibold text-red-600 hover:text-red-700">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
