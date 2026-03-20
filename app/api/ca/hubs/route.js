import connectDB from '@/lib/db'
import Hub from '@/models/Hub'
import redis from '@/lib/redis'
import { hubSchema } from '@/lib/validations'
import { headers } from 'next/headers'
import { ensureTenantIsActiveForCreate, writeAuditLog } from '@/lib/auth'

async function dropHubUniqueIndexesIfPresent() {
  try {
    const indexes = await Hub.collection.indexes()
    const uniqueIndexes = indexes.filter((idx) => idx.unique && idx.name !== '_id_')

    for (const idx of uniqueIndexes) {
      await Hub.collection.dropIndex(idx.name)
      console.warn(`Dropped unique Mongo index ${idx.name} from hubs collection`)
    }
  } catch (err) {
    console.warn('Unable to verify/drop unique hub indexes:', err?.message || err)
  }
}

export async function GET() {
  try {
    const h = await headers()
    const tenantId = h.get('x-tenant-id')
    const cacheKey = `hubs:${tenantId}`

    const cached = await redis.get(cacheKey)
    if (cached) return Response.json(cached)

    await connectDB()
    const hubs = await Hub.find({ tenant_id: tenantId }).sort({ createdAt: -1 })
    await redis.setex(cacheKey, 300, JSON.stringify({ hubs }))
    return Response.json({ hubs })
  } catch (err) {
    console.error(err)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const body = await request.json()
    const parsed = hubSchema.safeParse(body)

    if (!parsed.success) {
      return Response.json({ error: 'Validation failed', errors: parsed.error.flatten().fieldErrors }, { status: 400 })
    }

    const h = await headers()
    const tenantId = h.get('x-tenant-id')

    await connectDB()
    await ensureTenantIsActiveForCreate(tenantId)
    await dropHubUniqueIndexesIfPresent()
    const hub = await Hub.create({ ...parsed.data, tenant_id: tenantId })
    await redis.del(`hubs:${tenantId}`)

    await writeAuditLog({ actor_id: h.get('x-user-id'), tenant_id: tenantId, action: 'CREATE', entity: 'Hub', entity_id: hub._id, metadata: { name: hub.name } })

    return Response.json({ hub }, { status: 201 })
  } catch (err) {
    if (err.message === 'TENANT_SUSPENDED') {
      return Response.json({ error: 'Tenant is suspended. Creation operations are disabled.' }, { status: 403 })
    }
    if (err.message === 'TENANT_NOT_FOUND' || err.message === 'TENANT_CONTEXT_MISSING') {
      return Response.json({ error: 'Invalid tenant context' }, { status: 400 })
    }
    if (err?.code === 11000) {
      return Response.json({ error: 'Database still has a conflicting unique index for hubs' }, { status: 400 })
    }
    console.error(err)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
