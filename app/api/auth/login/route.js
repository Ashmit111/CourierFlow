import connectDB from '@/lib/db'
import User from '@/models/User'
import bcrypt from 'bcryptjs'
import { signAccess, signRefresh } from '@/lib/jwt'
import { loginSchema } from '@/lib/validations'
import { cookies } from 'next/headers'

export async function POST(request) {
  try {
    const body = await request.json()
    const parsed = loginSchema.safeParse(body)

    if (!parsed.success) {
      return Response.json(
        { error: 'Validation failed', errors: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const { email, password } = parsed.data

    await connectDB()

    const user = await User.findOne({ email }).select('+password')
    if (!user) {
      return Response.json({ error: 'Invalid email or password' }, { status: 401 })
    }

    if (!user.isActive) {
      return Response.json({ error: 'Your account has been deactivated' }, { status: 403 })
    }

    const isValid = await bcrypt.compare(password, user.password)
    if (!isValid) {
      return Response.json({ error: 'Invalid email or password' }, { status: 401 })
    }

    const tokenPayload = {
      userId: user._id.toString(),
      role: user.role,
      tenant_id: user.tenant_id ? user.tenant_id.toString() : null,
    }

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

    return Response.json({
      message: 'Login successful',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        tenant_id: user.tenant_id,
      },
    })
  } catch (err) {
    console.error('Login error:', err)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
