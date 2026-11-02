"use client"

import { NativeSelect, NativeSelectOption } from "@ppitsz/ui/components/native-select"

interface PickVariant {
  id: string
  label: string
}

interface PickComponent<V extends PickVariant> {
  name: string
  qty: number
  variants: V[]
}

/** The first variant of each component that still has `qty` left, or its first variant. */
export function defaultPicks<V extends PickVariant>(
  components: PickComponent<V>[],
  leftOf: (variant: V, component: number) => number
) {
  return components.map((c, i) => (c.variants.find((v) => leftOf(v, i) >= c.qty) ?? c.variants[0])!.id)
}

/**
 * One select per component of a bundle that has options (a size, a flavor).
 * Components without options need no choice and show nothing.
 */
export function BundlePicks<V extends PickVariant>({
  idPrefix,
  components,
  picks,
  onChange,
  leftOf,
}: {
  idPrefix: string
  components: PickComponent<V>[]
  picks: string[]
  onChange: (picks: string[]) => void
  /** What a variant of component `component` has left where it is sold, to mark sold-out options. */
  leftOf: (variant: V, component: number) => number
}) {
  return (
    <>
      {components.map((component, i) => {
        if (component.variants.length < 2) return null
        const id = `${idPrefix}-${i}`
        return (
          <div key={i} className="flex min-w-40 flex-1 flex-col gap-1.5">
            <label htmlFor={id} className="type-ui text-text">
              {component.qty > 1 ? `${component.qty}× ` : ""}
              {component.name}
            </label>
            <NativeSelect
              id={id}
              size="sm"
              value={picks[i]}
              onChange={(e) => onChange(picks.map((p, j) => (j === i ? e.target.value : p)))}
            >
              {component.variants.map((v) => (
                <NativeSelectOption key={v.id} value={v.id}>
                  {v.label}
                  {leftOf(v, i) < component.qty ? " · sold out" : ""}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </div>
        )
      })}
    </>
  )
}
