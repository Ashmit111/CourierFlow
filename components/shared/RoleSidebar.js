import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { LogOut } from 'lucide-react'

export default function RoleSidebar({ title, subtitle, links, baseRoute }) {
  const pathname = usePathname()
  const { logout } = useAuth()

  return (
    <div className="sidebar">
      <div className="sidebar-logo">
        <div style={{ width: 32, height: 32, background: 'var(--accent-primary)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: '1rem', flexShrink: 0 }}>
          CF
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontFamily: 'var(--font-display)', lineHeight: 1.2 }}>{title}</span>
          {subtitle && <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{subtitle}</span>}
        </div>
      </div>
      <div className="sidebar-section" style={{ flex: 1 }}>
        <div className="sidebar-section-label">Menu</div>
        {links.map((link) => {
          const isActive = pathname === `${baseRoute}${link.href}` || (link.href !== '' && pathname.startsWith(`${baseRoute}${link.href}`))
          return (
            <Link key={link.href} href={`${baseRoute}${link.href}`} className={`nav-item ${isActive ? 'active' : ''}`}>
              <span className="nav-icon">{link.icon}</span>
              {link.label}
            </Link>
          )
        })}
      </div>
      <div style={{ padding: '1.5rem', borderTop: '1px solid var(--border)' }}>
        <button className="btn btn-outline w-full" style={{ justifyContent: 'center', gap: '8px' }} onClick={logout}>
          <LogOut size={16} /> Log Out
        </button>
      </div>
    </div>
  )
}
