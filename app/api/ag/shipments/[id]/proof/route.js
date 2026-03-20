import connectDB from '@/lib/db'
import Shipment from '@/models/Shipment'
import Agent from '@/models/Agent'
import imagekit from '@/lib/imagekit'
import redis from '@/lib/redis'
import { headers } from 'next/headers'

export async function POST(request, { params }) {
  try {
    const { id } = await params
    const formData = await request.formData()
    const file = formData.get('file')
    const note = formData.get('note') || ''

    if (!file) {
      return Response.json({ error: 'File is required' }, { status: 400 })
    }

    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp']
    if (!validTypes.includes(file.type)) {
      return Response.json({ error: 'Only JPG, PNG and WebP images are allowed' }, { status: 400 })
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      return Response.json({ error: 'File size must be under 5MB' }, { status: 400 })
    }

    const h = await headers()
    const userId = h.get('x-user-id')
    const tenantId = h.get('x-tenant-id')

    await connectDB()

    const agent = await Agent.findOne({ user_id: userId })
    if (!agent) return Response.json({ error: 'Agent profile not found' }, { status: 404 })

    const shipment = await Shipment.findOne({ _id: id, assignedAgent: agent._id })
    if (!shipment) return Response.json({ error: 'Shipment not found' }, { status: 404 })

    // Upload to ImageKit
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const uploadResult = await imagekit.upload({
      file: buffer.toString('base64'),
      fileName: `proof-${shipment.trackingId}-${Date.now()}.${file.type.split('/')[1]}`,
      folder: `/courier-flow/${tenantId}/proofs`,
    })

    // Store proof URL in shipment
    shipment.proofOfDelivery = { url: uploadResult.url, note, uploadedAt: new Date() }
    await shipment.save()
    await redis.del(`track:${shipment.trackingId}`)

    return Response.json({ proofUrl: uploadResult.url, message: 'Proof uploaded successfully' })
  } catch (err) {
    console.error(err)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
