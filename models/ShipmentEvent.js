import mongoose from 'mongoose'

const ShipmentEventSchema = new mongoose.Schema(
  {
    shipment_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Shipment', required: true },
    tenant_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
    status: { type: String, required: true },
    note: { type: String, default: '' },
    location: {
      lat: { type: Number, default: null },
      lng: { type: Number, default: null },
    },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    timestamp: { type: Date, default: Date.now },
  },
  { timestamps: false }
)

ShipmentEventSchema.index({ shipment_id: 1 })
ShipmentEventSchema.index({ tenant_id: 1 })

export default mongoose.models.ShipmentEvent || mongoose.model('ShipmentEvent', ShipmentEventSchema)
