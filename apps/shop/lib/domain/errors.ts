/*
 * Expected failures carry a code the UI turns into a sentence; anything else
 * is a bug and surfaces as a generic error.
 */

export const ERROR_MESSAGES = {
  NOT_FOUND: "Order not found.",
  PRODUCT_UNAVAILABLE: "This product is no longer for sale.",
  SOLD_OUT: "Not enough stock. Lower the quantity or pick another product.",
  ORDERING_NOT_OPEN: "Online ordering hasn't opened yet.",
  ORDERING_CLOSED: "Online ordering has closed.",
  EMPTY_CART: "Your cart is empty.",
  INVALID_TRANSITION: "This order's status has changed. Reload the page.",
  ORDER_EXPIRED: "The payment deadline has passed and the order was canceled automatically.",
  NOT_PAID: "This order hasn't been paid yet.",
  ALREADY_PICKED_UP: "This order has already been picked up.",
  INVALID_FILE: "Upload a JPG, PNG or WebP image, up to 4 MB.",
  TOO_MANY_UNPAID: "You still have unpaid orders. Pay for them, or wait until they're canceled automatically, before ordering again. See Your orders.",
  RATE_LIMITED: "Too many attempts. Wait a few minutes, then try again.",
  INVALID_PRODUCT: "The product details aren't right yet.",
  STOCK_BELOW_SOLD: "Stock can't be less than what's already ordered and sold.",
  VARIANT_IN_USE: "A variant that's been ordered or sold can't be deleted. Set its stock instead.",
  PRODUCT_IN_USE: "A product that's been ordered or sold can't be deleted. Take it off sale instead.",
  PRODUCT_IN_BUNDLE: "This product is in a bundle. Remove it from the bundle first, or take it off sale.",
  INVALID_BUNDLE: "The bundle details aren't right yet.",
  SALE_LOCKED: "This sale can no longer be undone at the register. Ask a shop admin.",
  NOT_ALLOWED: "Only shop admins can do this.",
  REASON_REQUIRED: "Write the reason. The buyer will read it.",
  INVALID_ACCOUNT: "Choose the account you transferred to.",
  INVALID_TRANSACTION_DIGITS: "Type the last 6 digits of your payment's transaction number.",
  INVALID_CART: "Your cart couldn't be read. Reload the page.",
  QTY_LIMIT: "That quantity is too high.",
  NICKNAME_REQUIRED: "Write a custom name for every item that takes one.",
  CAMPAIGN_CLOSED: "This campaign isn't open right now.",
  INVALID_CAMPAIGN: "The campaign settings aren't right yet.",
  CAMPAIGN_IN_USE: "A campaign with orders can't be deleted. Set its status to Ended instead.",
  ALREADY_REFUNDED: "A refund is already recorded for this order.",
  INVALID_REFUND: "The refund must be more than ¥0 and no more than the order total.",
  NO_BOOTH: "This campaign has no booth.",
  SIGN_IN_REQUIRED: "Sign in to your account to order.",
  INVALID_FEATURED: "The featured product must be from this campaign.",
  FULFILLMENT_UNAVAILABLE: "That way of receiving the order isn't available. Choose Delivery or Pickup.",
  INVALID_DELIVERY: "Fill in the address and phone number for delivery.",
  SLOT_UNAVAILABLE: "This delivery slot is full or has passed. Choose another one.",
  NOT_DELIVERY: "This order is for pickup, not delivery.",
  DELIVERY_WHOLE: "A delivery order is handed over all at once.",
  INVALID_COURIER: "Write the courier's name and the tracking number.",
} as const

export type ErrorCode = keyof typeof ERROR_MESSAGES

export class ShopError extends Error {
  readonly code: ErrorCode

  constructor(code: ErrorCode, detail?: string) {
    super(detail ? `${ERROR_MESSAGES[code]} ${detail}` : ERROR_MESSAGES[code])
    this.name = "ShopError"
    this.code = code
  }
}

export function isShopError(error: unknown): error is ShopError {
  return error instanceof ShopError
}
