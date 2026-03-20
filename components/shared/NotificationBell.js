'use client'

import { useState, useEffect, useRef } from 'react'
import { Bell } from 'lucide-react'

export default function NotificationBell() {
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [unread, setUnread] = useState(0)
  const ref = useRef(null)

  useEffect(() => {
    fetchNotifications()
    const interval = setInterval(fetchNotifications, 60000)
    return () => clearInterval(interval)
  }, [])

  async function fetchNotifications() {
    try {
      const res = await fetch('/api/notifications')
      if (!res.ok) return
      const data = await res.json()
      setNotifications(data.notifications || [])
      setUnread((data.notifications || []).filter((n) => !n.isRead).length)
    } catch {}
  }

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function handleOpen() {
    setOpen(!open)
    if (!open) {
      setUnread(0)
    }
  }

  function timeAgo(date) {
    const diff = Date.now() - new Date(date).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return 'just now'
    if (mins < 60) return `${mins}m ago`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h ago`
    return `${Math.floor(hrs / 24)}d ago`
  }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        id="notification-bell-btn"
        onClick={handleOpen}
        className="btn btn-ghost btn-icon"
        style={{ position: 'relative', fontSize: '1.1rem' }}
        aria-label="Notifications"
      >
        <Bell size={20} />
        {unread > 0 && (
          <span
            style={{
              position: 'absolute',
              top: 2, right: 2,
              background: 'var(--danger)',
              color: '#fff',
              borderRadius: '999px',
              width: 16, height: 16,
              fontSize: 10,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
            }}
          >
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          style={{
            position: 'absolute',
            top: '110%',
            right: 0,
            width: 340,
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 12,
            boxShadow: '0 12px 40px rgba(0,0,0,0.4)',
            zIndex: 50,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              padding: '0.875rem 1rem',
              borderBottom: '1px solid var(--border)',
              fontWeight: 600,
              fontSize: '0.875rem',
            }}
          >
            Notifications
          </div>

          {notifications.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
              No notifications
            </div>
          ) : (
            <div style={{ maxHeight: 360, overflowY: 'auto' }}>
              {notifications.map((n) => (
                <div
                  key={n._id}
                  style={{
                    padding: '0.875rem 1rem',
                    borderBottom: '1px solid var(--border)',
                    background: n.isRead ? 'transparent' : 'var(--primary-light)',
                    fontSize: '0.8rem',
                  }}
                >
                  <div style={{ fontWeight: 500, marginBottom: 2 }}>{n.event}</div>
                  <div style={{ color: 'var(--text-muted)' }}>{n.message}</div>
                  <div style={{ color: 'var(--text-dim)', marginTop: 4 }}>{timeAgo(n.createdAt)}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
