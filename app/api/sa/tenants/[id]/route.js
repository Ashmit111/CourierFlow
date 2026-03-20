import connectDB from '@/lib/db'
import Tenant from '@/models/Tenant'
import User from '@/models/User'
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
    const tenant = await Tenant.findById(id).populate('subscriptionPlan')
    if (!tenant) return Response.json({ error: 'Tenant not found' }, { status: 404 })
    return Response.json({ tenant })
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
    await writeAuditLog({ actor_id: h.get('x-user-id'), tenant_id: null, action: 'UPDATE', entity: 'Tenant', entity_id: id, metadata: updatePayload })

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
    await writeAuditLog({ actor_id: h.get('x-user-id'), tenant_id: null, action: 'DELETE', entity: 'Tenant', entity_id: id, metadata: {} })

    return Response.json({ message: 'Tenant deleted successfully' })
  } catch (err) {
    console.error(err)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
