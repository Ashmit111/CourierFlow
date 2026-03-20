import connectDB from '@/lib/db'
import SubscriptionPlan from '@/models/SubscriptionPlan'
import redis from '@/lib/redis'

export async function GET() {
  try {
    const CACHE_KEY = 'sa:plans:all'
    const CACHE_TTL = 3600

    const cached = await redis.get(CACHE_KEY)
    if (cached) return Response.json(typeof cached === 'string' ? JSON.parse(cached) : cached)

    await connectDB()
    const plans = await SubscriptionPlan.find().sort({ price: 1 })
    
    await redis.setex(CACHE_KEY, CACHE_TTL, JSON.stringify({ plans }))
    return Response.json({ plans })
  } catch (err) {
    console.error('Error fetching public plans:', err)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
