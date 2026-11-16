/** Roles and their names on screen. No server imports, so client components may use it too. */

export const SHOP_ROLES = ["admin", "booth"] as const
export type ShopRole = (typeof SHOP_ROLES)[number]

export const SHOP_ROLE_LABELS: Record<ShopRole, string> = {
  admin: "Shop admin",
  booth: "Booth staff",
}

export const isShopRole = (value: unknown): value is ShopRole =>
  typeof value === "string" && (SHOP_ROLES as readonly string[]).includes(value)

/** The app each role belongs to, as the change log names it. */
export const ROLE_APPS = ["shop", "forms", "portal", "site"] as const
export type RoleApp = (typeof ROLE_APPS)[number]

export const ROLE_APP_LABELS: Record<RoleApp, string> = {
  shop: "Shop",
  forms: "Form admin",
  portal: "Portal admin",
  site: "Website admin",
}

/** One role's value in the change log: a shop role, "admin" for the other apps, or null for none. */
export function roleLabel(app: RoleApp, role: string | null) {
  if (role === null) return "None"
  if (app === "shop") return isShopRole(role) ? SHOP_ROLE_LABELS[role] : role
  return "Yes"
}
