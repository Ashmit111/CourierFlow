import { Space_Grotesk, DM_Sans, JetBrains_Mono } from 'next/font/google'
import './globals.css'

const spaceGrotesk = Space_Grotesk({ subsets: ['latin'], variable: '--font-display' })
const dmSans = DM_Sans({ subsets: ['latin'], variable: '--font-body' })
const jetbrainsMono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono' })

export const metadata = {
  title: 'Courier Flow — Multi-Tenant Courier Tracking Platform',
  description: 'Manage shipments, delivery agents, and hubs across multiple tenants on a unified platform.',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${spaceGrotesk.variable} ${dmSans.variable} ${jetbrainsMono.variable}`}>
       <body>{children}</body>
    </html>
  )
}
