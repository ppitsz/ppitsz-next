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

/*
 * A WeChat Pay or Alipay transfer has a transaction number in the payment's
 * details (WeChat 交易单号 or 转账单号, Alipay 订单号): a long run of digits.
 * A proof for those methods carries its last 6 digits, the main way we
 * find the transfer in the receiving account's bills; the screenshot is the
 * backup. A bank transfer needs none.
 */

/** Methods whose proof must carry the transaction number's last digits. */
export const TRANSACTION_DIGITS_METHODS: readonly PaymentMethod[] = ["wechat", "alipay"]

/** How many of the transaction number's last digits a proof carries. */
export const TRANSACTION_DIGITS_LENGTH = 6

/** A whole transaction number, pasted instead of its end. */
const FULL_TRANSACTION_NUMBER = /^\d{16,40}$/

export function needsTransactionDigits(method: PaymentMethod) {
  return TRANSACTION_DIGITS_METHODS.includes(method)
}

/**
 * The last 6 digits of the transaction number a proof to `account` carries,
 * or undefined for a method that takes none. Spaces and dashes are dropped,
 * and a whole pasted number is cut to its end. Throws INVALID_TRANSACTION_DIGITS.
 */
export function proofTransactionDigits(account: PaymentAccount, raw: string | undefined): string | undefined {
  if (!needsTransactionDigits(account.method)) return undefined
  const digits = (raw ?? "").replace(/[\s-]/g, "")
  if (/^\d{6}$/.test(digits)) return digits
  if (FULL_TRANSACTION_NUMBER.test(digits)) return digits.slice(-TRANSACTION_DIGITS_LENGTH)
  throw new ShopError("INVALID_TRANSACTION_DIGITS")
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
