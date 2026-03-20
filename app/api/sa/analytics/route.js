import connectDB from '@/lib/db'
import Tenant from '@/models/Tenant'
import User from '@/models/User'
import Shipment from '@/models/Shipment'

export async function GET() {
  try {
    await connectDB()

    const [totalTenants, activeTenants, suspendedTenants, totalShipments, totalUsers] = await Promise.all([
      Tenant.countDocuments(),
      Tenant.countDocuments({ status: 'active' }),
      Tenant.countDocuments({ status: 'suspended' }),
      Shipment.countDocuments(),
      User.countDocuments({ role: { $ne: 'SA' } }),
    ])

    const shipmentsByStatus = await Shipment.aggregate([
      { $group: { _id: '$currentStatus', count: { $sum: 1 } } },
    ])

    // Tenant growth: last 30 days
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const recentTenants = await Tenant.countDocuments({ createdAt: { $gte: thirtyDaysAgo } })

    return Response.json({
      totalTenants,
      activeTenants,
      suspendedTenants,
      totalShipments,
      totalUsers,
      recentTenants,
      shipmentsByStatus,
    })
  } catch (err) {
    console.error(err)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
