"use client"

import { useId, useTransition } from "react"

import { NativeSelect, NativeSelectOption } from "@ppitsz/ui/components/native-select"
import { notify } from "@ppitsz/ui/components/sonner"
import { STATUSES } from "@ppitsz/ui/lib/network"
import { pickCampaignAction } from "@/lib/actions/staff"
import type { CampaignStatus } from "@/lib/domain/types"

/**
 * Which campaign Register, Products, Recap and Settings work on, remembered on
 * this device. With one campaign to choose from, just its name.
 */
export function CampaignSwitcher({
  campaigns,
  currentId,
}: {
  campaigns: { id: string; name: string; status: CampaignStatus }[]
  currentId: string
}) {
  const id = useId()
  const [switching, startSwitch] = useTransition()
  const current = campaigns.find((c) => c.id === currentId)

  if (campaigns.length < 2) {
    return <p className="type-kicker text-accent-text">{current?.name}</p>
  }

  function pick(next: string) {
    startSwitch(async () => {
      const result = await pickCampaignAction(next)
      if (result.error) notify.danger(result.error)
    })
  }

  return (
    <div className="flex max-w-sm flex-col gap-1.5">
      <label htmlFor={id} className="type-kicker text-accent-text">
        Campaign
      </label>
      <NativeSelect id={id} value={currentId} disabled={switching} onChange={(e) => pick(e.target.value)}>
        {campaigns.map((c) => (
          <NativeSelectOption key={c.id} value={c.id}>
            {c.status === "open" ? c.name : `${c.name} (${STATUSES.campaign[c.status].label})`}
          </NativeSelectOption>
        ))}
      </NativeSelect>
    </div>
  )
}
