import { after } from "next/server"

import { isFormError } from "../domain/errors"
import { toShenzhenInput } from "../shenzhen-time"

/*
 * Error alerts. Unexpected server errors (bugs, Firebase outages) are posted
 * to a group chat through ALERT_WEBHOOK_URL, so IT hears about a failing
 * registration during the rush, not after it. Expected refusals (full,
 * closed) are not errors and never alert.
 *
 * The URL decides the format: Feishu/Lark, WeCom (企业微信), Discord, Slack,
 * Telegram (bot sendMessage URL with ?chat_id=), or anything else that takes
 * {"text": "..."}. Every message starts with "PPITSZ Forms", for chat bots that
 * only accept messages containing a keyword.
 */

/** The same error is sent at most once per window per server instance; repeats are counted. */
const THROTTLE_MS = 10 * 60_000
const MAX_TEXT = 1800

/** The JSON body `url`'s service expects for a plain text message. */
export function alertPayload(url: string, text: string): unknown {
  const { hostname, searchParams } = new URL(url)
  if (hostname.endsWith("feishu.cn") || hostname.endsWith("larksuite.com")) {
    return { msg_type: "text", content: { text } }
  }
  if (hostname === "qyapi.weixin.qq.com") return { msgtype: "text", text: { content: text } }
  if (hostname.endsWith("discord.com") || hostname.endsWith("discordapp.com")) return { content: text }
  if (hostname === "api.telegram.org") return { chat_id: searchParams.get("chat_id"), text }
  return { text }
}

/**
 * Decides which errors to send: one per key per window. Returns how many
 * were held back since the last one sent, or null to hold this one back.
 */
export function createThrottle(windowMs = THROTTLE_MS) {
  const seen = new Map<string, { sentAt: number; held: number }>()
  return (key: string, now: number): number | null => {
    const entry = seen.get(key)
    if (entry && now - entry.sentAt < windowMs) {
      entry.held++
      return null
    }
    seen.set(key, { sentAt: now, held: 0 })
    if (seen.size > 200) seen.delete(seen.keys().next().value!)
    return entry?.held ?? 0
  }
}

const throttle = createThrottle()

/** Posts `text` to the webhook. False when no webhook is set or the post failed; never throws. */
export async function sendAlert(text: string): Promise<boolean> {
  const url = process.env.ALERT_WEBHOOK_URL
  if (!url) return false
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(alertPayload(url, text.slice(0, MAX_TEXT))),
      signal: AbortSignal.timeout(5000),
    })
    if (!res.ok) console.error(`Alert webhook answered ${res.status}`)
    return res.ok
  } catch (error) {
    console.error("Alert webhook failed", error)
    return false
  }
}

/** Errors that are part of normal control flow, not bugs. */
function isExpected(error: unknown) {
  if (isFormError(error)) return true
  const digest = typeof error === "object" && error !== null && "digest" in error ? String(error.digest) : ""
  return digest.startsWith("NEXT_") || digest === "DYNAMIC_SERVER_USAGE" || digest === "BAILOUT_TO_CLIENT_SIDE_RENDERING"
}

/** The alert text for `error`, or null when it shouldn't alert (expected, or sent recently). */
export function alertText(error: unknown, where: string, now = new Date()): string | null {
  if (isExpected(error)) return null
  const err = error instanceof Error ? error : new Error(String(error))
  const held = throttle(`${where}|${err.message.slice(0, 120)}`, now.getTime())
  if (held === null) return null
  const digest = "digest" in err && err.digest ? ` (code ${String(err.digest)})` : ""
  const env = process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "development"
  return [
    `PPITSZ Forms: server error${digest}`,
    `Where: ${where}`,
    `Message: ${err.message}`,
    `Time: ${toShenzhenInput(now).replace("T", " ")} Shenzhen time · ${env}`,
    held > 0 ? `The same error happened ${held} more times since the last alert.` : "",
    (err.stack ?? "").split("\n").slice(1, 5).join("\n"),
  ]
    .filter(Boolean)
    .join("\n")
}

/**
 * Logs an unexpected error and sends it to the webhook after the response,
 * so the responder or an organizer never waits for the chat.
 */
export function reportError(error: unknown, where: string) {
  console.error(error)
  const text = alertText(error, where)
  if (!text) return
  try {
    after(() => sendAlert(text))
  } catch {
    // Outside a request (a script, a test): send without waiting.
    void sendAlert(text)
  }
}
