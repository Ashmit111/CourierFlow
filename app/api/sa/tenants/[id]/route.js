import connectDB from '@/lib/db'
import Tenant from '@/models/Tenant'
import User from '@/models/User'
import Shipment from '@/models/Shipment'
import Hub from '@/models/Hub'
import Agent from '@/models/Agent'
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
    const tenant = await Tenant.findByIdAndDelete(id)
    if (!tenant) return Response.json({ error: 'Tenant not found' }, { status: 404 })

    // Also deactivate all users of this tenant
    await User.updateMany({ tenant_id: id }, { isActive: false })
    await redis.del(CACHE_KEY)

    const h = await headers()
    await writeAuditLog({ actor_id: h.get('x-user-id'), tenant_id: id, action: 'DELETE', entity: 'Tenant', entity_id: id, metadata: {} })

    return Response.json({ message: 'Tenant deleted successfully' })
  } catch (err) {
    console.error(err)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
