import connectDB from '@/lib/db'
import Tenant from '@/models/Tenant'
import redis from '@/lib/redis'
import { headers } from 'next/headers'
import { writeAuditLog } from '@/lib/auth'

export async function PATCH(request, { params }) {
  try {
    const { id } = await params
    const body = await request.json()
    const { status } = body

    if (!['active', 'suspended'].includes(status)) {
      return Response.json({ error: 'Status must be "active" or "suspended"' }, { status: 400 })
    }

    await connectDB()
    const tenant = await Tenant.findByIdAndUpdate(id, { status }, { new: true })
    if (!tenant) return Response.json({ error: 'Tenant not found' }, { status: 404 })

    await redis.del('sa:tenants:all')

    const h = await headers()
    await writeAuditLog({
      actor_id: h.get('x-user-id'),
      tenant_id: id,
      action: 'UPDATE',
      entity: 'Tenant',
      entity_id: id,
      metadata: { status },
    })

    return Response.json({ tenant, message: `Tenant ${status}` })
  } catch (err) {
    console.error(err)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
