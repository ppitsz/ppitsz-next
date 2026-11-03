import { avatarResponse } from "@ppitsz/accounts/avatar"

/*
 * Avatars, streamed from Firebase Storage through our own domain so they load
 * in China without a VPN (ADR 0009). Every app serves them, so a header never
 * depends on another app being up.
 */
export async function GET(_request: Request, ctx: RouteContext<"/avatars/[...path]">) {
  const { path } = await ctx.params
  return avatarResponse(path)
}
