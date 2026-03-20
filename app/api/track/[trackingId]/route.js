import connectDB from '@/lib/db'
import Shipment from '@/models/Shipment'
import Agent from '@/models/Agent'
import '@/models/Hub'
import redis from '@/lib/redis'

const CACHE_TTL = 60

export async function GET(request, { params }) {
  try {
    const { trackingId } = await params
    const cacheKey = `track:${trackingId}`

    const cached = await redis.get(cacheKey)
    if (cached) return Response.json(cached)

    await connectDB()

    const shipment = await Shipment.findOne({ trackingId })
      .populate('assignedHub', 'name city')

    if (!shipment) {
      return Response.json({ error: 'No shipment found with this tracking ID' }, { status: 404 })
    }

    // Include agent's last known location for active (non-terminal) assigned shipments.
    let agentLocation = null
    const terminalStatuses = ['Delivered', 'Returned', 'Failed']
    if (!terminalStatuses.includes(shipment.currentStatus) && shipment.assignedAgent) {
      const agent = await Agent.findById(shipment.assignedAgent)
      if (agent?.currentLocation?.lat) {
        agentLocation = agent.currentLocation
      }
    }

    const result = {
      trackingId: shipment.trackingId,
      currentStatus: shipment.currentStatus,
      estimatedDelivery: shipment.estimatedDelivery,
      qrCodeUrl: shipment.qrCodeUrl,
      proofOfDelivery: shipment.proofOfDelivery,
      sender: { city: shipment.sender.city },
      receiver: { name: shipment.receiver.name, city: shipment.receiver.city },
      assignedHub: shipment.assignedHub,
      agentLocation,
      createdAt: shipment.createdAt,
    }

    await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(result))
    return Response.json(result)
  } catch (err) {
    console.error(err)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
