import mongoose from 'mongoose'

const SubscriptionPlanSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    price: { type: Number, required: true, min: 0 },
    maxShipments: { type: Number, required: true },
    maxAgents: { type: Number, required: true },
    maxHubs: { type: Number, required: true },
    features: [{ type: String }],
  },
  { timestamps: true }
)

export default mongoose.models.SubscriptionPlan || mongoose.model('SubscriptionPlan', SubscriptionPlanSchema)
