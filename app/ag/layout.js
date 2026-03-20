'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { ToastProvider } from '@/components/ui/Toast'

const NAV = [
  { href: '/ag/dashboard', label: 'Home',      icon: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
  )},
  { href: '/ag/shipments', label: 'Shipments', icon: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
  )},
]

function AGLayoutInner({ children }) {
  const pathname = usePathname()
  const { user, logout } = useAuth()

  return (
    <ToastProvider>
      <div style={{ paddingBottom: 64, minHeight: '100vh', background: 'var(--bg)' }}>
        {/* Mobile top header */}
        <header
          style={{
            height: 56,
            background: 'var(--surface)',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            padding: '0 1rem',
            gap: '0.75rem',
            position: 'sticky',
            top: 0,
            zIndex: 30,
          }}
        >
          <span style={{ fontSize: '1.25rem', color: 'var(--accent-primary)', fontWeight: 800 }}>CF</span>
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.1rem', flex: 1 }}>Courier Flow</span>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{user?.name}</span>
          <button onClick={logout} className="btn btn-ghost btn-sm" style={{ fontSize: '0.8rem' }}>
            ⎋
          </button>
        </header>

        <main style={{ padding: '1rem' }}>{children}</main>

        {/* Bottom navigation */}
        <nav className="bottom-nav">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`bottom-nav-item ${pathname === item.href || pathname.startsWith(item.href + '/') ? 'active' : ''}`}
            >
              {item.icon}
              <span>{item.label}</span>
            </Link>
          ))}
          <button onClick={logout} className="bottom-nav-item" style={{ border: 'none', background: 'transparent', cursor: 'pointer' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{ width: 22, height: 22 }}>
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            <span>Logout</span>
          </button>
        </nav>
      </div>
    </ToastProvider>
  )
}

export default function AGLayout({ children }) {
  return (
    <ToastProvider>
      <AGLayoutInner>{children}</AGLayoutInner>
    </ToastProvider>
  )
}
