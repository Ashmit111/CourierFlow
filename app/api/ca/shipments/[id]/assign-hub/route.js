import connectDB from '@/lib/db'
import Shipment from '@/models/Shipment'
import Hub from '@/models/Hub'
import redis from '@/lib/redis'
import { assignHubSchema } from '@/lib/validations'
import { headers } from 'next/headers'

export async function POST(request, { params }) {
  try {
    const { id } = await params
    const body = await request.json()
    const parsed = assignHubSchema.safeParse(body)

    if (!parsed.success) {
      return Response.json({ error: 'Validation failed', errors: parsed.error.flatten().fieldErrors }, { status: 400 })
    }

    const h = await headers()
    const tenantId = h.get('x-tenant-id')

    await connectDB()

    const hub = await Hub.findOne({ _id: parsed.data.hubId, tenant_id: tenantId })
    if (!hub) return Response.json({ error: 'Hub not found or does not belong to your tenant' }, { status: 404 })
    if (!hub.isActive) {
      return Response.json({ error: 'Cannot assign shipment to an inactive hub' }, { status: 400 })
    }

    const shipment = await Shipment.findOneAndUpdate(
      { _id: id, tenant_id: tenantId },
      { assignedHub: hub._id },
      { new: true }
    ).populate('assignedHub', 'name city')

    if (!shipment) return Response.json({ error: 'Shipment not found' }, { status: 404 })

    for (let p = 1; p <= 5; p++) await redis.del(`shipments:${tenantId}:page:${p}`)
    await redis.del(`track:${shipment.trackingId}`)

    return Response.json({ shipment, message: 'Hub assigned successfully' })
  } catch (err) {
    console.error(err)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
