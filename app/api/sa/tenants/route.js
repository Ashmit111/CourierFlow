import connectDB from '@/lib/db'
import Tenant from '@/models/Tenant'
import User from '@/models/User'
import SubscriptionPlan from '@/models/SubscriptionPlan'
import redis from '@/lib/redis'
import bcrypt from 'bcryptjs'
import { createTenantFromSASchema } from '@/lib/validations'
import { dropLegacySlugIndexIfExists, generateUniqueTenantDomain } from '@/lib/tenantDomain'
import { headers } from 'next/headers'
import { writeAuditLog } from '@/lib/auth'

const CACHE_KEY = 'sa:tenants:all'
const CACHE_TTL = 300

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  try {
    const cached = await redis.get(CACHE_KEY)
    if (cached) {
      const payload = typeof cached === 'string' ? JSON.parse(cached) : cached
      return Response.json(payload, {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        },
      })
    }

    await connectDB()
    const tenants = await Tenant.find().populate('subscriptionPlan', 'name price').sort({ createdAt: -1 })

    await redis.setex(CACHE_KEY, CACHE_TTL, JSON.stringify({ tenants }))
    return Response.json(
      { tenants },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        },
      }
    )
  } catch (err) {
    console.error('GET /api/sa/tenants error:', err)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const body = await request.json()
    const parsed = createTenantFromSASchema.safeParse(body)

    if (!parsed.success) {
      return Response.json(
        { error: 'Validation failed', errors: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    await connectDB()
    await dropLegacySlugIndexIfExists()
    const domain = await generateUniqueTenantDomain(parsed.data.name)

    if (parsed.data.email) {
      const existingUser = await User.findOne({ email: parsed.data.email })
      if (existingUser) {
        return Response.json({ error: 'An account with this email already exists' }, { status: 400 })
      }
    }

    if (parsed.data.subscriptionPlan) {
      const plan = await SubscriptionPlan.findById(parsed.data.subscriptionPlan)
      if (!plan) {
        return Response.json({ error: 'Invalid subscription plan' }, { status: 400 })
      }
    }

    const { adminName, email, password } = parsed.data
    const shouldCreateAdmin = !!(adminName && email && password)

    const tenantPayload = {
      name: parsed.data.name,
      domain,
      status: parsed.data.status,
      subscriptionPlan: parsed.data.subscriptionPlan || null,
    }

    const tenant = await Tenant.create(tenantPayload)

    if (shouldCreateAdmin) {
      const hashed = await bcrypt.hash(password, 12)
      await User.create({
        name: adminName,
        email,
        password: hashed,
        role: 'CA',
        tenant_id: tenant._id,
        isActive: true,
      })
    }

    await redis.del(CACHE_KEY)

    const h = await headers()
    await writeAuditLog({
      actor_id: h.get('x-user-id'),
      tenant_id: null,
      action: 'CREATE',
      entity: 'Tenant',
      entity_id: tenant._id,
      metadata: { name: tenant.name, createdAdmin: shouldCreateAdmin },
    })

    return Response.json({ tenant }, { status: 201 })
  } catch (err) {
    console.error('POST /api/sa/tenants error:', err)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
