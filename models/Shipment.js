import mongoose from 'mongoose'

const ContactSchema = new mongoose.Schema({
  name: { type: String, required: true },
  phone: { type: String, required: true },
  email: { type: String, default: '' },
  address: { type: String, required: true },
  city: { type: String, required: true },
}, { _id: false })

const ProofOfDeliverySchema = new mongoose.Schema({
  url: { type: String, default: null },
  note: { type: String, default: '' },
  uploadedAt: { type: Date, default: null },
}, { _id: false })

const ShipmentSchema = new mongoose.Schema(
  {
    trackingId: { type: String, unique: true, required: true },
    tenant_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
    sender: { type: ContactSchema, required: true },
    receiver: { type: ContactSchema, required: true },
    currentStatus: {
      type: String,
      enum: [
        'Created',
        'Picked Up',
        'At Sorting Facility',
        'In Transit',
        'Out for Delivery',
        'Delivered',
        'Failed',
        'Retry',
        'Returned',
      ],
      default: 'Created',
    },
    assignedHub: { type: mongoose.Schema.Types.ObjectId, ref: 'Hub', default: null },
    assignedAgent: { type: mongoose.Schema.Types.ObjectId, ref: 'Agent', default: null },
    assignedAt: { type: Date, default: null },
    estimatedDelivery: { type: Date, default: null },
    qrCodeUrl: { type: String, default: null },
    proofOfDelivery: { type: ProofOfDeliverySchema, default: null },
    description: { type: String, default: '' },
    weight: { type: Number, default: 0 },
  },
  { timestamps: true }
)

ShipmentSchema.index({ trackingId: 1 })
ShipmentSchema.index({ tenant_id: 1 })
ShipmentSchema.index({ assignedAgent: 1 })
ShipmentSchema.index({ currentStatus: 1 })

export default mongoose.models.Shipment || mongoose.model('Shipment', ShipmentSchema)
