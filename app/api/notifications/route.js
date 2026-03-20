import connectDB from '@/lib/db'
import Notification from '@/models/Notification'
import { getAuthUser } from '@/lib/auth'

export async function GET() {
  try {
    const { userId } = await getAuthUser()
    await connectDB()

    const notifications = await Notification.find({ user_id: userId })
      .sort({ createdAt: -1 })
      .limit(20)

    // Mark all as read
    await Notification.updateMany({ user_id: userId, isRead: false }, { isRead: true })

    return Response.json({ notifications })
  } catch (err) {
    if (err.message === 'UNAUTHORIZED') return Response.json({ error: 'Unauthorized' }, { status: 401 })
    console.error(err)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
