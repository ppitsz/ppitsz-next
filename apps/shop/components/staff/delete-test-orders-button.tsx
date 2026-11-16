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
import { deleteTestOrdersAction } from "@/lib/actions/admin"

/** Deletes a draft campaign's test orders, with their proofs, and gives their stock back. */
export function DeleteTestOrdersButton({ campaignId, count }: { campaignId: string; count: number }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [deleting, startDelete] = useTransition()
  const orders = count === 1 ? "1 test order" : `${count} test orders`

  function remove() {
    startDelete(async () => {
      const result = await deleteTestOrdersAction(campaignId)
      if (result.error) {
        notify.danger(result.error)
        return
      }
      setOpen(false)
      notify.success("Test orders deleted.")
      router.refresh()
    })
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger render={<Button variant="danger" disabled={count === 0} />}>
        Delete test orders
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete {orders}?</AlertDialogTitle>
          <AlertDialogDescription>
            Whatever their status, they're deleted with their payment proofs, and their stock goes back on sale.
            Their links stop working. This can't be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction loading={deleting} onClick={remove}>
            {deleting ? "Deleting…" : "Delete test orders"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
