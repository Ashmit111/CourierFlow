import connectDB from '@/lib/db'
import Shipment from '@/models/Shipment'
import Agent from '@/models/Agent'
import { headers } from 'next/headers'

export async function GET(request, { params }) {
  try {
    const { id } = await params
    const h = await headers()
    const userId = h.get('x-user-id')

    await connectDB()

    const agent = await Agent.findOne({ user_id: userId })
    if (!agent) return Response.json({ error: 'Agent profile not found' }, { status: 404 })

    const shipment = await Shipment.findOne({ _id: id, assignedAgent: agent._id })
      .populate('assignedHub', 'name city address')

    if (!shipment) return Response.json({ error: 'Shipment not found or not assigned to you' }, { status: 404 })

    return Response.json({ shipment })
  } catch (err) {
    console.error(err)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
