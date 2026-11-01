import type { Metadata } from "next"

import { Alert, AlertDescription, AlertTitle } from "@ppitsz/ui/components/alert"
import { Badge } from "@ppitsz/ui/components/badge"
import { Button } from "@ppitsz/ui/components/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardKicker,
  CardLink,
  CardTitle,
} from "@ppitsz/ui/components/card"
import { Field, FieldLabel } from "@ppitsz/ui/components/field"
import { Input } from "@ppitsz/ui/components/input"
import { StatusBadge } from "@ppitsz/ui/components/status-badge"
import { DocPage, DocSection, Prose } from "@/components/docs/doc-page"
import { DoDont } from "@/components/docs/do-dont"
import { Example } from "@/components/docs/example"

export const metadata: Metadata = { title: "Card and notice" }

const SECTIONS = [
  { id: "panels", label: "Filled and outline" },
  { id: "link", label: "Link card" },
  { id: "notice", label: "Notice" },
  { id: "rules", label: "Rules" },
]

export default function CardPage() {
  return (
    <DocPage
      href="/components/card"
      kicker="Components · shadcn card, alert"
      title="Card and notice"
      lede="A contained soft panel, for forms, login, notices, the event registration panel, the Forms list and admin. Events, articles and members are never cards; they are rows and portraits."
      sections={SECTIONS}
    >
      <DocSection id="panels" title="Filled and outline">
        <Example
          layout="block"
          code={`<Card>
  <CardHeader>
    <CardKicker>Registration</CardKicker>
    <CardTitle>Shenzhen Cup 2026</CardTitle>
    <CardDescription>Closes November 7, 23:59</CardDescription>
  </CardHeader>
  <CardContent>…</CardContent>
  <CardFooter><Button variant="primary">Register</Button></CardFooter>
</Card>`}
        >
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardKicker>Registration</CardKicker>
                <CardTitle>Shenzhen Cup 2026</CardTitle>
                <CardDescription>Closes November 7, 23:59 Shenzhen time.</CardDescription>
              </CardHeader>
              <CardContent>
                <Field>
                  <FieldLabel htmlFor="card-team">Team name</FieldLabel>
                  <Input id="card-team" />
                </Field>
              </CardContent>
              <CardFooter>
                <Button variant="primary">Register</Button>
              </CardFooter>
            </Card>
            <Card variant="outline">
              <CardHeader>
                <CardTitle>Sign in</CardTitle>
                <CardDescription>Use the campus email you registered with.</CardDescription>
              </CardHeader>
              <CardContent>
                <Field>
                  <FieldLabel htmlFor="card-email">Campus email</FieldLabel>
                  <Input id="card-email" type="email" autoComplete="email" />
                </Field>
              </CardContent>
              <CardFooter>
                <Button>Send sign-in link</Button>
              </CardFooter>
            </Card>
          </div>
        </Example>
      </DocSection>

      <DocSection
        id="link"
        title="Link card"
        intro={<p>The whole card is clickable through its title link, stretched over it; the focus ring moves to the card. Buttons inside sit above the stretched link. Closed forms render as a plain outline card with no link and a “Closed” badge.</p>}
      >
        <Example
          layout="block"
          code={`<Card variant="link">
  <CardHeader>
    <CardTitle><CardLink as={NextLink} href="/forms/census">Member census 2026</CardLink></CardTitle>
  </CardHeader>
</Card>`}
        >
          <div className="grid gap-4 md:grid-cols-2">
            <Card variant="link">
              <CardHeader>
                <StatusBadge domain="form" value="open" />
                <CardTitle>
                  <CardLink href="#link">Member census 2026</CardLink>
                </CardTitle>
                <CardDescription>Five minutes. Open until October 31.</CardDescription>
              </CardHeader>
            </Card>
            <Card variant="outline">
              <CardHeader>
                <Badge variant="neutral">Closed</Badge>
                <CardTitle>Event feedback survey</CardTitle>
                <CardDescription>Closed September 30.</CardDescription>
              </CardHeader>
            </Card>
          </div>
        </Example>
      </DocSection>

      <DocSection
        id="notice"
        title="Notice"
        intro={<p>A status-tinted fill, a thick leading edge, the status icon and a message. Tones: info (ink), success, warning, danger. Notices that appear after an action pass <code>live</code>: info and success become <code>role=&quot;status&quot;</code>, warning and danger <code>role=&quot;alert&quot;</code>.</p>}
      >
        <Example
          layout="stack"
          code={`<Alert variant="warning">
  <AlertTitle>Interview slot not chosen yet</AlertTitle>
  <AlertDescription>Choose one before September 18, 23:59.</AlertDescription>
</Alert>`}
        >
          <Alert>
            <AlertTitle>Oprec 2026/2027 is open until September 30.</AlertTitle>
          </Alert>
          <Alert variant="success">
            <AlertTitle>We've received your written test</AlertTitle>
            <AlertDescription>Results come out September 18.</AlertDescription>
          </Alert>
          <Alert variant="warning">
            <AlertTitle>Interview slot not chosen yet</AlertTitle>
            <AlertDescription>Choose one before September 18, 23:59 Shenzhen time.</AlertDescription>
          </Alert>
          <Alert variant="danger">
            <AlertTitle>The file couldn't be uploaded</AlertTitle>
            <AlertDescription>It's larger than 10 MB. Compress it, then <a href="#notice">try again</a>.</AlertDescription>
          </Alert>
        </Example>
      </DocSection>

      <DocSection id="rules" title="Rules">
        <DoDont
          dont={<p>A grid of identical rounded cards, each with an icon on top.</p>}
          doThis={<p>Departure-board rows for events, portraits under division lines for members, a lead plus rows for articles.</p>}
        />
        <Prose>
          <ul>
            <li>Single column, or at most two side by side. Never three or more identical cards in a row on public pages.</li>
            <li>Never an icon above a card title. Never nest cards.</li>
            <li>Loading is a static <code>surface</code> skeleton of the same shape.</li>
          </ul>
        </Prose>
      </DocSection>
    </DocPage>
  )
}
