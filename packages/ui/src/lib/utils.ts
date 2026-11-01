import type { CnFunction } from "cn"
import { createCn } from "cn/config"

/** Every `type-*` text style defined in globals.css. */
export const TYPE_STYLES = [
  "display-2xl",
  "display-xl",
  "display-lg",
  "heading-lg",
  "heading-md",
  "heading-sm",
  "numeral",
  "sign",
  "kicker",
  "ui",
  "lede",
  "body-lg",
  "body",
  "body-sm",
  "caption",
] as const

export type TypeStyle = (typeof TYPE_STYLES)[number]

/**
 * Class merging for Jaringan. `type-*` classes form one group, so a
 * `className="type-caption"` override replaces a component's `type-ui`
 * instead of stacking with it.
 */
export const cn: CnFunction = createCn({
  extend: {
    classGroups: {
      "type-style": [{ type: [...TYPE_STYLES] }],
    },
  },
})
