"use client"

import * as React from "react"
import { WechatLogoIcon } from "@phosphor-icons/react"

import { Button } from "@ppitsz/ui/components/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@ppitsz/ui/components/dialog"

/**
 * The footer's WeChat button: opens the official account's QR code, for
 * families and partners in China. A surface placeholder holds the space
 * while the image loads.
 */
function WeChatDialog({
  qrSrc,
  label = "WeChat",
  title = "PPIT Shenzhen on WeChat",
  description = "Scan this QR code with WeChat to follow our official account.",
  qrAlt = "QR code for the PPIT Shenzhen WeChat account",
}: {
  qrSrc: string
  label?: string
  title?: string
  description?: string
  qrAlt?: string
}) {
  const [loaded, setLoaded] = React.useState(false)
  return (
    <Dialog>
      <DialogTrigger render={<Button variant="quiet" className="-ms-3 justify-start" />}>
        <WechatLogoIcon aria-hidden />
        {label}
      </DialogTrigger>
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="relative mx-auto aspect-square w-full max-w-64 overflow-hidden rounded-xl bg-surface">
          {/* QR codes need a white quiet zone in every theme */}
          <img
            src={qrSrc}
            alt={qrAlt}
            onLoad={() => setLoaded(true)}
            className="size-full bg-white object-contain p-3 data-[loaded=false]:opacity-0"
            data-loaded={loaded}
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}

export { WeChatDialog }
