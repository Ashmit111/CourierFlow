import connectDB from '@/lib/db'
import Shipment from '@/models/Shipment'
import ShipmentEvent from '@/models/ShipmentEvent'
import '@/models/Hub'
import '@/models/Agent'
import '@/models/User'
import redis from '@/lib/redis'
import { createShipmentSchema } from '@/lib/validations'
import { headers } from 'next/headers'
import { ensureTenantIsActiveForCreate, writeAuditLog } from '@/lib/auth'
import { calculateEstimatedDeliveryDate } from '@/lib/eta'
import { nanoid } from 'nanoid'
import QRCode from 'qrcode'
import imagekit from '@/lib/imagekit'

async function dropLegacyTrackingIdIndexIfPresent() {
  try {
    const indexes = await Shipment.collection.indexes()
    const hasLegacyIndex = indexes.some((idx) => idx.name === 'tracking_id_1')
    if (hasLegacyIndex) {
      await Shipment.collection.dropIndex('tracking_id_1')
      console.warn('Dropped legacy Mongo index tracking_id_1 from shipments collection')
    }
  } catch (err) {
    console.warn('Unable to verify/drop legacy tracking_id_1 index:', err?.message || err)
  }
}

async function generateQRAndUpload(trackingId, qrPayload) {
  try {
    const qrBuffer = await QRCode.toBuffer(qrPayload, { type: 'png', width: 300 })
    const result = await imagekit.upload({
      file: qrBuffer.toString('base64'),
      fileName: `${trackingId}.png`,
      folder: '/courier-flow/qrcodes',
    })
    return result.url
  } catch (err) {
    console.error('QR upload error:', err)
    return null
  }
}

export async function GET(request) {
  try {
    const h = await headers()
    const tenantId = h.get('x-tenant-id')
    const { searchParams } = request.nextUrl
    const page = parseInt(searchParams.get('page') || '1')
    const limit = 20
    const skip = (page - 1) * limit

    const cacheKey = `shipments:${tenantId}:page:${page}`
    const cached = await redis.get(cacheKey)
    if (cached) return Response.json(cached)

    await connectDB()

    const filter = { tenant_id: tenantId }
    if (searchParams.get('status')) filter.currentStatus = searchParams.get('status')
    if (searchParams.get('hub')) filter.assignedHub = searchParams.get('hub')
    if (searchParams.get('agent')) filter.assignedAgent = searchParams.get('agent')
    if (searchParams.get('search')) {
      filter.$or = [
        { trackingId: { $regex: searchParams.get('search'), $options: 'i' } },
        { 'sender.name': { $regex: searchParams.get('search'), $options: 'i' } },
        { 'receiver.name': { $regex: searchParams.get('search'), $options: 'i' } },
      ]
    }

    const [shipments, total] = await Promise.all([
      Shipment.find(filter)
        .populate('assignedHub', 'name city')
        .populate({ path: 'assignedAgent', populate: { path: 'user_id', select: 'name' } })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Shipment.countDocuments(filter),
    ])

    const result = { shipments, total, page, pages: Math.ceil(total / limit) }
    // Only cache non-filtered (first page) requests
    if (!searchParams.get('status') && !searchParams.get('search')) {
      await redis.setex(cacheKey, 120, JSON.stringify(result))
    }

    return Response.json(result)
  } catch (err) {
    console.error(err)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const body = await request.json()
    const parsed = createShipmentSchema.safeParse(body)

    if (!parsed.success) {
      return Response.json({ error: 'Validation failed', errors: parsed.error.flatten().fieldErrors }, { status: 400 })
    }

    const h = await headers()
    const tenantId = h.get('x-tenant-id')
    const userId = h.get('x-user-id')

    await connectDB()
    await ensureTenantIsActiveForCreate(tenantId)
    await dropLegacyTrackingIdIndexIfPresent()

    const trackingId = 'TRK-' + nanoid(10).toUpperCase()
    const trackingUrl = `${request.nextUrl.origin}/track?trackingId=${encodeURIComponent(trackingId)}`

    // Generate QR code and upload to ImageKit
    const qrCodeUrl = await generateQRAndUpload(trackingId, trackingUrl)

    // Explainable ETA: lane type + parcel weight + delay penalties (none at creation time).
    const estimatedDelivery = calculateEstimatedDeliveryDate({
      sender: parsed.data.sender,
      receiver: parsed.data.receiver,
      weight: parsed.data.weight,
      failedRetryCount: 0,
      baseDate: new Date(),
    })

    const shipment = await Shipment.create({
      ...parsed.data,
      trackingId,
      tenant_id: tenantId,
      qrCodeUrl,
      estimatedDelivery,
      currentStatus: 'Created',
    })

    // Create initial shipment event
    await ShipmentEvent.create({
      shipment_id: shipment._id,
      tenant_id: tenantId,
      status: 'Created',
      note: 'Shipment created',
      updatedBy: userId,
    })

    // Invalidate cache
    for (let p = 1; p <= 5; p++) {
      await redis.del(`shipments:${tenantId}:page:${p}`)
    }
    await redis.del(`analytics:${tenantId}`)

    await writeAuditLog({ actor_id: userId, tenant_id: tenantId, action: 'CREATE', entity: 'Shipment', entity_id: shipment._id, metadata: { trackingId } })

    return Response.json({ shipment }, { status: 201 })
  } catch (err) {
    if (err.message === 'TENANT_SUSPENDED') {
      return Response.json({ error: 'Tenant is suspended. Creation operations are disabled.' }, { status: 403 })
    }
    if (err.message === 'TENANT_NOT_FOUND' || err.message === 'TENANT_CONTEXT_MISSING') {
      return Response.json({ error: 'Invalid tenant context' }, { status: 400 })
    }
    console.error(err)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
