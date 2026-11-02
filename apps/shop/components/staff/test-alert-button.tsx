"use client"

import { useTransition } from "react"

import { Button } from "@ppitsz/ui/components/button"
import { notify } from "@ppitsz/ui/components/sonner"
import { sendTestAlertAction } from "@/lib/actions/admin"

/** Sends a test message through the alert webhook. */
export function TestAlertButton() {
  const [sending, startSend] = useTransition()

  function send() {
    startSend(async () => {
      const result = await sendTestAlertAction()
      if (result.error) notify.danger(result.error)
      else notify.success("Test sent. Check the chat group.")
    })
  }

  return (
    <Button className="self-start" loading={sending} onClick={send}>
      {sending ? "Sending…" : "Send test"}
    </Button>
  )
}
