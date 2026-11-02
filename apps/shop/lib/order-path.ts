/** The buyer's page for an order. The token in it is the only key. */
export function orderPath(token: string) {
  return `/orders/${token}`
}
