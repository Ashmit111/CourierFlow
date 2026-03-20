import { cookies } from 'next/headers'
import { verifyAccess } from './jwt'

/**
 * Extract and verify the current user from the access_token cookie.
 * Returns { userId, role, tenant_id } or throws if unauthorized.
 */
export async function getAuthUser() {
  const cookieStore = await cookies()
  const token = cookieStore.get('access_token')?.value

  if (!token) {
    throw new Error('UNAUTHORIZED')
  }

  try {
    const payload = verifyAccess(token)
    return {
      userId: payload.userId,
      role: payload.role,
      tenant_id: payload.tenant_id || null,
    }
  } catch {
    throw new Error('UNAUTHORIZED')
  }
}

/**
 * Require a specific role. Throws 'FORBIDDEN' if role doesn't match.
 */
export async function requireRole(...roles) {
  const user = await getAuthUser()
  if (!roles.includes(user.role)) {
    throw new Error('FORBIDDEN')
  }
  return user
}

/**
 * Standard error response helpers
 */
export function unauthorized() {
  return Response.json({ error: 'Unauthorized' }, { status: 401 })
}

export function forbidden() {
  return Response.json({ error: 'Forbidden' }, { status: 403 })
}

export function badRequest(message = 'Bad request', errors = null) {
  return Response.json({ error: message, ...(errors && { errors }) }, { status: 400 })
}

export function notFound(message = 'Not found') {
  return Response.json({ error: message }, { status: 404 })
}

export function serverError(message = 'Internal server error') {
  return Response.json({ error: message }, { status: 500 })
}

export async function ensureTenantIsActiveForCreate(tenantId) {
  if (!tenantId) {
    throw new Error('TENANT_CONTEXT_MISSING')
  }

  const { default: Tenant } = await import('../models/Tenant')
  const tenant = await Tenant.findById(tenantId).select('status')

  if (!tenant) {
    throw new Error('TENANT_NOT_FOUND')
  }

  if (tenant.status === 'suspended') {
    throw new Error('TENANT_SUSPENDED')
  }
}

/**
 * Wrap a route handler and automatically handle auth errors
 */
export function withAuth(handler, ...requiredRoles) {
  return async (req, ctx) => {
    try {
      const user = requiredRoles.length > 0
        ? await requireRole(...requiredRoles)
        : await getAuthUser()
      return await handler(req, ctx, user)
    } catch (err) {
      if (err.message === 'UNAUTHORIZED') return unauthorized()
      if (err.message === 'FORBIDDEN') return forbidden()
      console.error(err)
      return serverError()
    }
  }
}

/**
 * Write an audit log entry (fire and forget)
 */
export async function writeAuditLog({ actor_id, tenant_id, action, entity, entity_id, metadata }) {
  try {
    const { default: connectDB } = await import('./db')
    const { default: AuditLog } = await import('../models/AuditLog')
    await connectDB()
    await AuditLog.create({ actor_id, tenant_id, action, entity, entity_id, metadata })
  } catch (err) {
    console.error('Audit log error:', err)
  }
}
