import connectDB from '@/lib/db'
import User from '@/models/User'
import Agent from '@/models/Agent'
import redis from '@/lib/redis'
import { createAgentSchema } from '@/lib/validations'
import { headers } from 'next/headers'
import { ensureTenantIsActiveForCreate, writeAuditLog } from '@/lib/auth'
import bcrypt from 'bcryptjs'

export async function GET() {
  try {
    const h = await headers()
    const tenantId = h.get('x-tenant-id')
    const cacheKey = `agents:${tenantId}`

    const cached = await redis.get(cacheKey)
    if (cached) return Response.json(cached)

    await connectDB()
    const agents = await Agent.find({ tenant_id: tenantId })
      .populate('user_id', 'name email isActive')
      .sort({ createdAt: -1 })

    await redis.setex(cacheKey, 120, JSON.stringify({ agents }))
    return Response.json({ agents })
  } catch (err) {
    console.error(err)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const body = await request.json()
    const parsed = createAgentSchema.safeParse(body)

    if (!parsed.success) {
      return Response.json({ error: 'Validation failed', errors: parsed.error.flatten().fieldErrors }, { status: 400 })
    }

    const { name, email, password, isAvailable } = parsed.data
    const h = await headers()
    const tenantId = h.get('x-tenant-id')

    await connectDB()
    await ensureTenantIsActiveForCreate(tenantId)

    const existingUser = await User.findOne({ email })
    if (existingUser) {
      return Response.json({ error: 'An account with this email already exists' }, { status: 400 })
    }

    const hashed = await bcrypt.hash(password, 12)
    const user = await User.create({ name, email, password: hashed, role: 'AG', tenant_id: tenantId })
    const agent = await Agent.create({ user_id: user._id, tenant_id: tenantId, isAvailable })

    await redis.del(`agents:${tenantId}`)
    await writeAuditLog({ actor_id: h.get('x-user-id'), tenant_id: tenantId, action: 'CREATE', entity: 'Agent', entity_id: agent._id, metadata: { name, email } })

    return Response.json({ agent, user: { id: user._id, name, email } }, { status: 201 })
  } catch (err) {
    if (err.message === 'TENANT_SUSPENDED') {
      return Response.json({ error: 'Tenant is suspended. Creation operations are disabled.' }, { status: 403 })
    }
    if (err.message === 'TENANT_NOT_FOUND' || err.message === 'TENANT_CONTEXT_MISSING') {
      return Response.json({ error: 'Invalid tenant context' }, { status: 400 })
    }
    console.error(err)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
