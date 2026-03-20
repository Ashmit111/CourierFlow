import connectDB from '@/lib/db'
import Shipment from '@/models/Shipment'
import Agent from '@/models/Agent'
import '@/models/Hub'
import { headers } from 'next/headers'

export async function GET(request) {
  try {
    const h = await headers()
    const userId = h.get('x-user-id')
    const tenantId = h.get('x-tenant-id')
    const { searchParams } = request.nextUrl
    const statusFilter = searchParams.get('status')

    await connectDB()

    const agent = await Agent.findOne({ user_id: userId })
    if (!agent) return Response.json({ error: 'Agent profile not found' }, { status: 404 })

    const filter = { assignedAgent: agent._id, tenant_id: tenantId }
    if (statusFilter) filter.currentStatus = statusFilter

    const shipments = await Shipment.find(filter)
      .populate('assignedHub', 'name city')
      .sort({ updatedAt: -1 })

    return Response.json({ shipments })
  } catch (err) {
    console.error(err)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
