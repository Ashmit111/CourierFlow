import connectDB from '@/lib/db'
import ShipmentEvent from '@/models/ShipmentEvent'
import Shipment from '@/models/Shipment'
import { headers } from 'next/headers'

export async function GET(request, { params }) {
  try {
    const { id } = await params
    const h = await headers()
    const tenantId = h.get('x-tenant-id')

    await connectDB()

    const shipment = await Shipment.findOne({ _id: id, tenant_id: tenantId })
    if (!shipment) return Response.json({ error: 'Shipment not found' }, { status: 404 })

    const events = await ShipmentEvent.find({ shipment_id: id, tenant_id: tenantId })
      .populate('updatedBy', 'name role')
      .sort({ timestamp: 1 })

    return Response.json({ events })
  } catch (err) {
    console.error(err)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
