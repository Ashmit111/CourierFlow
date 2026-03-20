import connectDB from '@/lib/db'
import Shipment from '@/models/Shipment'
import ShipmentEvent from '@/models/ShipmentEvent'
import '@/models/User'

export async function GET(request, { params }) {
  try {
    const { trackingId } = await params

    await connectDB()

    const shipment = await Shipment.findOne({ trackingId })
    if (!shipment) return Response.json({ error: 'No shipment found with this tracking ID' }, { status: 404 })

    const events = await ShipmentEvent.find({ shipment_id: shipment._id })
      .populate('updatedBy', 'name role')
      .sort({ timestamp: 1 })

    return Response.json({ events })
  } catch (err) {
    console.error(err)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
