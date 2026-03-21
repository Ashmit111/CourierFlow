import { NextResponse } from 'next/server'
import { verifyAccess, verifyRefresh, signAccess } from './lib/jwt'

// Rate limiting store (in-memory, resets on server restart)
const rateLimitMap = new Map()

function rateLimit(ip, limit, windowMs) {
  const now = Date.now()
  const windowStart = now - windowMs
  const requests = (rateLimitMap.get(ip) || []).filter((t) => t > windowStart)
  requests.push(now)
  rateLimitMap.set(ip, requests)
  return requests.length <= limit
}
//start
function getSessionFromCookies(request) {
  const accessToken = request.cookies.get('access_token')?.value
  const refreshToken = request.cookies.get('refresh_token')?.value

  if (accessToken) {
    try {
      const payload = verifyAccess(accessToken)
      return { payload, refreshedAccessToken: null }
    } catch {
      // Fall through to refresh token path.
    }
  }

  if (!refreshToken) return null

  try {
    const payload = verifyRefresh(refreshToken)
    const refreshedAccessToken = signAccess({
      userId: payload.userId,
      role: payload.role,
      tenant_id: payload.tenant_id,
    })
    return { payload, refreshedAccessToken }
  } catch {
    return null
  }
}
// end
export async function proxy(request) {
  const { pathname } = request.nextUrl
  const ip = request.headers.get('x-forwarded-for') || 'anonymous'

  // Rate limiting
  const limit = 500
  const windowMs = 15 * 60 * 1000 // 15 minutes

  if (!rateLimit(ip, limit, windowMs)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  // Auth check for protected API routes
  const isProtectedApi =
    pathname.startsWith('/api/sa/') ||
    pathname.startsWith('/api/ca/') ||
    pathname.startsWith('/api/ag/') ||
    pathname.startsWith('/api/notifications') ||
    pathname.startsWith('/api/upload')

  if (isProtectedApi) {
    const session = getSessionFromCookies(request)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { payload, refreshedAccessToken } = session
    const { role, userId, tenant_id } = payload

    // RBAC enforcement
    if (pathname.startsWith('/api/sa/') && role !== 'SA') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    if (pathname.startsWith('/api/ca/') && role !== 'CA') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    if (pathname.startsWith('/api/ag/') && role !== 'AG') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Inject user context into request headers for API route handlers
    const headers = new Headers(request.headers)
    headers.set('x-user-id', userId)
    headers.set('x-role', role)
    if (tenant_id) headers.set('x-tenant-id', tenant_id)

    const response = NextResponse.next({ request: { headers } })
    if (refreshedAccessToken) {
      response.cookies.set('access_token', refreshedAccessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 15 * 60,
        path: '/',
      })
    }
    return response
  }

  // Auth redirect for protected pages
  const isProtectedPage =
    pathname.startsWith('/sa') ||
    pathname.startsWith('/ca') ||
    pathname.startsWith('/ag')

  if (isProtectedPage) {
    const session = getSessionFromCookies(request)
    if (!session) {
      return NextResponse.redirect(new URL('/login', request.url))
    }

    const { payload, refreshedAccessToken } = session
    const { role } = payload

    // Redirect to correct dashboard if wrong role visits wrong section
    if (pathname.startsWith('/sa') && role !== 'SA') {
      return NextResponse.redirect(new URL('/login', request.url))
    }
    if (pathname.startsWith('/ca') && role !== 'CA') {
      return NextResponse.redirect(new URL('/login', request.url))
    }
    if (pathname.startsWith('/ag') && role !== 'AG') {
      return NextResponse.redirect(new URL('/login', request.url))
    }

    const response = NextResponse.next()
    if (refreshedAccessToken) {
      response.cookies.set('access_token', refreshedAccessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 15 * 60,
        path: '/',
      })
    }
    return response
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/sa/:path*',
    '/ca/:path*',
    '/ag/:path*',
    '/api/sa/:path*',
    '/api/ca/:path*',
    '/api/ag/:path*',
    '/api/notifications/:path*',
    '/api/upload/:path*',
    '/api/auth/:path*',
    '/api/track/:path*',
  ],
}
