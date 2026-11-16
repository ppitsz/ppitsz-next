"use client"

import { useState, useTransition } from "react"
import { EnvelopeSimpleIcon } from "@phosphor-icons/react"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@ppitsz/ui/components/alert-dialog"
import { Button } from "@ppitsz/ui/components/button"
import { notify } from "@ppitsz/ui/components/sonner"
import { cancelOwnAction, resendOwnAction } from "@/lib/actions/respond"

/** Re-sends the ticket or the link to the response's email. */
export function ResendButton({ token }: { token: string }) {
  const [pending, start] = useTransition()
  return (
    <Button
      loading={pending}
      onClick={() =>
        start(async () => {
          const result = await resendOwnAction(token)
          if (result.error) notify.danger(result.error)
          else if (result.message) notify.success(result.message)
        })
      }
    >
      <EnvelopeSimpleIcon aria-hidden />
      {pending ? "Sending…" : "Send to my email again"}
    </Button>
  )
}

/** Cancels a free ticket (or withdraws a response), after asking. */
export function CancelOwnButton({ token, ticket }: { token: string; ticket: boolean }) {
  const [open, setOpen] = useState(false)
  const [pending, start] = useTransition()
  const noun = ticket ? "ticket" : "answers"
  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger render={<Button variant="quiet" />}>{ticket ? "Cancel ticket" : "Withdraw answers"}</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{ticket ? "Cancel this ticket?" : "Withdraw these answers?"}</AlertDialogTitle>
          <AlertDialogDescription>
            {ticket
              ? "Your place opens up for someone else, and this QR code stops working. If you change your mind, sign up again while there's room."
              : "Your answers won't count anymore. You can fill in the form again while it's open."}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Keep it</AlertDialogCancel>
          <AlertDialogAction
            loading={pending}
            onClick={() =>
              start(async () => {
                const result = await cancelOwnAction(token)
                if (result.error) notify.danger(result.error)
                else {
                  notify.success(ticket ? "Ticket canceled." : "Answers withdrawn.")
                  setOpen(false)
                }
              })
            }
          >
            {pending ? "Canceling…" : ticket ? "Yes, cancel the ticket" : "Yes, withdraw them"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
