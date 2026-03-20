import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { verifyAccess } from '@/lib/jwt'

export default async function Home() {
  const cookieStore = await cookies()
  const token = cookieStore.get('access_token')?.value

  if (!token) redirect('/login')

  try {
    const { role } = verifyAccess(token)
    if (role === 'SA') redirect('/sa/dashboard')
    if (role === 'CA') redirect('/ca/dashboard')
    if (role === 'AG') redirect('/ag/dashboard')
  } catch {
    redirect('/login')
  }
}
