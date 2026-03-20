import mongoose from 'mongoose'

const UserSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, select: false },
    role: { type: String, enum: ['SA', 'CA', 'AG'], required: true },
    tenant_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', default: null },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
)

UserSchema.index({ tenant_id: 1 })

export default mongoose.models.User || mongoose.model('User', UserSchema)
