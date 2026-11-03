"use client"

/*
 * Client-side demos used by the docs pages. Each one shows a behavior the
 * design system defines (loading, filtering, toasts, error summaries, motion).
 */

import * as React from "react"
import { ArrowRightIcon } from "@phosphor-icons/react"

import { Button } from "@ppitsz/ui/components/button"
import { FilterChip, FilterChipGroup } from "@ppitsz/ui/components/toggle"
import { notify } from "@ppitsz/ui/components/sonner"
import { Input } from "@ppitsz/ui/components/input"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@ppitsz/ui/components/field"
import { Alert, AlertDescription, AlertTitle } from "@ppitsz/ui/components/alert"
import { RouteTracker } from "@ppitsz/ui/components/network/route-tracker"
import { Route, Station } from "@ppitsz/ui/components/network/route"
import { LineBadge } from "@ppitsz/ui/components/network/line-badge"
import { ProfileMenu } from "@ppitsz/ui/components/blocks/profile-menu"
import {
  Ticket,
  TicketBody,
  TicketCode,
  TicketHeader,
  TicketStub,
  TicketTitle,
} from "@ppitsz/ui/components/blocks/ticket"
import { DIVISIONS, type LineCode } from "@ppitsz/ui/lib/network"
import { NativeSelect, NativeSelectOption } from "@ppitsz/ui/components/native-select"

/** "Send" → "Sending…" with a spinner; presses are ignored while busy. */
export function LoadingButtonDemo() {
  const [loading, setLoading] = React.useState(false)
  return (
    <Button
      variant="primary"
      loading={loading}
      onClick={() => {
        setLoading(true)
        window.setTimeout(() => setLoading(false), 2000)
      }}
    >
      {loading ? "Sending…" : "Send"}
    </Button>
  )
}

const CATEGORIES = ["Sports", "Culture", "Careers", "Academics", "Food"]

export function FilterChipsDemo() {
  const [selected, setSelected] = React.useState<string[]>(["Sports"])
  return (
    <div className="flex flex-col gap-4">
      <FilterChipGroup aria-label="Filter event categories">
        {CATEGORIES.map((category) => (
          <FilterChip
            key={category}
            pressed={selected.includes(category)}
            onPressedChange={(pressed) =>
              setSelected((current) =>
                pressed ? [...current, category] : current.filter((c) => c !== category)
              )
            }
          >
            {category}
          </FilterChip>
        ))}
      </FilterChipGroup>
      <p role="status" className="type-body-sm text-muted">
        {selected.length === 0
          ? "Showing all events."
          : `Showing: ${selected.join(", ")}.`}
      </p>
    </div>
  )
}

export function LineFilterDemo() {
  const [selected, setSelected] = React.useState<LineCode[]>(["humas", "medkref"])
  return (
    <FilterChipGroup aria-label="Filter divisions">
      {DIVISIONS.slice(1, 6).map((division) => (
        <FilterChip
          key={division.code}
          pressed={selected.includes(division.code)}
          onPressedChange={(pressed) =>
            setSelected((current) =>
              pressed
                ? [...current, division.code]
                : current.filter((c) => c !== division.code)
            )
          }
        >
          <LineBadge code={division.code} />
        </FilterChip>
      ))}
    </FilterChipGroup>
  )
}

export function ToastDemo() {
  return (
    <div className="flex flex-wrap gap-3">
      <Button onClick={() => notify.success("Form sent", { description: "We'll let you know by email." })}>
        Success
      </Button>
      <Button onClick={() => notify.info("Interview schedule updated")}>Info</Button>
      <Button
        onClick={() =>
          notify.warning("Almost fully booked", {
            description: "4 places left for Shenzhen Cup.",
          })
        }
      >
        Warning
      </Button>
      <Button
        onClick={() =>
          notify.danger("Upload failed", {
            description: "The file is larger than 10 MB. Compress it, then try again.",
          })
        }
      >
        Failed
      </Button>
      <Button
        onClick={() =>
          notify.success("Applicant rejected", {
            action: { label: "Undo", onClick: () => notify.info("Rejection undone") },
          })
        }
      >
        With an action
      </Button>
    </div>
  )
}

