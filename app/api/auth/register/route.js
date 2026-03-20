import connectDB from '@/lib/db'
import User from '@/models/User'
import Tenant from '@/models/Tenant'
import SubscriptionPlan from '@/models/SubscriptionPlan'
import bcrypt from 'bcryptjs'
import { signAccess, signRefresh } from '@/lib/jwt'
import { registerSchema } from '@/lib/validations'
import { dropLegacySlugIndexIfExists, generateUniqueTenantDomain } from '@/lib/tenantDomain'
import { cookies } from 'next/headers'

export async function POST(request) {
  try {
    const body = await request.json()
    const parsed = registerSchema.safeParse(body)

    if (!parsed.success) {
      return Response.json(
        { error: 'Validation failed', errors: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const { companyName, adminName, email, password, planId } = parsed.data

    await connectDB()
    await dropLegacySlugIndexIfExists()
    const domain = await generateUniqueTenantDomain(companyName)

    // Check email uniqueness
    const existingUser = await User.findOne({ email })
    if (existingUser) {
      return Response.json({ error: 'An account with this email already exists' }, { status: 400 })
    }

    // Validate plan exists
    const plan = await SubscriptionPlan.findById(planId)
    if (!plan) {
      return Response.json({ error: 'Invalid subscription plan' }, { status: 400 })
    }

    // Create tenant
    const tenant = await Tenant.create({
      name: companyName,
      domain,
      status: 'active',
      subscriptionPlan: plan._id,
    })

    // Hash password and create CA user
    const hashed = await bcrypt.hash(password, 12)
    const user = await User.create({
      name: adminName,
      email,
      password: hashed,
      role: 'CA',
      tenant_id: tenant._id,
      isActive: true,
    })

    // Sign tokens
    const tokenPayload = { userId: user._id.toString(), role: user.role, tenant_id: tenant._id.toString() }
    const accessToken = signAccess(tokenPayload)
    const refreshToken = signRefresh(tokenPayload)

    const cookieStore = await cookies()
    cookieStore.set('access_token', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 15 * 60,
      path: '/',
    })
    cookieStore.set('refresh_token', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60,
      path: '/',
    })

    return Response.json(
      {
        message: 'Tenant registered successfully',
        user: { id: user._id, name: user.name, email: user.email, role: user.role },
        tenant: { id: tenant._id, name: tenant.name, domain: tenant.domain },
      },
      { status: 201 }
    )
  } catch (err) {
    console.error('Register error:', err)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
