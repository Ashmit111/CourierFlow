import mongoose from 'mongoose'

const TenantSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    domain: { type: String, required: true, unique: true, lowercase: true, trim: true },
    status: { type: String, enum: ['active', 'suspended'], default: 'active' },
    subscriptionPlan: { type: mongoose.Schema.Types.ObjectId, ref: 'SubscriptionPlan', default: null },
  },
  { timestamps: true }
)

export default mongoose.models.Tenant || mongoose.model('Tenant', TenantSchema)