/** The failed-submit flow: an error summary that takes focus. */
export function FormErrorDemo() {
  const [errors, setErrors] = React.useState<{ studentId?: string; email?: string }>({})
  const summaryRef = React.useRef<HTMLDivElement>(null)
  const hasErrors = Object.keys(errors).length > 0

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const next: typeof errors = {}
    if (!/^\d{9}$/.test(String(data.get("studentId") ?? ""))) {
      next.studentId = "Enter your 9-digit student ID without spaces."
    }
    if (!/\.edu\.cn$/.test(String(data.get("email") ?? ""))) {
      next.email = "Enter your campus email, ending in .edu.cn."
    }
    setErrors(next)
    if (Object.keys(next).length > 0) {
      requestAnimationFrame(() => summaryRef.current?.focus())
    } else {
      notify.success("Form sent")
    }
  }

  return (
    <form noValidate onSubmit={onSubmit} className="flex w-full max-w-md flex-col gap-6">
      {hasErrors && (
        <div ref={summaryRef} tabIndex={-1}>
          <Alert variant="danger" live>
            <AlertTitle>Check these {Object.keys(errors).length} answers</AlertTitle>
            <AlertDescription>
              <ul className="flex list-disc flex-col gap-1 ps-5">
                {errors.studentId && (
                  <li>
                    <a href="#demo-student-id">{errors.studentId}</a>
                  </li>
                )}
                {errors.email && (
                  <li>
                    <a href="#demo-email">{errors.email}</a>
                  </li>
                )}
              </ul>
            </AlertDescription>
          </Alert>
        </div>
      )}
      <FieldGroup>
        <Field data-invalid={!!errors.studentId || undefined}>
          <FieldLabel htmlFor="demo-student-id">Student ID</FieldLabel>
          <Input
            id="demo-student-id"
            name="studentId"
            inputMode="numeric"
            autoComplete="off"
            placeholder="123456789"
            aria-invalid={!!errors.studentId || undefined}
            aria-describedby={errors.studentId ? "demo-student-id-help demo-student-id-error" : "demo-student-id-help"}
          />
          <FieldDescription id="demo-student-id-help">The number on your student card.</FieldDescription>
          {errors.studentId && <FieldError id="demo-student-id-error">{errors.studentId}</FieldError>}
        </Field>
        <Field data-invalid={!!errors.email || undefined}>
          <FieldLabel htmlFor="demo-email">Campus email</FieldLabel>
          <Input
            id="demo-email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="name@link.cuhk.edu.cn"
            aria-invalid={!!errors.email || undefined}
            aria-describedby={errors.email ? "demo-email-error" : undefined}
          />
          {errors.email && <FieldError id="demo-email-error">{errors.email}</FieldError>}
        </Field>
      </FieldGroup>
      <Button variant="primary" type="submit" className="self-start">
        Send
      </Button>
    </form>
  )
}

const TRACKER_STATES = {
  progress: "In progress",
  rejected: "Not selected",
  accepted: "Accepted",
} as const

