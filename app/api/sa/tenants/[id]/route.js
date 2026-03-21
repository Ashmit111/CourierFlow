import connectDB from '@/lib/db'
import Tenant from '@/models/Tenant'
import User from '@/models/User'
import Shipment from '@/models/Shipment'
import ShipmentEvent from '@/models/ShipmentEvent'
import Hub from '@/models/Hub'
import Agent from '@/models/Agent'
import Notification from '@/models/Notification'
import redis from '@/lib/redis'
import { updateTenantSchema } from '@/lib/validations'
import { generateUniqueTenantDomain } from '@/lib/tenantDomain'
import { headers } from 'next/headers'
import { writeAuditLog } from '@/lib/auth'

const CACHE_KEY = 'sa:tenants:all'

export async function GET(request, { params }) {
  try {
    const { id } = await params
    await connectDB()
    const [tenant, shipments, hubs, agents] = await Promise.all([
      Tenant.findById(id).populate('subscriptionPlan'),
      Shipment.find({ tenant_id: id })
        .select('trackingId currentStatus sender receiver createdAt')
        .sort({ createdAt: -1 })
        .lean(),
      Hub.find({ tenant_id: id })
        .select('name city isActive createdAt')
        .sort({ createdAt: -1 })
        .lean(),
      Agent.find({ tenant_id: id })
        .populate('user_id', 'name email isActive')
        .sort({ createdAt: -1 })
        .lean(),
    ])

    if (!tenant) return Response.json({ error: 'Tenant not found' }, { status: 404 })

    const summary = {
      totalShipments: shipments.length,
      deliveredShipments: shipments.filter((s) => s.currentStatus === 'Delivered').length,
      failedShipments: shipments.filter((s) => s.currentStatus === 'Failed').length,
      totalHubs: hubs.length,
      totalAgents: agents.length,
    }

    return Response.json({ tenant, summary, shipments, hubs, agents })
  } catch (err) {
    console.error(err)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request, { params }) {
  try {
    const { id } = await params
    const body = await request.json()
    const parsed = updateTenantSchema.safeParse(body)

    if (!parsed.success) {
      return Response.json(
        { error: 'Validation failed', errors: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    await connectDB()
    const updatePayload = { ...parsed.data }
    if (updatePayload.name) {
      updatePayload.domain = await generateUniqueTenantDomain(updatePayload.name, id)
    }

    const tenant = await Tenant.findByIdAndUpdate(id, updatePayload, { new: true, runValidators: true })
    if (!tenant) return Response.json({ error: 'Tenant not found' }, { status: 404 })

    await redis.del(CACHE_KEY)

    const h = await headers()
    await writeAuditLog({ actor_id: h.get('x-user-id'), tenant_id: id, action: 'UPDATE', entity: 'Tenant', entity_id: id, metadata: updatePayload })

    return Response.json({ tenant })
  } catch (err) {
    console.error(err)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = await params
    await connectDB()
    const tenant = await Tenant.findById(id)
    if (!tenant) return Response.json({ error: 'Tenant not found' }, { status: 404 })

    const [shipmentEventsResult, shipmentsResult, hubsResult, agentsResult, usersResult, notificationsResult] = await Promise.all([
      ShipmentEvent.deleteMany({ tenant_id: id }),
      Shipment.deleteMany({ tenant_id: id }),
      Hub.deleteMany({ tenant_id: id }),
      Agent.deleteMany({ tenant_id: id }),
      User.deleteMany({ tenant_id: id }),
      Notification.deleteMany({ tenant_id: id }),
    ])

    await Tenant.deleteOne({ _id: id })
    await redis.del(CACHE_KEY)

    const h = await headers()
    await writeAuditLog({
      actor_id: h.get('x-user-id'),
      tenant_id: id,
      action: 'DELETE',
      entity: 'Tenant',
      entity_id: id,
      metadata: {
        deleted: {
          shipmentEvents: shipmentEventsResult.deletedCount || 0,
          shipments: shipmentsResult.deletedCount || 0,
          hubs: hubsResult.deletedCount || 0,
          agents: agentsResult.deletedCount || 0,
          users: usersResult.deletedCount || 0,
          notifications: notificationsResult.deletedCount || 0,
        },
      },
    })

    return Response.json({
      message: 'Tenant and all associated data deleted successfully',
      deleted: {
        shipmentEvents: shipmentEventsResult.deletedCount || 0,
        shipments: shipmentsResult.deletedCount || 0,
        hubs: hubsResult.deletedCount || 0,
        agents: agentsResult.deletedCount || 0,
        users: usersResult.deletedCount || 0,
        notifications: notificationsResult.deletedCount || 0,
      },
    })
  } catch (err) {
    console.error(err)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
