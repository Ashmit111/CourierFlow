import connectDB from '@/lib/db'
import User from '@/models/User'
import Agent from '@/models/Agent'
import redis from '@/lib/redis'
import { updateAgentSchema } from '@/lib/validations'
import { headers } from 'next/headers'
import { writeAuditLog } from '@/lib/auth'
import bcrypt from 'bcryptjs'

export async function GET(request, { params }) {
  try {
    const { id } = await params
    const h = await headers()
    const tenantId = h.get('x-tenant-id')

    await connectDB()
    const agent = await Agent.findOne({ _id: id, tenant_id: tenantId }).populate('user_id', 'name email isActive')
    if (!agent) return Response.json({ error: 'Agent not found' }, { status: 404 })
    return Response.json({ agent })
  } catch (err) {
    console.error(err)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request, { params }) {
  try {
    const { id } = await params
    const body = await request.json()
    const parsed = updateAgentSchema.safeParse(body)

    if (!parsed.success) {
      return Response.json({ error: 'Validation failed', errors: parsed.error.flatten().fieldErrors }, { status: 400 })
    }

    const { name, email, password, isAvailable } = parsed.data
    const h = await headers()
    const tenantId = h.get('x-tenant-id')

    await connectDB()
    const agent = await Agent.findOne({ _id: id, tenant_id: tenantId })
    if (!agent) return Response.json({ error: 'Agent not found' }, { status: 404 })

    const userUpdate = {}
    if (name) userUpdate.name = name
    if (email) userUpdate.email = email
    if (password) userUpdate.password = await bcrypt.hash(password, 12)
    if (Object.keys(userUpdate).length) await User.findByIdAndUpdate(agent.user_id, userUpdate)

    if (isAvailable !== undefined) agent.isAvailable = isAvailable
    await agent.save()

    await redis.del(`agents:${tenantId}`)
    await writeAuditLog({ actor_id: h.get('x-user-id'), tenant_id: tenantId, action: 'UPDATE', entity: 'Agent', entity_id: id, metadata: { name, email, isAvailable } })

    return Response.json({ message: 'Agent updated successfully' })
  } catch (err) {
    console.error(err)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = await params
    const h = await headers()
    const tenantId = h.get('x-tenant-id')

    await connectDB()
    const agent = await Agent.findOneAndDelete({ _id: id, tenant_id: tenantId })
    if (!agent) return Response.json({ error: 'Agent not found' }, { status: 404 })

    await User.findByIdAndDelete(agent.user_id)
    await redis.del(`agents:${tenantId}`)
    await writeAuditLog({ actor_id: h.get('x-user-id'), tenant_id: tenantId, action: 'DELETE', entity: 'Agent', entity_id: id, metadata: {} })

    return Response.json({ message: 'Agent deleted' })
  } catch (err) {
    console.error(err)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
