import { useState } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

const NAV = [
  { to: '/admin', label: 'Dashboard', icon: '▦', end: true },
  { to: '/admin/orders', label: 'Orders', icon: '📦' },
  { to: '/admin/customers', label: 'Customers', icon: '👥' },
  { to: '/admin/billing', label: 'Billing', icon: '🧾' },
  { to: '/admin/mis', label: 'MIS Reports', icon: '📊' },
  { to: '/admin/team', label: 'Team', icon: '🔑', superAdminOnly: true },
  { to: '/admin/settings', label: 'Settings', icon: '⚙️' },
]

export default function AdminLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const handleLogout = () => { logout(); navigate('/admin/login') }

  const visibleNav = NAV.filter(n => !n.superAdminOnly || user?.role === 'SUPER_ADMIN')

  const Sidebar = () => (
    <aside className="flex h-full flex-col">
      <div className="flex items-center gap-2.5 px-5 py-5 border-b border-zinc-100">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-600">
          <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
        </div>
        <div>
          <span className="text-sm font-bold text-zinc-900">ShipEase</span>
          <p className="text-xs text-zinc-400">Admin Panel</p>
        </div>
      </div>

      <div className="px-4 py-3 border-b border-zinc-100">
        <div className="rounded-lg bg-red-50 p-3">
          <p className="text-sm font-semibold text-red-800 truncate">{user?.name}</p>
          <p className="text-xs text-red-500">{user?.role?.replace('_', ' ')}</p>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {visibleNav.map(({ to, label, icon, end }) => (
          <NavLink key={to} to={to} end={end}
            className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
            onClick={() => setSidebarOpen(false)}>
            <span className="text-sm">{icon}</span>
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="px-3 py-4 border-t border-zinc-100">
        <button onClick={handleLogout}
          className="sidebar-link w-full text-zinc-500 hover:text-red-600 hover:bg-red-50">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Sign out
        </button>
      </div>
    </aside>
  )

  return (
    <div className="flex h-screen bg-zinc-50">
      <div className="hidden lg:flex w-60 shrink-0 flex-col border-r border-zinc-200 bg-white">
        <Sidebar />
      </div>

      {sidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setSidebarOpen(false)} />
          <div className="relative z-50 flex w-64 h-full flex-col bg-white shadow-xl">
            <Sidebar />
          </div>
        </div>
      )}

      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex items-center gap-3 border-b border-zinc-200 bg-white px-4 py-3 lg:hidden">
          <button onClick={() => setSidebarOpen(true)} className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-100">
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" className="h-5 w-5">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <span className="font-bold text-zinc-900">ShipEase Admin</span>
        </header>

        <main className="flex-1 overflow-y-auto p-4 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
