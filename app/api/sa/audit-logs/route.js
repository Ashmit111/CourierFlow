import connectDB from '@/lib/db'
import AuditLog from '@/models/AuditLog'

export async function GET(request) {
  try {
    const { searchParams } = request.nextUrl
    const page = parseInt(searchParams.get('page') || '1')
    const limit = 50
    const skip = (page - 1) * limit
    const action = searchParams.get('action')
    const tenantId = searchParams.get('tenantId')
    const from = searchParams.get('from')
    const to = searchParams.get('to')

    const filter = {}
    if (action) filter.action = action
    if (tenantId) filter.tenant_id = tenantId
    if (from || to) {
      filter.timestamp = {}
      if (from) filter.timestamp.$gte = new Date(from)
      if (to) filter.timestamp.$lte = new Date(to)
    }

    await connectDB()
    const [logs, total] = await Promise.all([
      AuditLog.find(filter)
        .populate('actor_id', 'name email role')
        .populate('tenant_id', 'name domain')
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limit),
      AuditLog.countDocuments(filter),
    ])

    return Response.json({ logs, total, page, pages: Math.ceil(total / limit) })
  } catch (err) {
    console.error(err)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
