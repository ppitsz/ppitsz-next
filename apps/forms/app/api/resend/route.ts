import { recordDelivery } from "@/lib/mail/queue"
import { statusOfEvent, verifyWebhook } from "@/lib/mail/webhook"

/*
 * Resend's delivery events (Resend dashboard › Webhooks → this URL, with
 * email.sent, delivered, delivery_delayed, bounced, complained and failed).
 * A bounce flags the response, so organizers can fix the address and resend.
 */
export async function POST(request: Request) {
  const secret = process.env.RESEND_WEBHOOK_SECRET
  const body = await request.text()
  const ok =
    !!secret &&
    verifyWebhook(
      body,
      {
        id: request.headers.get("svix-id"),
        timestamp: request.headers.get("svix-timestamp"),
        signature: request.headers.get("svix-signature"),
      },
      secret
    )
  if (!ok) return new Response("Invalid signature", { status: 401 })

  const event = JSON.parse(body) as {
    type: string
    created_at?: string
    data?: { email_id?: string; bounce?: { message?: string }; failed?: { reason?: string } }
  }
  const status = statusOfEvent(event.type)
  const id = event.data?.email_id
  if (status && id) {
    const detail = event.data?.bounce?.message ?? event.data?.failed?.reason
    await recordDelivery(id, status, detail, event.created_at ? new Date(event.created_at) : new Date())
  }
  return Response.json({ ok: true })
}
