"use client"

import { createContext, useCallback, useContext, useId, useState } from "react"
import { CopyIcon } from "@phosphor-icons/react"

import { Button } from "@ppitsz/ui/components/button"
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@ppitsz/ui/components/dialog"
import { Field, FieldDescription, FieldLabel } from "@ppitsz/ui/components/field"
import { notify } from "@ppitsz/ui/components/sonner"
import { Textarea } from "@ppitsz/ui/components/textarea"
import type { BuyerMessage } from "@/lib/buyer-message"

async function copy(text: string, done: string) {
  try {
    await navigator.clipboard.writeText(text)
    notify.success(done)
  } catch {
    window.prompt("Copy this text:", text)
  }
}

const ShowContext = createContext<(message: BuyerMessage) => void>(() => {})

/** Opens the dashboard's "Tell the buyer" dialog. */
export const useShowBuyerMessage = () => useContext(ShowContext)

/**
 * Holds the "Tell the buyer" dialog for the whole dashboard. It lives in the
 * layout, so it stays open when the page under it refreshes: a rejected proof
 * leaves the verification queue the moment it is rejected.
 */
export function BuyerMessageProvider({ children }: { children: React.ReactNode }) {
  const [message, setMessage] = useState<BuyerMessage | null>(null)
  const show = useCallback((next: BuyerMessage) => setMessage(next), [])
  return (
    <ShowContext.Provider value={show}>
      {children}
      <Dialog open={message !== null} onOpenChange={(open) => !open && setMessage(null)}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>Tell the buyer</DialogTitle>
            <DialogDescription>The buyer won't know until they open their order page again.</DialogDescription>
          </DialogHeader>
          <DialogBody>{message && <BuyerMessagePanel message={message} />}</DialogBody>
          <DialogFooter showCloseButton />
        </DialogContent>
      </Dialog>
    </ShowContext.Provider>
  )
}

/** A ready-made WeChat message for the buyer, with buttons to copy it and their WeChat ID. */
export function BuyerMessagePanel({ message }: { message: BuyerMessage }) {
  const id = useId()
  return (
    <Field>
      <FieldLabel htmlFor={`${id}-text`}>Message for {message.name}</FieldLabel>
      <Textarea id={`${id}-text`} readOnly rows={7} value={message.text} aria-describedby={`${id}-helper`} />
      <FieldDescription id={`${id}-helper`}>
        Send it on WeChat to <strong className="text-text">{message.wechatId}</strong>. This app
        can't message buyers itself.
      </FieldDescription>
      <div className="flex flex-wrap gap-3">
        <Button onClick={() => copy(message.text, "Message copied. Paste it into the buyer's WeChat chat.")}>
          <CopyIcon aria-hidden />
          Copy message
        </Button>
        <Button variant="quiet" onClick={() => copy(message.wechatId, "WeChat ID copied.")}>
          Copy WeChat ID
        </Button>
      </div>
    </Field>
  )
}
