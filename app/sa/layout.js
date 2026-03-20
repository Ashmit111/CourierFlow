'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { ToastProvider } from '@/components/ui/Toast'
import NotificationBell from '@/components/shared/NotificationBell'
import RoleSidebar from '@/components/shared/RoleSidebar'
import { LayoutDashboard, Building2, ClipboardList, BarChart3, ShieldAlert } from 'lucide-react'

const NAV = [
  { href: '/dashboard',   label: 'Dashboard',  icon: <LayoutDashboard size={18} /> },
  { href: '/tenants',     label: 'Tenants',    icon: <Building2 size={18} /> },
  { href: '/plans',       label: 'Plans',      icon: <ClipboardList size={18} /> },
  { href: '/audit-logs',  label: 'Audit Logs', icon: <ShieldAlert size={18} /> },
]

function SALayoutInner({ children }) {
  const { user } = useAuth()

  return (
    <div>
      <RoleSidebar 
        title="Courier Flow" 
        subtitle="Super Admin" 
        links={NAV} 
        baseRoute="/sa" 
      />

      {/* Main */}
      <div className="main-content">
        <header className="topbar">
          <h1 style={{ fontSize: '1.25rem', fontFamily: 'var(--font-display)', fontWeight: 700, flex: 1 }}>
            Control Panel
          </h1>
          <NotificationBell />
          <div
            style={{
              width: 34, height: 34,
              borderRadius: '50%',
              background: 'var(--accent-primary)',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              fontSize: '0.875rem',
            }}
          >
            {user?.name?.[0]?.toUpperCase() || 'S'}
          </div>
        </header>
        <main className="page-content">{children}</main>
      </div>
    </div>
  )
}

export default function SALayout({ children }) {
  return (
    <ToastProvider>
      <SALayoutInner>{children}</SALayoutInner>
    </ToastProvider>
  )
}
