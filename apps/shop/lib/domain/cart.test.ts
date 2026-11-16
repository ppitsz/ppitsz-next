import { describe, expect, test } from "bun:test"

import { MAX_QTY_PER_LINE, parseCart } from "./cart"
import { ShopError, type ErrorCode } from "./errors"
import { campaign } from "./fixtures"
import { proofAccount, proofTransactionDigits, saleAccount } from "./payment"

/* What arrives from the shop and the register, and which account a payment went to. */

function code(run: () => unknown): ErrorCode | undefined {
  try {
    run()
  } catch (error) {
    expect(error).toBeInstanceOf(ShopError)
    return (error as ShopError).code
  }
  return undefined
}

describe("cart", () => {
  test("merges repeated variants and drops empty lines", () => {
    expect(
      parseCart([
        { productId: "p1", variantId: "v1", qty: 1 },
        { productId: "p1", variantId: "v1", qty: 2 },
        { productId: "p2", variantId: "v1", qty: 0 },
      ])
    ).toEqual([{ productId: "p1", variantId: "v1", qty: 3 }])
  })

  test("an empty cart is an error", () => {
    expect(code(() => parseCart([]))).toBe("EMPTY_CART")
    expect(code(() => parseCart([{ productId: "p1", variantId: "v1", qty: 0 }]))).toBe("EMPTY_CART")
  })

  test("too many of one variant is its own error, not sold out", () => {
    const line = { productId: "p1", variantId: "v1", qty: MAX_QTY_PER_LINE }
    expect(parseCart([line])[0]!.qty).toBe(MAX_QTY_PER_LINE)
    expect(code(() => parseCart([line, { ...line, qty: 1 }]))).toBe("QTY_LIMIT")
  })

  test("rejects anything that isn't a list of lines", () => {
    for (const input of [
      null,
      "[]",
      [{ productId: "p1", variantId: "v1", qty: 1.5 }],
      [{ productId: "p1", variantId: "v1", qty: -1 }],
      [{ productId: "", variantId: "v1", qty: 1 }],
      [{ productId: "p1", qty: 1 }],
      Array.from({ length: 51 }, (_, i) => ({ productId: `p${i}`, variantId: "v", qty: 1 })),
    ]) {
      expect(code(() => parseCart(input))).toBe("INVALID_CART")
    }
  })
})

describe("payment accounts", () => {
  test("a proof names one of the campaign's accounts", () => {
    expect(proofAccount(campaign(), "ali").method).toBe("alipay")
    expect(code(() => proofAccount(campaign(), undefined))).toBe("INVALID_ACCOUNT")
    expect(code(() => proofAccount(campaign(), "nope"))).toBe("INVALID_ACCOUNT")
  })

  test("a walk-in sale names its method's account; cash names none", () => {
    expect(saleAccount(campaign(), "wechat", "wx")!.id).toBe("wx")
    expect(saleAccount(campaign(), "cash", undefined)).toBeUndefined()
    expect(code(() => saleAccount(campaign(), "wechat", "ali"))).toBe("INVALID_ACCOUNT")
    expect(code(() => saleAccount(campaign(), "wechat", undefined))).toBe("INVALID_ACCOUNT")
    expect(code(() => saleAccount(campaign(), "cash", "wx"))).toBe("INVALID_ACCOUNT")
  })

  test("a WeChat Pay or Alipay proof carries the transaction number's last 6 digits", () => {
    const [wx, ali] = campaign().paymentAccounts
    expect(proofTransactionDigits(wx!, "567890")).toBe("567890")
    expect(proofTransactionDigits(ali!, " 567 890 ")).toBe("567890")
    // A whole number pasted from the app is cut to its end.
    expect(proofTransactionDigits(wx!, "4200 0012-3420 2611 1312 3456 7890")).toBe("567890")
    // Too short, a typo'd seventh digit, letters, or the order code are refused.
    for (const bad of [undefined, "", "12345", "1234567", "wxid_nadia", "GC-7K3P", "56789O", "4200001234202611131234567890x"]) {
      expect(code(() => proofTransactionDigits(wx!, bad))).toBe("INVALID_TRANSACTION_DIGITS")
    }
  })

  test("a bank transfer proof needs no transaction number", () => {
    const bank = { id: "bca", method: "bank", holder: "Nadia", detail: "BCA 123" } as const
    expect(proofTransactionDigits(bank, undefined)).toBeUndefined()
    expect(proofTransactionDigits(bank, "567890")).toBeUndefined()
  })

  test("a method without an account in the campaign needs none", () => {
    expect(saleAccount(campaign({ paymentAccounts: [] }), "alipay", undefined)).toBeUndefined()
  })
})
