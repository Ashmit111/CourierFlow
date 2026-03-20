import connectDB from '@/lib/db'
import Tenant from '@/models/Tenant'
import SubscriptionPlan from '@/models/SubscriptionPlan'
import redis from '@/lib/redis'

export async function POST(request, { params }) {
  try {
    const { id } = await params
    const body = await request.json()
    const { planId } = body

    if (!planId) {
      return Response.json({ error: 'planId is required' }, { status: 400 })
    }

    await connectDB()

    const plan = await SubscriptionPlan.findById(planId)
    if (!plan) return Response.json({ error: 'Plan not found' }, { status: 404 })

    const tenant = await Tenant.findByIdAndUpdate(
      id,
      { subscriptionPlan: plan._id },
      { new: true }
    ).populate('subscriptionPlan')

    if (!tenant) return Response.json({ error: 'Tenant not found' }, { status: 404 })

    await redis.del('sa:tenants:all')

    return Response.json({ tenant, message: 'Plan assigned successfully' })
  } catch (err) {
    console.error(err)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
