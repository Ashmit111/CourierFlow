import connectDB from '@/lib/db'
import Agent from '@/models/Agent'
import Shipment from '@/models/Shipment'
import pusher from '@/lib/pusher'
import redis from '@/lib/redis'
import { locationSchema } from '@/lib/validations'
import { headers } from 'next/headers'

export async function POST(request) {
  try {
    const body = await request.json()
    const parsed = locationSchema.safeParse(body)

    if (!parsed.success) {
      return Response.json({ error: 'Validation failed', errors: parsed.error.flatten().fieldErrors }, { status: 400 })
    }

    const { lat, lng } = parsed.data
    const h = await headers()
    const userId = h.get('x-user-id')
    const tenantId = h.get('x-tenant-id')

    await connectDB()

    const updatedAt = new Date()

    const agent = await Agent.findOneAndUpdate(
      { user_id: userId },
      {
        'currentLocation.lat': lat,
        'currentLocation.lng': lng,
        'currentLocation.updatedAt': updatedAt,
      },
      { new: true }
    )

    if (!agent) return Response.json({ error: 'Agent profile not found' }, { status: 404 })

    // Pusher: broadcast to CA dashboard
    await pusher.trigger(`agent-location-${tenantId}`, 'location-update', {
      agentId: agent._id,
      lat,
      lng,
      updatedAt,
    })

    // Fan out location to active shipments so public tracking pages can stream real-time movement.
    const activeShipments = await Shipment.find({
      assignedAgent: agent._id,
      currentStatus: { $nin: ['Delivered', 'Returned', 'Failed'] },
    })
      .select('trackingId')
      .lean()

    if (activeShipments.length > 0) {
      await Promise.all(activeShipments.map(({ trackingId }) =>
        Promise.all([
          pusher.trigger(`shipment-${trackingId}`, 'location-update', {
            trackingId,
            lat,
            lng,
            updatedAt,
          }),
          redis.del(`track:${trackingId}`),
        ])
      ))
    }

    return Response.json({ message: 'Location updated' })
  } catch (err) {
    console.error(err)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
