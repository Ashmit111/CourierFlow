import mongoose from 'mongoose'

const HubSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    address: { type: String, required: true },
    city: { type: String, required: true },
    tenant_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
)

HubSchema.index({ tenant_id: 1 })

export default mongoose.models.Hub || mongoose.model('Hub', HubSchema)
