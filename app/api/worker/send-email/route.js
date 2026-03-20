import { Receiver } from '@upstash/qstash'
import transporter from '@/lib/mailer'

const receiver = new Receiver({
  currentSigningKey: process.env.QSTASH_CURRENT_SIGNING_KEY,
  nextSigningKey: process.env.QSTASH_NEXT_SIGNING_KEY,
})

export async function POST(request) {
  // Read raw body as text first — required for signature verification
  const rawBody = await request.text()

  // Verify the request is genuinely from QStash
  const signature = request.headers.get('upstash-signature')

  try {
    await receiver.verify({
      signature: signature ?? '',
      body: rawBody,
    })
  } catch (err) {
    console.error('QStash signature verification failed:', err)
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Parse the email payload
  let emailData
  try {
    emailData = JSON.parse(rawBody)
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { to, subject, html } = emailData

  if (!to || !subject || !html) {
    return Response.json({ error: 'Missing required fields: to, subject, html' }, { status: 400 })
  }

  // Send the email using the existing nodemailer transporter
  try {
    await transporter.sendMail({
      from: process.env.EMAIL_FROM || 'no-reply@courierplatform.com',
      to,
      subject,
      html,
    })
    console.log(`[worker/send-email] Email sent to ${to} — "${subject}"`)
    return Response.json({ success: true })
  } catch (err) {
    console.error('[worker/send-email] Email send error:', err)
    // Return 500 so QStash will retry the job
    return Response.json({ error: 'Email send failed' }, { status: 500 })
  }
}
