import connectDB from '@/lib/db'
import SubscriptionPlan from '@/models/SubscriptionPlan'
import redis from '@/lib/redis'
import { planSchema } from '@/lib/validations'

const CACHE_KEY = 'sa:plans:all'

export async function PUT(request, { params }) {
  try {
    const { id } = await params
    const body = await request.json()
    const parsed = planSchema.partial().safeParse(body)

    if (!parsed.success) {
      return Response.json({ error: 'Validation failed', errors: parsed.error.flatten().fieldErrors }, { status: 400 })
    }

    await connectDB()
    const plan = await SubscriptionPlan.findByIdAndUpdate(id, parsed.data, { new: true, runValidators: true })
    if (!plan) return Response.json({ error: 'Plan not found' }, { status: 404 })

    await redis.del(CACHE_KEY)
    return Response.json({ plan })
  } catch (err) {
    console.error(err)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = await params
    await connectDB()
    const plan = await SubscriptionPlan.findByIdAndDelete(id)
    if (!plan) return Response.json({ error: 'Plan not found' }, { status: 404 })

    await redis.del(CACHE_KEY)
    return Response.json({ message: 'Plan deleted' })
  } catch (err) {
    console.error(err)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
