/**
 * Seed script — run with: node seed.js
 * Creates the Super Admin user and 3 default subscription plans.
 */

const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')
require('dotenv').config({ path: '.env.local' })

const MONGODB_URI = process.env.MONGODB_URI

if (!MONGODB_URI) {
  console.error('MONGODB_URI is not set in environment.')
  process.exit(1)
}

// Inline schemas to avoid import resolution issues in plain Node
const SubscriptionPlanSchema = new mongoose.Schema({
  name: String,
  price: Number,
  maxShipments: Number,
  maxAgents: Number,
  maxHubs: Number,
  features: [String],
}, { timestamps: true })

const UserSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  password: String,
  role: String,
  tenant_id: { type: mongoose.Schema.Types.ObjectId, default: null },
  isActive: { type: Boolean, default: true },
}, { timestamps: true })

const SubscriptionPlan = mongoose.models.SubscriptionPlan ||
  mongoose.model('SubscriptionPlan', SubscriptionPlanSchema)
const User = mongoose.models.User || mongoose.model('User', UserSchema)

async function seed() {
  await mongoose.connect(MONGODB_URI)
  console.log('Connected to MongoDB')

  // ── 1. Subscription Plans ──────────────────────────────────────────────────
  const plans = [
    {
      name: 'Basic',
      price: 29,
      maxShipments: 500,
      maxAgents: 5,
      maxHubs: 2,
      features: ['Email notifications', 'QR code generation', 'Basic analytics'],
    },
    {
      name: 'Pro',
      price: 79,
      maxShipments: 2000,
      maxAgents: 20,
      maxHubs: 10,
      features: [
        'Everything in Basic',
        'Real-time GPS tracking',
        'Advanced analytics',
        'Proof of delivery',
        'Priority support',
      ],
    },
    {
      name: 'Enterprise',
      price: 199,
      maxShipments: 999999,
      maxAgents: 999999,
      maxHubs: 999999,
      features: [
        'Everything in Pro',
        'Unlimited shipments, agents & hubs',
        'Dedicated account manager',
        'Custom integrations',
        'SLA guarantee',
      ],
    },
  ]

  for (const plan of plans) {
    const existing = await SubscriptionPlan.findOne({ name: plan.name })
    if (!existing) {
      await SubscriptionPlan.create(plan)
      console.log(`✓ Created plan: ${plan.name}`)
    } else {
      console.log(`  Plan already exists: ${plan.name}`)
    }
  }

  // ── 2. Super Admin User ───────────────────────────────────────────────────
  const SA_EMAIL = 'admin@platform.com'
  const SA_PASSWORD = 'Admin@1234'

  const existingSA = await User.findOne({ email: SA_EMAIL })
  if (!existingSA) {
    const hashed = await bcrypt.hash(SA_PASSWORD, 12)
    await User.create({
      name: 'Super Admin',
      email: SA_EMAIL,
      password: hashed,
      role: 'SA',
      tenant_id: null,
    })
    console.log(`✓ Created Super Admin: ${SA_EMAIL} / ${SA_PASSWORD}`)
  } else {
    console.log(`  Super Admin already exists: ${SA_EMAIL}`)
  }

  await mongoose.disconnect()
  console.log('\nSeeding complete.')
}

seed().catch((err) => {
  console.error(err)
  process.exit(1)
})
