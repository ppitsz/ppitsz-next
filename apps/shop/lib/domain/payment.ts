import { ShopError } from "./errors"
import type { Campaign, PaymentAccount, PaymentMethod } from "./types"

/*
 * Which of the campaign's accounts a payment went to. A proof must name one;
 * a walk-in sale names one whenever the campaign has an account for its
 * method, and cash never does.
 */

/** The account a proof was transferred to. Throws INVALID_ACCOUNT. */
export function proofAccount(campaign: Campaign, accountId: string | undefined): PaymentAccount {
  const account = campaign.paymentAccounts.find((a) => a.id === accountId)
  if (!account) throw new ShopError("INVALID_ACCOUNT")
  return account
}

/** The account a walk-in sale was paid to, or undefined for cash. Throws INVALID_ACCOUNT. */
export function saleAccount(
  campaign: Campaign,
  method: PaymentMethod,
  accountId: string | undefined
): PaymentAccount | undefined {
  if (method === "cash") {
    if (accountId) throw new ShopError("INVALID_ACCOUNT")
    return undefined
  }
  const forMethod = campaign.paymentAccounts.filter((a) => a.method === method)
  if (forMethod.length === 0 && !accountId) return undefined
  const account = forMethod.find((a) => a.id === accountId)
  if (!account) throw new ShopError("INVALID_ACCOUNT")
  return account
}
