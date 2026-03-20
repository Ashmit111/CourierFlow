import connectDB from '@/lib/db'
import Shipment from '@/models/Shipment'
import redis from '@/lib/redis'
import { headers } from 'next/headers'
import mongoose from 'mongoose'

export async function GET() {
  try {
    const h = await headers()
    const tenantId = h.get('x-tenant-id')
    const cacheKey = `analytics:${tenantId}`

    const cached = await redis.get(cacheKey)
    if (cached) return Response.json(cached)

    await connectDB()

    const tenantObjectId = mongoose.Types.ObjectId.isValid(tenantId)
      ? new mongoose.Types.ObjectId(tenantId)
      : null

    if (!tenantObjectId) {
      return Response.json({ error: 'Invalid tenant context' }, { status: 400 })
    }

    const [statusBreakdown, total] = await Promise.all([
      Shipment.aggregate([
        { $match: { tenant_id: tenantObjectId } },
        { $group: { _id: '$currentStatus', count: { $sum: 1 } } },
      ]),
      Shipment.countDocuments({ tenant_id: tenantObjectId }),
    ])

    // Calculate per-status counts
    const counts = { total }
    statusBreakdown.forEach(({ _id, count }) => {
      counts[_id] = count
    })
    counts.delivered = counts['Delivered'] || 0
    counts.pending = (counts['Created'] || 0) + (counts['Picked Up'] || 0) + (counts['At Sorting Facility'] || 0) + (counts['In Transit'] || 0)
    counts.outForDelivery = counts['Out for Delivery'] || 0
    counts.failed = counts['Failed'] || 0

    // Daily trend: last 7 days
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    const dailyTrend = await Shipment.aggregate([
      { $match: { tenant_id: tenantObjectId, createdAt: { $gte: sevenDaysAgo } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ])

    const result = { counts, statusBreakdown, dailyTrend }
    await redis.setex(cacheKey, 300, JSON.stringify(result))
    return Response.json(result)
  } catch (err) {
    console.error(err)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
