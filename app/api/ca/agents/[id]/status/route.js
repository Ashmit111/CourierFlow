import connectDB from '@/lib/db'
import Agent from '@/models/Agent'
import redis from '@/lib/redis'
import { headers } from 'next/headers'

export async function PATCH(request, { params }) {
  try {
    const { id } = await params
    const { isAvailable } = await request.json()
    const h = await headers()
    const tenantId = h.get('x-tenant-id')

    if (typeof isAvailable !== 'boolean') {
      return Response.json({ error: 'isAvailable (boolean) is required' }, { status: 400 })
    }

    await connectDB()
    const agent = await Agent.findOneAndUpdate(
      { _id: id, tenant_id: tenantId },
      { isAvailable },
      { new: true }
    )
    if (!agent) return Response.json({ error: 'Agent not found' }, { status: 404 })

    await redis.del(`agents:${tenantId}`)
    return Response.json({ agent })
  } catch (err) {
    console.error(err)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
