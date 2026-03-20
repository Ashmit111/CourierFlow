'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'

let cachedUser = null

export function useAuth() {
  const [user, setUser] = useState(cachedUser)
  const [loading, setLoading] = useState(!cachedUser)
  const router = useRouter()

  const fetchUser = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me')
      if (!res.ok) {
        cachedUser = null
        setUser(null)
        return null
      }
      const data = await res.json()
      cachedUser = data.user
      setUser(data.user)
      return data.user
    } catch {
      cachedUser = null
      setUser(null)
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!cachedUser) fetchUser()
  }, [fetchUser])

  const logout = useCallback(async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    cachedUser = null
    setUser(null)
    router.push('/login')
  }, [router])

  return { user, loading, logout, refetch: fetchUser }
}
