import NextLink from "next/link"

import { formatDate, formatTime } from "@ppitsz/ui/lib/format"
import { roleLabel } from "@ppitsz/accounts/role-labels"
import type { RoleChange } from "@ppitsz/accounts/roles"

/** One change in words: "Sari made Budi Booth staff in the shop." */
function sentence(change: RoleChange, showTarget: boolean) {
  const who = showTarget ? change.target.email : "them"
  if (change.kind === "passwordReset") return `set a new password for ${who}`
  if (change.app === "shop") {
    return change.to
      ? `made ${who} ${roleLabel("shop", change.to)} in the shop${change.from ? ` (was ${roleLabel("shop", change.from)})` : ""}`
      : `removed ${who} from the shop's staff`
  }
  const role = change.app === "portal" ? "Portal admin" : "form admin"
  return change.to ? `made ${who} a ${role}` : `took away ${showTarget ? `${who}'s` : "their"} ${role} role`
}

/** The change log, newest first. `showTarget` names whose account each change was on. */
export function RoleChanges({ changes, showTarget }: { changes: RoleChange[]; showTarget: boolean }) {
  if (changes.length === 0) return <p className="type-body text-muted">No changes yet.</p>
  return (
    <ul className="flex flex-col divide-y border-y">
      {changes.map((change) => (
        <li key={change.id} className="flex flex-col gap-1 py-3">
          <p className="type-body text-text">
            {change.by.name || change.by.email}{" "}
            {showTarget ? (
              <NextLink href={`/accounts/${change.target.uid}`} className="underline-offset-4 hover:underline">
                {sentence(change, true)}
              </NextLink>
            ) : (
              sentence(change, false)
            )}
            .
          </p>
          <p className="type-caption text-muted">
            {formatDate(change.at)}, {formatTime(change.at)} Shenzhen time
          </p>
        </li>
      ))}
    </ul>
  )
}
