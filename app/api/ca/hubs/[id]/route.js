import connectDB from '@/lib/db'
import Hub from '@/models/Hub'
import redis from '@/lib/redis'
import { hubSchema } from '@/lib/validations'
import { headers } from 'next/headers'
import { writeAuditLog } from '@/lib/auth'

export async function PUT(request, { params }) {
  try {
    const { id } = await params
    const body = await request.json()
    const parsed = hubSchema.partial().safeParse(body)

    if (!parsed.success) {
      return Response.json({ error: 'Validation failed', errors: parsed.error.flatten().fieldErrors }, { status: 400 })
    }

    const h = await headers()
    const tenantId = h.get('x-tenant-id')

    await connectDB()
    const hub = await Hub.findOneAndUpdate(
      { _id: id, tenant_id: tenantId },
      parsed.data,
      { new: true, runValidators: true }
    )
    if (!hub) return Response.json({ error: 'Hub not found' }, { status: 404 })

    await redis.del(`hubs:${tenantId}`)
    await writeAuditLog({ actor_id: h.get('x-user-id'), tenant_id: tenantId, action: 'UPDATE', entity: 'Hub', entity_id: id, metadata: parsed.data })

    return Response.json({ hub })
  } catch (err) {
    console.error(err)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = await params
    const h = await headers()
    const tenantId = h.get('x-tenant-id')

    await connectDB()
    const hub = await Hub.findOneAndDelete({ _id: id, tenant_id: tenantId })
    if (!hub) return Response.json({ error: 'Hub not found' }, { status: 404 })

    await redis.del(`hubs:${tenantId}`)
    await writeAuditLog({ actor_id: h.get('x-user-id'), tenant_id: tenantId, action: 'DELETE', entity: 'Hub', entity_id: id, metadata: {} })

    return Response.json({ message: 'Hub deleted' })
  } catch (err) {
    console.error(err)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
