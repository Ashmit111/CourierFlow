import mongoose from 'mongoose'

const NotificationSchema = new mongoose.Schema(
  {
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    tenant_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', default: null },
    type: { type: String, enum: ['email', 'in-app'], default: 'in-app' },
    event: { type: String, required: true },
    message: { type: String, required: true },
    isRead: { type: Boolean, default: false },
    status: { type: String, enum: ['sent', 'failed', 'pending'], default: 'pending' },
  },
  { timestamps: true }
)

NotificationSchema.index({ user_id: 1 })
NotificationSchema.index({ tenant_id: 1 })

export default mongoose.models.Notification || mongoose.model('Notification', NotificationSchema)
