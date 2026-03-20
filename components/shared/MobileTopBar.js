import { useAuth } from '@/hooks/useAuth'

export default function MobileTopBar({ title = 'Courier Flow' }) {
  const { user, logout } = useAuth()

  return (
    <header
      style={{
        height: 60,
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
      <div style={{ width: 28, height: 28, background: 'var(--accent-primary)', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: '0.8rem', flexShrink: 0 }}>
        CF
      </div>
      <span style={{ fontWeight: 700, fontSize: '1.1rem', fontFamily: 'var(--font-display)', flex: 1 }}>{title}</span>
      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{user?.name}</span>
      <button onClick={logout} className="btn btn-ghost btn-sm btn-icon" style={{ fontSize: '1.2rem', color: 'var(--text-muted)' }}>
        ⎋
      </button>
    </header>
  )
}
