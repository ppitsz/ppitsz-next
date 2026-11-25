"use client"

import { useState, useTransition } from "react"

import { Button } from "@ppitsz/ui/components/button"
import {
  Field,
  FieldDescription,
  FieldLabel,
} from "@ppitsz/ui/components/field"
import {
  NativeSelect,
  NativeSelectOption,
} from "@ppitsz/ui/components/native-select"
import { notify } from "@ppitsz/ui/components/sonner"
import { setPickupPointAction } from "@/lib/actions/staff"

/**
 * Moves a pickup order to another pickup point: a buyer asked to switch, or
 * the order is from before pickup points. Staff may pick any point.
 */
export function PickupPointPicker({
  orderId,
  code,
  currentId,
  points,
}: {
  orderId: string
  code: string
  /** The order's point; undefined when it has none yet. */
  currentId?: string
  /** The campaign's points, labeled with pickupPointLabel. */
  points: { id: string; label: string }[]
}) {
  const [pointId, setPointId] = useState(currentId ?? "")
  const [saving, startSave] = useTransition()

  function save() {
    startSave(async () => {
      const result = await setPickupPointAction(orderId, pointId)
      if (result.error) notify.danger(result.error)
      else
        notify.success(
          `${code} moved. Tell the buyer over WeChat; their order page shows the new point.`
        )
    })
  }

  return (
    <div className="flex flex-col gap-3">
      <Field>
        <FieldLabel htmlFor="pickup-point">
          {currentId ? "Move to another pickup point" : "Set the pickup point"}
        </FieldLabel>
        <NativeSelect
          id="pickup-point"
          value={pointId}
          onChange={(e) => setPointId(e.target.value)}
        >
          {!currentId && (
            <NativeSelectOption value="">
              Choose a pickup point
            </NativeSelectOption>
          )}
          {points.map((p) => (
            <NativeSelectOption key={p.id} value={p.id}>
              {p.label}
            </NativeSelectOption>
          ))}
        </NativeSelect>
        <FieldDescription>
          Any point can be chosen here, even one that has started or a day its
          items aren't for.
        </FieldDescription>
      </Field>
      <Button
        className="self-start"
        loading={saving}
        disabled={!pointId || pointId === currentId}
        onClick={save}
      >
        {saving ? "Saving…" : "Save pickup point"}
      </Button>
    </div>
  )
}
