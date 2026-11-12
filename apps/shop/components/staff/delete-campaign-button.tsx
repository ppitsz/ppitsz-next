"use client"

import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"

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
import { deleteCampaignAction } from "@/lib/actions/admin"

/** Deletes a campaign that has no orders yet, with its products and bundles. */
export function DeleteCampaignButton({ campaignId, name }: { campaignId: string; name: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [deleting, startDelete] = useTransition()

  function remove() {
    startDelete(async () => {
      const result = await deleteCampaignAction(campaignId)
      if (result.error) {
        notify.danger(result.error)
        return
      }
      setOpen(false)
      notify.success(`${name} deleted.`)
      router.refresh()
    })
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger render={<Button variant="danger" />}>Delete campaign</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete {name}?</AlertDialogTitle>
          <AlertDialogDescription>
            The campaign, its products, bundles and images are deleted. This can't be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction loading={deleting} onClick={remove}>
            {deleting ? "Deleting…" : "Delete campaign"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
