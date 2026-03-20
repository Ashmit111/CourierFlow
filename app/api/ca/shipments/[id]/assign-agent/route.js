import connectDB from '@/lib/db'
import Shipment from '@/models/Shipment'
import Agent from '@/models/Agent'
import Hub from '@/models/Hub'
import redis from '@/lib/redis'
import { assignAgentSchema } from '@/lib/validations'
import { headers } from 'next/headers'

export async function POST(request, { params }) {
  try {
    const { id } = await params
    const body = await request.json()
    const parsed = assignAgentSchema.safeParse(body)

    if (!parsed.success) {
      return Response.json({ error: 'Validation failed', errors: parsed.error.flatten().fieldErrors }, { status: 400 })
    }

    const h = await headers()
    const tenantId = h.get('x-tenant-id')

    await connectDB()

    const shipment = await Shipment.findOne({ _id: id, tenant_id: tenantId })
    if (!shipment) return Response.json({ error: 'Shipment not found' }, { status: 404 })

    // CRITICAL: Hub must be assigned first
    if (!shipment.assignedHub) {
      return Response.json(
        { error: 'A hub must be assigned to this shipment before assigning an agent' },
        { status: 400 }
      )
    }

    const assignedHub = await Hub.findOne({ _id: shipment.assignedHub, tenant_id: tenantId })
    if (!assignedHub || !assignedHub.isActive) {
      return Response.json({ error: 'Assigned hub is inactive. Please assign an active hub first.' }, { status: 400 })
    }

    const agent = await Agent.findOne({ _id: parsed.data.agentId, tenant_id: tenantId })
      .populate('user_id', 'isActive')
    if (!agent) return Response.json({ error: 'Agent not found or does not belong to your tenant' }, { status: 404 })
    if (!agent.isAvailable) {
      return Response.json({ error: 'Selected agent is currently busy/unavailable' }, { status: 400 })
    }
    if (!agent.user_id?.isActive) {
      return Response.json({ error: 'Selected agent account is deactivated' }, { status: 400 })
    }

    shipment.assignedAgent = agent._id
    await shipment.save()

    for (let p = 1; p <= 5; p++) await redis.del(`shipments:${tenantId}:page:${p}`)
    await redis.del(`track:${shipment.trackingId}`)

    return Response.json({ shipment: await shipment.populate([
      { path: 'assignedHub', select: 'name city' },
      { path: 'assignedAgent', populate: { path: 'user_id', select: 'name email' } },
    ]), message: 'Agent assigned successfully' })
  } catch (err) {
    console.error(err)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
