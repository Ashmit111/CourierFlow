import connectDB from '@/lib/db'
import SubscriptionPlan from '@/models/SubscriptionPlan'
import redis from '@/lib/redis'
import { planSchema } from '@/lib/validations'

const CACHE_KEY = 'sa:plans:all'
const CACHE_TTL = 600

export async function GET() {
  try {
    const cached = await redis.get(CACHE_KEY)
    if (cached) return Response.json(cached)

    await connectDB()
    const plans = await SubscriptionPlan.find().sort({ price: 1 })
    await redis.setex(CACHE_KEY, CACHE_TTL, JSON.stringify({ plans }))
    return Response.json({ plans })
  } catch (err) {
    console.error(err)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const body = await request.json()
    const parsed = planSchema.safeParse(body)

    if (!parsed.success) {
      return Response.json({ error: 'Validation failed', errors: parsed.error.flatten().fieldErrors }, { status: 400 })
    }

    await connectDB()
    const plan = await SubscriptionPlan.create(parsed.data)
    await redis.del(CACHE_KEY)
    return Response.json({ plan }, { status: 201 })
  } catch (err) {
    console.error(err)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
