import connectDB from '@/lib/db'
import Shipment from '@/models/Shipment'
import ShipmentEvent from '@/models/ShipmentEvent'
import redis from '@/lib/redis'
import { updateShipmentSchema } from '@/lib/validations'
import { calculateEstimatedDeliveryDate } from '@/lib/eta'
import { headers } from 'next/headers'
import { writeAuditLog } from '@/lib/auth'

async function invalidateShipmentCaches(tenantId) {
  for (let p = 1; p <= 5; p++) {
    await redis.del(`shipments:${tenantId}:page:${p}`)
  }
  await redis.del(`analytics:${tenantId}`)
}

export async function GET(request, { params }) {
  try {
    const { id } = await params
    const h = await headers()
    const tenantId = h.get('x-tenant-id')

    await connectDB()
    const shipment = await Shipment.findOne({ _id: id, tenant_id: tenantId })
      .populate('assignedHub', 'name city address')
      .populate({ path: 'assignedAgent', populate: { path: 'user_id', select: 'name email' } })

    if (!shipment) return Response.json({ error: 'Shipment not found' }, { status: 404 })
    return Response.json({ shipment })
  } catch (err) {
    console.error(err)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request, { params }) {
  try {
    const { id } = await params
    const body = await request.json()
    const parsed = updateShipmentSchema.safeParse(body)

    if (!parsed.success) {
      return Response.json({ error: 'Validation failed', errors: parsed.error.flatten().fieldErrors }, { status: 400 })
    }

    const h = await headers()
    const tenantId = h.get('x-tenant-id')
    const userId = h.get('x-user-id')

    await connectDB()
    const shipment = await Shipment.findOne({ _id: id, tenant_id: tenantId })
    if (!shipment) return Response.json({ error: 'Shipment not found' }, { status: 404 })

    if (shipment.currentStatus === 'Delivered') {
      return Response.json({ error: 'Delivered shipments cannot be edited' }, { status: 400 })
    }

    Object.assign(shipment, parsed.data)

    shipment.estimatedDelivery = calculateEstimatedDeliveryDate({
      sender: shipment.sender,
      receiver: shipment.receiver,
      weight: shipment.weight,
      failedRetryCount: 0,
      baseDate: shipment.createdAt || new Date(),
    })

    await shipment.save()

    await ShipmentEvent.create({
      shipment_id: shipment._id,
      tenant_id: tenantId,
      status: shipment.currentStatus,
      note: 'Shipment details updated',
      updatedBy: userId,
    })

    await invalidateShipmentCaches(tenantId)
    await redis.del(`track:${shipment.trackingId}`)
    await writeAuditLog({
      actor_id: userId,
      tenant_id: tenantId,
      action: 'UPDATE',
      entity: 'Shipment',
      entity_id: id,
      metadata: {
        fieldsUpdated: Object.keys(parsed.data),
      },
    })

    return Response.json({ shipment })
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
    const shipment = await Shipment.findOneAndDelete({ _id: id, tenant_id: tenantId })
    if (!shipment) return Response.json({ error: 'Shipment not found' }, { status: 404 })

    await invalidateShipmentCaches(tenantId)
    await redis.del(`track:${shipment.trackingId}`)
    await writeAuditLog({ actor_id: h.get('x-user-id'), tenant_id: tenantId, action: 'DELETE', entity: 'Shipment', entity_id: id, metadata: { trackingId: shipment.trackingId } })

    return Response.json({ message: 'Shipment deleted' })
  } catch (err) {
    console.error(err)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
