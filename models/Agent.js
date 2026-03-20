import mongoose from 'mongoose'

const AgentSchema = new mongoose.Schema(
  {
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    tenant_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
    currentLocation: {
      lat: { type: Number, default: null },
      lng: { type: Number, default: null },
      updatedAt: { type: Date, default: null },
    },
    isAvailable: { type: Boolean, default: true },
  },
  { timestamps: true }
)

AgentSchema.index({ tenant_id: 1 })

export default mongoose.models.Agent || mongoose.model('Agent', AgentSchema)
