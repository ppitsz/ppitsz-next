import * as React from "react"
import { InstagramLogoIcon } from "@phosphor-icons/react/ssr"

import { cn } from "@ppitsz/ui/lib/utils"
import type { CampusId, LineCode } from "@ppitsz/ui/lib/network"
import { Button } from "@ppitsz/ui/components/button"
import { CampusLabel } from "@ppitsz/ui/components/network/station-label"

/*
 * Member card. Portraits are raw photos (chest-up, 4:5) with no text
 * baked in; name, role, campus and line are live HTML. Not clickable. The
 * name is an h3 under the division's h2; photos use alt="".
 */

export interface Member {
  name: string
  role: string
  division: LineCode
  university: CampusId
  major?: string
  instagram?: string
  quote?: string
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join("")
}

function Portrait({
  member,
  media,
  className,
}: {
  member: Member
  media?: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        "relative flex aspect-[4/5] items-center justify-center overflow-hidden rounded-xl bg-surface [&_img]:size-full [&_img]:object-cover",
        className
      )}
    >
      {media ?? (
        <span aria-hidden className="type-display-lg text-muted">
          {initials(member.name)}
        </span>
      )}
    </div>
  )
}

/** The station line: a tiny station in the division color, then the campus. */
function StationLine({ member }: { member: Member }) {
  return (
    <span className="flex items-start gap-2">
      <span
        aria-hidden
        className="mt-[3px] size-3 shrink-0 rounded-full border-[3px] border-(--line) bg-(--line)"
      />
      <CampusLabel campus={member.university} />
    </span>
  )
}

function InstagramButton({ member }: { member: Member }) {
  if (!member.instagram) return null
  return (
    <Button
      variant="quiet"
      size="icon"
      nativeButton={false}
      aria-label={`Instagram ${member.name}`}
      render={
        <a
          href={`https://instagram.com/${member.instagram.replace(/^@/, "")}`}
          target="_blank"
          rel="noreferrer"
        />
      }
    >
      <InstagramLogoIcon aria-hidden />
    </Button>
  )
}

function MemberCard({
  member,
  media,
  className,
}: {
  member: Member
  /** A 4:5 portrait (e.g. next/image with alt=""). Initials show without one. */
  media?: React.ReactNode
  className?: string
}) {
  return (
    <article
      data-slot="member-card"
      data-line={member.division}
      className={cn("flex flex-col gap-4", className)}
    >
      <Portrait member={member} media={media} />
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 flex-col gap-2">
          <div className="flex flex-col gap-1">
            <h3 className="type-heading-md text-text">{member.name}</h3>
            <p className="type-ui text-muted">{member.role}</p>
          </div>
          <StationLine member={member} />
        </div>
        <InstagramButton member={member} />
      </div>
    </article>
  )
}

/** Lead variant for BPH (Ketua, Wakil): larger portrait, name, quote. */
function MemberLead({
  member,
  media,
  className,
}: {
  member: Member
  media?: React.ReactNode
  className?: string
}) {
  return (
    <article
      data-slot="member-lead"
      data-line={member.division}
      className={cn("@container", className)}
    >
      <div className="grid items-end gap-6 @xl:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] @xl:gap-10">
        <Portrait member={member} media={media} />
        <div className="flex flex-col gap-5 pb-2">
          <div className="flex flex-col gap-2">
            <p className="type-ui text-muted">{member.role}</p>
            <h3 className="type-display-lg text-text">{member.name}</h3>
          </div>
          <StationLine member={member} />
          {member.quote && (
            <blockquote className="max-w-[40ch] border-s-4 border-(--line) ps-5 type-lede text-text">
              {member.quote}
            </blockquote>
          )}
          <InstagramButton member={member} />
        </div>
      </div>
    </article>
  )
}

/** Text-only rows for large divisions or past cabinets. */
function MemberList({
  members,
  className,
}: {
  members: Member[]
  className?: string
}) {
  return (
    <ul data-slot="member-list" className={cn("flex flex-col border-t", className)}>
      {members.map((member) => (
        <li
          key={`${member.name}-${member.role}`}
          data-line={member.division}
          className="grid gap-1 border-b py-3 sm:grid-cols-[minmax(0,2fr)_minmax(0,2fr)_minmax(0,3fr)] sm:gap-4"
        >
          <h3 className="type-ui text-text">{member.name}</h3>
          <p className="type-body-sm text-muted">{member.role}</p>
          <StationLine member={member} />
        </li>
      ))}
    </ul>
  )
}

export { MemberCard, MemberLead, MemberList }
