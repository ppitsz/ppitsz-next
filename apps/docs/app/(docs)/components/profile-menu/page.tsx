import type { Metadata } from "next"

import { Avatar, AvatarFallback, AvatarGroup, AvatarImage } from "@ppitsz/ui/components/avatar"
import { DocPage, DocSection, Prose, SpecTable } from "@/components/docs/doc-page"
import { DoDont } from "@/components/docs/do-dont"
import { Example } from "@/components/docs/example"
import { ProfileMenuDemo } from "@/components/demos/interactive"

export const metadata: Metadata = { title: "Avatar and profile menu" }

const SECTIONS = [
  { id: "menu", label: "Profile menu" },
  { id: "avatar", label: "Avatar" },
  { id: "photos", label: "Where photos come from" },
  { id: "rules", label: "Rules" },
]

export default function ProfileMenuPage() {
  return (
    <DocPage
      href="/components/profile-menu"
      kicker="Components · avatar, profile-menu"
      title="Avatar and profile menu"
      lede="One way every app shows who is signed in: the avatar and first name in the header, opening the name, email, role, the app's own links, “Your account” and “Sign out”."
      sections={SECTIONS}
    >
      <DocSection
        id="menu"
        title="Profile menu"
        intro={
          <p>
            The header&apos;s account slot in Shop, Forms, Account and both dashboards. Signed out it
            is a “Sign in” capsule. “Your account” opens PPITSZ Account, where the photo and details
            are edited; “Sign out” signs out of every app (ADR 0008).
          </p>
        }
      >
        <Example
          lang="en"
          code={`<ProfileMenu
  account={await menuAccount()}            // from @ppitsz/accounts/avatar, in the layout
  signInHref="/sign-in"
  accountHref={accountOrigin()}
  links={[{ href: "/orders", label: "Your orders", icon: <QrCodeIcon aria-hidden /> }]}
  signOut={buyerSignOutAction}             // a server action
  linkAs={NextLink}
/>`}
        >
          <ProfileMenuDemo />
        </Example>
      </DocSection>

      <DocSection
        id="avatar"
        title="Avatar"
        intro={<p>shadcn&apos;s Avatar on Base UI, restyled: a circle with a hairline ring, the initials on surface-strong while the photo loads or when there is none. The photo is decorative; the name beside it says who it is.</p>}
      >
        <Example lang="en" code={`<Avatar size="lg">
  <AvatarImage src={avatarUrl} />
  <AvatarFallback>{initials(name)}</AvatarFallback>
</Avatar>`}>
          <Avatar size="sm"><AvatarFallback>NP</AvatarFallback></Avatar>
          <Avatar><AvatarImage src="/samples/event-3.webp" /><AvatarFallback>NP</AvatarFallback></Avatar>
          <Avatar size="lg"><AvatarFallback>RP</AvatarFallback></Avatar>
          <Avatar size="xl"><AvatarImage src="/samples/event-3.webp" /><AvatarFallback>NP</AvatarFallback></Avatar>
          <AvatarGroup>
            <Avatar><AvatarFallback>NP</AvatarFallback></Avatar>
            <Avatar><AvatarFallback>RP</AvatarFallback></Avatar>
            <Avatar><AvatarFallback>DS</AvatarFallback></Avatar>
          </AvatarGroup>
        </Example>
        <SpecTable
          head={["Size", "Where"]}
          rows={[
            ["sm, 24px", "Lists of people, avatar groups"],
            ["default, 32px", "The profile menu's capsule"],
            ["lg, 40px", "Inside the open profile menu"],
            ["xl, 96px", "The photo on the PPITSZ Account profile page"],
          ]}
        />
      </DocSection>

      <DocSection id="photos" title="Where photos come from">
        <Prose>
          <ul>
            <li>The person&apos;s own photo, chosen in PPITSZ Account; else a linked sign-in&apos;s photo (Google, later); else the initials. ADR 0009.</li>
            <li>Stored under <code>avatars/&#123;uid&#125;/</code>, a new name on every change, and served by every app at <code>/avatars/…</code> from its own domain, so they load in China.</li>
            <li>The browser shrinks a chosen photo to 512px first; the server takes JPEG, PNG or WebP up to 1 MB.</li>
          </ul>
        </Prose>
      </DocSection>

      <DocSection id="rules" title="Rules">
        <Prose>
          <ul>
            <li>One profile menu per header, in the account slot. Apps add their own links to it, never their own account control.</li>
            <li>Never an image straight from Google or another host: a linked photo is copied to our Storage first.</li>
          </ul>
        </Prose>
        <DoDont
          dont={<p>A bare “Sign out” button and a name in the header, different in every app.</p>}
          doThis={<p>The profile menu, the same everywhere, with the app&apos;s links inside.</p>}
        />
      </DocSection>
    </DocPage>
  )
}
