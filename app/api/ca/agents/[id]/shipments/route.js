import connectDB from '@/lib/db'
import Agent from '@/models/Agent'
import Shipment from '@/models/Shipment'
import { headers } from 'next/headers'

export async function GET(request, { params }) {
  try {
    const { id } = await params
    const h = await headers()
    const tenantId = h.get('x-tenant-id')

    await connectDB()

    const agent = await Agent.findOne({ _id: id, tenant_id: tenantId }).populate('user_id', 'name email isActive')
    if (!agent) return Response.json({ error: 'Agent not found' }, { status: 404 })

    const shipments = await Shipment.find({ tenant_id: tenantId, assignedAgent: id })
      .populate('assignedHub', 'name city')
      .sort({ createdAt: -1 })

    const delivered = shipments.filter((s) => s.currentStatus === 'Delivered').length
    const notDelivered = shipments.length - delivered

    return Response.json({
      agent,
      summary: {
        totalAssigned: shipments.length,
        delivered,
        notDelivered,
      },
      shipments,
    })
  } catch (err) {
    console.error(err)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
