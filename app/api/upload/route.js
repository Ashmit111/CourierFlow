import imagekit from '@/lib/imagekit'
import { getAuthUser } from '@/lib/auth'

export async function POST(request) {
  try {
    const { userId, tenant_id } = await getAuthUser()

    const folder = tenant_id
      ? `/courier-flow/${tenant_id}/uploads`
      : '/courier-flow/uploads'

    // Generate ImageKit auth signature for client-side direct upload
    const authParams = imagekit.getAuthenticationParameters()

    return Response.json({
      ...authParams,
      publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
      urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT,
      folder,
    })
  } catch (err) {
    if (err.message === 'UNAUTHORIZED') {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error(err)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
