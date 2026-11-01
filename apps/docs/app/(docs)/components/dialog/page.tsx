import type { Metadata } from "next"
import Image from "next/image"

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
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@ppitsz/ui/components/dialog"
import { Field, FieldLabel } from "@ppitsz/ui/components/field"
import { Textarea } from "@ppitsz/ui/components/textarea"
import { DocPage, DocSection, Prose, SpecTable } from "@/components/docs/doc-page"
import { DoDont } from "@/components/docs/do-dont"
import { Example } from "@/components/docs/example"

export const metadata: Metadata = { title: "Dialog" }

const SECTIONS = [
  { id: "dialog", label: "Dialog" },
  { id: "destructive", label: "Destructive confirmation" },
  { id: "photo", label: "Photo viewer" },
  { id: "rules", label: "Rules" },
]

export default function DialogPage() {
  return (
    <DocPage
      href="/components/dialog"
      kicker="Components · shadcn dialog, alert-dialog"
      title="Dialog"
      lede="A soft panel on surface-raised over a plain backdrop with no blur. It fades and rises 8px as it opens and closes instantly. Base UI traps focus and returns it to the trigger."
      sections={SECTIONS}
    >
      <DocSection
        id="dialog"
        title="Dialog"
        intro={<p>Title and close button, a body that scrolls when long, then actions: secondary first, then primary, stacked full-width on phones. Form dialogs pass <code>disablePointerDismissal</code>, so a stray click on the backdrop never loses what was typed.</p>}
      >
        <Example
          code={`<Dialog disablePointerDismissal>
  <DialogTrigger render={<Button />}>Write a note</DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Note for the interviewer</DialogTitle>
      <DialogDescription>…</DialogDescription>
    </DialogHeader>
    <DialogBody>…</DialogBody>
    <DialogFooter showCloseButton>
      <Button variant="primary">Save</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>`}
        >
          <Dialog disablePointerDismissal>
            <DialogTrigger render={<Button />}>Write a note</DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Note for the interviewer</DialogTitle>
                <DialogDescription>Only the oprec panitia can see it.</DialogDescription>
              </DialogHeader>
              <DialogBody>
                <Field>
                  <FieldLabel htmlFor="dlg-note">Note</FieldLabel>
                  <Textarea id="dlg-note" />
                </Field>
              </DialogBody>
              <DialogFooter showCloseButton>
                <Button variant="primary">Save</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </Example>
      </DocSection>

      <DocSection
        id="destructive"
        title="Destructive confirmation"
        intro={<p>Pairs a danger action that names what it does with “Cancel”. Initial focus lands on “Cancel”. While the action is loading, guard <code>onOpenChange</code> so Esc and the backdrop are ignored.</p>}
      >
        <Example
          code={`<AlertDialog>
  <AlertDialogTrigger render={<Button variant="danger" />}>Reject applicant</AlertDialogTrigger>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>Reject Raka Pratama?</AlertDialogTitle>
      <AlertDialogDescription>…</AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>Cancel</AlertDialogCancel>
      <AlertDialogAction>Reject applicant</AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>`}
        >
          <AlertDialog>
            <AlertDialogTrigger render={<Button variant="danger" />}>Reject applicant</AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Reject Raka Pratama?</AlertDialogTitle>
                <AlertDialogDescription>
                  The applicant gets a “Not selected” email and their oprec route stops at the
                  interview stage. This can't be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction>Reject applicant</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </Example>
      </DocSection>

      <DocSection id="photo" title="Photo viewer" intro={<p>The gallery (L7) opens a photo in a large dialog with its caption.</p>}>
        <Example code={`<DialogContent size="lg">…</DialogContent>`}>
          <Dialog>
            <DialogTrigger
              render={<button type="button" className="block w-56 overflow-hidden rounded-lg" />}
              aria-label="Open photo: beach trip"
            >
              <Image src="/samples/event-1.webp" alt="" width={2456} height={1842} sizes="14rem" className="aspect-[3/2] w-full object-cover" />
            </DialogTrigger>
            <DialogContent size="lg">
              <DialogHeader>
                <DialogTitle>Beach trip</DialogTitle>
              </DialogHeader>
              <figure className="flex flex-col gap-3">
                <Image
                  src="/samples/event-1.webp"
                  alt="Dozens of PPIT Shenzhen members in a group photo on the beach in the late afternoon."
                  width={2456}
                  height={1842}
                  sizes="(min-width: 1024px) 64rem, 100vw"
                  className="max-h-[65dvh] w-full rounded-lg object-contain"
                />
                <figcaption className="type-caption text-muted">A group outing. Photo: Media Kreatif division (sample caption).</figcaption>
              </figure>
            </DialogContent>
          </Dialog>
        </Example>
      </DocSection>

      <DocSection id="rules" title="Rules">
        <SpecTable
          head={["Size", "Use"]}
          rows={[
            [<code key="s">sm</code>, "Confirmations, the WeChat QR"],
            [<code key="s">md</code>, "Default, short forms"],
            [<code key="s">lg</code>, "Photo viewer"],
            [<code key="s">full</code>, "The mobile menu"],
          ]}
        />
        <Prose>
          <ul>
            <li>Close with Esc, the close button or Cancel. A backdrop click closes non-form dialogs only.</li>
            <li>Never open a dialog on page load. Never stack dialogs.</li>
          </ul>
        </Prose>
        <DoDont
          dont={<p>“OK / Cancel” on a destructive confirmation.</p>}
          doThis={<p>“Cancel” and an action that names itself: “Reject applicant”, “Delete event”.</p>}
        />
      </DocSection>
    </DocPage>
  )
}