export function RouteTrackerDemo() {
  const [state, setState] = React.useState<keyof typeof TRACKER_STATES>("progress")
  const [selected, setSelected] = React.useState(2)
  const stages = [
    { label: "Online form", note: "Submitted · Sep 12" },
    { label: "Written test", note: "Passed · Sep 16" },
    {
      label: "Interview",
      note:
        state === "progress"
          ? "Choose an interview slot before Sep 18"
          : state === "rejected"
            ? "Thanks for coming · Sep 20"
            : "Done · Sep 20",
    },
    { label: "Results", date: "Sep 27", note: state === "accepted" ? "Sep 27" : undefined },
  ]
  return (
    <div className="flex w-full flex-col gap-8">
      <div className="flex flex-wrap items-center gap-3">
        <label htmlFor="tracker-state" className="type-ui text-text">
          Sample status
        </label>
        <NativeSelect
          id="tracker-state"
          size="sm"
          className="w-auto"
          value={state}
          onChange={(e) => setState(e.target.value as keyof typeof TRACKER_STATES)}
        >
          {Object.entries(TRACKER_STATES).map(([value, label]) => (
            <NativeSelectOption key={value} value={value}>
              {label}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </div>
      <RouteTracker
        stages={stages}
        currentStage={state === "rejected" ? 4 : 2}
        rejectedAtStage={state === "rejected" ? 2 : undefined}
        acceptedLine={state === "accepted" ? "humas" : undefined}
        selectedStage={selected}
        onSelectStage={setSelected}
      />
      <div role="status" className="rounded-xl bg-surface p-5 type-body-sm text-text">
        The <strong>{stages[selected]?.label}</strong> stage panel shows here: test upload,
        interview booking, or results.
      </div>
    </div>
  )
}

/** Replays the dialog/popover entrance: fade plus an 8px rise. */
export function EnterDemo() {
  const [key, setKey] = React.useState(0)
  return (
    <div className="flex flex-wrap items-center gap-6">
      <Button onClick={() => setKey((k) => k + 1)}>
        Replay
        <ArrowRightIcon aria-hidden />
      </Button>
      <div
        key={key}
        className="animate-enter rounded-xl border bg-surface-raised px-5 py-4 type-body-sm text-text shadow-lg"
      >
        Floating panel: opens in 200ms, closes instantly.
      </div>
    </div>
  )
}

/** The profile menu signed in (with a photo, and with initials) and signed out. Sign out only says so. */
export function ProfileMenuDemo() {
  const signOut = () => {
    notify.info("Signed out of every app (in the apps, this is a server action).")
  }
  return (
    <div className="flex flex-wrap items-center gap-4">
      <ProfileMenu
        account={{ name: "Nadia Putri", email: "nadia@example.com", avatarUrl: "/samples/event-3.webp", role: "Admin" }}
        signInHref="#"
        accountHref="#"
        links={[{ href: "#", label: "Your orders" }]}
        signOut={signOut}
      />
      <ProfileMenu
        account={{ name: "Rizky Pratama", email: "rizky@example.com", avatarUrl: null }}
        signInHref="#"
        accountHref="#"
        signOut={signOut}
      />
      <ProfileMenu account={null} signInHref="#" accountHref="#" signOut={signOut} />
    </div>
  )
}

/** A new ticket coming out of the machine; Replay mounts it again. */
export function DispenseDemo() {
  const [key, setKey] = React.useState(0)
  return (
    <div className="flex flex-col items-start gap-6">
      <Button onClick={() => setKey((k) => k + 1)}>
        Replay
        <ArrowRightIcon aria-hidden />
      </Button>
      <Ticket key={key} dispense aria-label="Sample ticket" className="max-w-md">
        <TicketBody line="sosbud">
          <TicketHeader>
            <LineBadge code="sosbud" />
            <span className="type-sign text-muted">Regular</span>
          </TicketHeader>
          <TicketTitle as="h3">Nadia Putri</TicketTitle>
        </TicketBody>
        <TicketStub>
          <TicketCode>K7P3QX</TicketCode>
        </TicketStub>
      </Ticket>
    </div>
  )
}

/** Station state change over 200ms, as the route strip does. */
export function StationStateDemo() {
  const [step, setStep] = React.useState(1)
  const states = ["upcoming", "passed", "here"] as const
  return (
    <div className="flex flex-wrap items-center gap-6">
      <Button onClick={() => setStep((s) => (s + 1) % 3)}>Change status</Button>
      <span className="relative flex w-40 items-center">
        <Route className="absolute inset-x-0" />
        <Station state="passed" />
        <span className="flex-1" />
        <Station state={states[step]} />
      </span>
      <span className="type-sign text-muted">{states[step]}</span>
    </div>
  )
}
