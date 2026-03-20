import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function BottomTabBar({ items, onLogout }) {
  const pathname = usePathname()

  return (
    <nav className="bottom-nav">
      {items.map((item) => {
        const isActive = pathname === item.href || (item.href !== '' && pathname.startsWith(item.href + '/'))
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`bottom-nav-item ${isActive ? 'active' : ''}`}
          >
            {item.icon}
            <span>{item.label}</span>
          </Link>
        )
      })}
      {onLogout && (
        <button onClick={onLogout} className="bottom-nav-item" style={{ border: 'none', background: 'transparent', cursor: 'pointer' }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{ width: 22, height: 22 }}>
            <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
          <span>Logout</span>
        </button>
      )}
    </nav>
  )
}
