import mongoose from 'mongoose'

const AuditLogSchema = new mongoose.Schema(
  {
    actor_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    tenant_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', default: null },
    action: { type: String, required: true }, // CREATE, UPDATE, DELETE, LOGIN, etc.
    entity: { type: String, required: true },  // Shipment, Hub, Agent, Tenant, etc.
    entity_id: { type: mongoose.Schema.Types.ObjectId, default: null },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
    timestamp: { type: Date, default: Date.now },
  },
  { timestamps: false }
)

AuditLogSchema.index({ tenant_id: 1, timestamp: -1 })

export default mongoose.models.AuditLog || mongoose.model('AuditLog', AuditLogSchema)
