import { cookies } from 'next/headers'
import { verifyRefresh, signAccess } from '@/lib/jwt'

export async function POST() {
  try {
    const cookieStore = await cookies()
    const refreshToken = cookieStore.get('refresh_token')?.value

    if (!refreshToken) {
      return Response.json({ error: 'No refresh token' }, { status: 401 })
    }

    const payload = verifyRefresh(refreshToken)
    const newAccessToken = signAccess({
      userId: payload.userId,
      role: payload.role,
      tenant_id: payload.tenant_id,
    })

    cookieStore.set('access_token', newAccessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 15 * 60,
      path: '/',
    })

    return Response.json({ message: 'Token refreshed' })
  } catch {
    return Response.json({ error: 'Invalid or expired refresh token' }, { status: 401 })
  }
}
