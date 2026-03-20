'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { ToastProvider } from '@/components/ui/Toast'
import RoleSidebar from '@/components/shared/RoleSidebar'
import { LayoutDashboard, Package, MapPin, Users } from 'lucide-react'

const NAV = [
  { href: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard size={18} /> },
  { href: '/shipments', label: 'Shipments', icon: <Package size={18} /> },
  { href: '/hubs',      label: 'Hubs',      icon: <MapPin size={18} /> },
  { href: '/agents',    label: 'Agents',    icon: <Users size={18} /> },
]

function CALayoutInner({ children }) {
  const pathname = usePathname()
  const { user } = useAuth()
  const tenant = user?.tenant_id

  return (
    <div>
      <RoleSidebar 
        title={tenant?.name || 'Company Admin'}
        subtitle={tenant?.domain ? `${tenant.domain} Space` : 'Workspace'}
        links={NAV}
        baseRoute="/ca"
      />

      <div className="main-content">
        <header className="topbar">
          <h1 style={{ fontSize: '1.25rem', fontFamily: 'var(--font-display)', fontWeight: 700, flex: 1 }}>
            {NAV.find((n) => pathname.startsWith(`/ca${n.href}`))?.label || 'Dashboard'}
          </h1>
          <div
            style={{
              width: 34, height: 34,
              borderRadius: '50%',
              background: 'rgba(16,185,129,0.15)',
              color: 'var(--accent)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              fontSize: '0.875rem',
            }}
          >
            {user?.name?.[0]?.toUpperCase() || 'C'}
          </div>
        </header>
        <main className="page-content">{children}</main>
      </div>
    </div>
  )
}

export default function CALayout({ children }) {
  return (
    <ToastProvider>
      <CALayoutInner>{children}</CALayoutInner>
    </ToastProvider>
  )
}
