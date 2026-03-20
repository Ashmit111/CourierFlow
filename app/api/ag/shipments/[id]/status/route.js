import connectDB from '@/lib/db'
import Shipment from '@/models/Shipment'
import ShipmentEvent from '@/models/ShipmentEvent'
import Agent from '@/models/Agent'
import redis from '@/lib/redis'
import pusher from '@/lib/pusher'
import qstash from '@/lib/qstash'
import { statusUpdateSchema } from '@/lib/validations'
import { calculateEstimatedDeliveryDate } from '@/lib/eta'
import { headers } from 'next/headers'

// Valid state machine transitions
const VALID_TRANSITIONS = {
  'Created': ['Picked Up'],
  'Picked Up': ['At Sorting Facility'],
  'At Sorting Facility': ['In Transit'],
  'In Transit': ['Out for Delivery'],
  'Out for Delivery': ['Delivered', 'Failed'],
  'Failed': ['Retry', 'Returned'],
  'Retry': ['In Transit'],
}

export async function POST(request, { params }) {
  try {
    const { id } = await params
    const body = await request.json()
    const parsed = statusUpdateSchema.safeParse(body)

    if (!parsed.success) {
      return Response.json({ error: 'Validation failed', errors: parsed.error.flatten().fieldErrors }, { status: 400 })
    }

    const { status, note, location } = parsed.data
    const h = await headers()
    const userId = h.get('x-user-id')
    const tenantId = h.get('x-tenant-id')

    await connectDB()

    const agent = await Agent.findOne({ user_id: userId })
    if (!agent) return Response.json({ error: 'Agent profile not found' }, { status: 404 })

    const shipment = await Shipment.findOne({ _id: id, assignedAgent: agent._id })
    if (!shipment) return Response.json({ error: 'Shipment not found or not assigned to you' }, { status: 404 })

    // Validate transition
    const allowedNext = VALID_TRANSITIONS[shipment.currentStatus] || []
    if (!allowedNext.includes(status)) {
      return Response.json(
        { error: `Invalid transition: ${shipment.currentStatus} → ${status}. Allowed: ${allowedNext.join(', ')}` },
        { status: 400 }
      )
    }

    shipment.currentStatus = status
    await shipment.save()

    // Create event
    const event = await ShipmentEvent.create({
      shipment_id: shipment._id,
      tenant_id: tenantId,
      status,
      note,
      location: location || { lat: null, lng: null },
      updatedBy: userId,
    })

    const failedRetryCount = await ShipmentEvent.countDocuments({
      shipment_id: shipment._id,
      status: { $in: ['Failed', 'Retry'] },
    })

    shipment.estimatedDelivery = calculateEstimatedDeliveryDate({
      sender: shipment.sender,
      receiver: shipment.receiver,
      weight: shipment.weight,
      failedRetryCount,
      baseDate: shipment.createdAt || new Date(),
    })
    await shipment.save()

    // Invalidate caches
    await redis.del(`track:${shipment.trackingId}`)
    for (let p = 1; p <= 5; p++) await redis.del(`shipments:${tenantId}:page:${p}`)
    await redis.del(`analytics:${tenantId}`)

    // Pusher real-time update
    await pusher.trigger(`shipment-${shipment.trackingId}`, 'status-update', {
      status,
      note,
      timestamp: event.timestamp,
      updatedBy: { id: userId },
    })

    // Email notification to receiver (enqueued via QStash for async delivery)
    const receiverEmail = (shipment.receiver?.email || '').trim()
    if (receiverEmail) {
      const appUrl = (process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || '').replace(/\/+$/, '')
      const trackingLink = `${appUrl}/track?trackingId=${encodeURIComponent(shipment.trackingId)}`
      const workerUrl = `${appUrl}/api/worker/send-email`

      await qstash.publishJSON({
        url: workerUrl,
        body: {
          to: receiverEmail,
          subject: `Your shipment ${shipment.trackingId} — ${status}`,
          html: `
          <h2>Shipment Update</h2>
          <p>Hello ${shipment.receiver.name},</p>
          <p>Your shipment <strong>${shipment.trackingId}</strong> status has been updated to: <strong>${status}</strong></p>
          ${note ? `<p>Note: ${note}</p>` : ''}
          <p>Track your shipment at: ${trackingLink}</p>
        `,
        },
      })
    }

    return Response.json({ shipment, event })
  } catch (err) {
    console.error(err)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
