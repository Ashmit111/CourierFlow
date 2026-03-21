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

    // Hide logs with deleted actor/tenant references while keeping legitimate
    // global logs where tenant_id is null.
    const basePipeline = [
      { $match: filter },
      {
        $lookup: {
          from: 'users',
          localField: 'actor_id',
          foreignField: '_id',
          as: 'actor',
        },
      },
      {
        $lookup: {
          from: 'tenants',
          localField: 'tenant_id',
          foreignField: '_id',
          as: 'tenant',
        },
      },
      {
        $match: {
          $expr: {
            $and: [
              { $gt: [{ $size: '$actor' }, 0] },
              {
                $or: [
                  { $eq: ['$tenant_id', null] },
                  { $gt: [{ $size: '$tenant' }, 0] },
                ],
              },
            ],
          },
        },
      },
    ]

    const [logs, totalResult] = await Promise.all([
      AuditLog.aggregate([
        ...basePipeline,
        { $sort: { timestamp: -1 } },
        { $skip: skip },
        { $limit: limit },
        {
          $project: {
            _id: 1,
            action: 1,
            entity: 1,
            entity_id: 1,
            metadata: 1,
            timestamp: 1,
            actor_id: { $arrayElemAt: ['$actor', 0] },
            tenant_id: {
              $cond: [
                { $eq: ['$tenant_id', null] },
                null,
                { $arrayElemAt: ['$tenant', 0] },
              ],
            },
          },
        },
      ]),
      AuditLog.aggregate([...basePipeline, { $count: 'total' }]),
    ])

    const total = totalResult[0]?.total || 0

    return Response.json({ logs, total, page, pages: Math.ceil(total / limit) })
  } catch (err) {
    console.error(err)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
