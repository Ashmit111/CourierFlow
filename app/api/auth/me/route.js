import { getAuthUser } from '@/lib/auth'
import connectDB from '@/lib/db'
import User from '@/models/User'
import '@/models/Tenant'

export async function GET() {
  try {
    const { userId } = await getAuthUser()
    await connectDB()

    const user = await User.findById(userId).populate('tenant_id', 'name domain status')
    if (!user) {
      return Response.json({ error: 'User not found' }, { status: 404 })
    }

    return Response.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        tenant_id: user.tenant_id,
        isActive: user.isActive,
      },
    })
  } catch (err) {
    if (err.message === 'UNAUTHORIZED') {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('GET /api/auth/me error:', err)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
