import { describe, expect, test } from "bun:test"

import { pickupOnlyNote, orderPickupNote } from "../campaign-copy"
import { ShopError } from "./errors"
import { campaign, order } from "./fixtures"
import { bundlePickupIssue, canChangePickupPoint, pickPickupPoint, pickupPointState, sharedPickupPoints } from "./pickup"
import { byPickupPoint, pickupList } from "./recap"

/* Pickup points: several places and times, products limited to some of them. */

const c = campaign()
const [boothSat, gateSun] = c.pickupPoints as [(typeof c.pickupPoints)[0], (typeof c.pickupPoints)[0]]
const BEFORE = new Date("2027-03-12T12:00:00+08:00")
const codeOf = (fn: () => unknown) => {
  try {
    fn()
  } catch (error) {
    return (error as ShopError).code
  }
}

describe("choosing a pickup point", () => {
  test("any point that hasn't started, when nothing is limited", () => {
    expect(pickPickupPoint(c, "gate-sun", [{ name: "Kaos" }], BEFORE)).toEqual(gateSun)
    expect(pickupPointState(boothSat, boothSat.startsAt)).toBe("started")
    expect(codeOf(() => pickPickupPoint(c, "booth-sat", [], boothSat.startsAt))).toBe("PICKUP_POINT_UNAVAILABLE")
    expect(codeOf(() => pickPickupPoint(c, "gone", [], BEFORE))).toBe("PICKUP_POINT_UNAVAILABLE")
  })

  test("every item must be picked up there", () => {
    const nasi = { name: "Nasi kuning", pickupPointIds: ["booth-sat"] }
    expect(pickPickupPoint(c, "booth-sat", [nasi, { name: "Kaos" }], BEFORE)).toEqual(boothSat)
    expect(codeOf(() => pickPickupPoint(c, "gate-sun", [nasi], BEFORE))).toBe("NOT_AT_PICKUP_POINT")
    expect(() => pickPickupPoint(c, "gate-sun", [nasi], BEFORE)).toThrow("Not there: Nasi kuning.")
  })

  test("the points a cart shares: null when nothing is limited, empty when nothing fits", () => {
    expect(sharedPickupPoints([{}, { pickupPointIds: [] }])).toBeNull()
    expect(sharedPickupPoints([{ pickupPointIds: ["a", "b"] }, {}, { pickupPointIds: ["b", "c"] }])).toEqual(["b"])
    expect(sharedPickupPoints([{ pickupPointIds: ["a"] }, { pickupPointIds: ["c"] }])).toEqual([])
  })
})

describe("bundles", () => {
  const nasi = { name: "Nasi", pickupPointIds: ["booth-sat"] }
  const teh = { name: "Teh", pickupPointIds: ["gate-sun"] }

  test("products sharing no pickup point block the bundle, unless it can be delivered", () => {
    const pickupOnly = { ...c, offers: { delivery: false, pickup: true, booth: true } }
    expect(bundlePickupIssue([nasi, teh], pickupOnly)).toMatchObject({ blocks: true })
    expect(bundlePickupIssue([nasi, teh], pickupOnly)!.message).toStartWith("No pickup point has every product in this bundle (Nasi, Teh).")
    expect(bundlePickupIssue([nasi, teh], c)).toMatchObject({ blocks: false })
  })

  test("a shared point, unlimited products, or no pickup is fine", () => {
    expect(bundlePickupIssue([nasi, { name: "Kaos" }], c)).toBeNull()
    expect(bundlePickupIssue([nasi, { ...teh, pickupPointIds: ["gate-sun", "booth-sat"] }], c)).toBeNull()
    expect(bundlePickupIssue([nasi, teh], { ...c, offers: { delivery: true, pickup: false } })).toBeNull()
    // Only a point the campaign no longer has in common.
    expect(bundlePickupIssue([{ name: "Old", pickupPointIds: ["gone"] }, nasi], c)).toMatchObject({ blocks: false })
  })
})

describe("what buyers and staff read", () => {
  test("an order names its point; one from before pickup points names them all", () => {
    expect(orderPickupNote(order({ pickupPoint: gateSun }), c)).toBe("SZU south gate · Sun, Mar 14 · 12:00–14:00")
    expect(orderPickupNote(order(), c)).toBe(
      "Any of our pickup points: PPIT booth · Sat, Mar 13 · 10:00–16:00; SZU south gate · Sun, Mar 14 · 12:00–14:00"
    )
    expect(orderPickupNote(order(), { pickupPoints: [], boothInfo: "Old pickup text" })).toBe("Old pickup text")
  })

  test("a limited product says where it can be picked up", () => {
    expect(pickupOnlyNote(["gate-sun"], c.pickupPoints)).toBe("Pickup only at SZU south gate · Sun, Mar 14 · 12:00–14:00")
    expect(pickupOnlyNote(["gone"], c.pickupPoints)).toBe("Not for pickup")
  })

  test("staff move pickup orders that are still open, never delivery orders or walk-ins", () => {
    expect(canChangePickupPoint(order({ status: "paid" }))).toBe(true)
    expect(canChangePickupPoint(order({ status: "picked_up" }))).toBe(false)
    expect(canChangePickupPoint(order({ channel: "walkin" }))).toBe(false)
  })

  test("the pickup list is split by point, earliest first, orders without one last", () => {
    const paid = { status: "paid" as const }
    const entries = pickupList([
      order({ ...paid, id: "A", code: "GC-A", pickupPoint: gateSun }),
      order({ ...paid, id: "B", code: "GC-B" }),
      order({ ...paid, id: "C", code: "GC-C", pickupPoint: boothSat }),
    ])
    expect(byPickupPoint(entries).map((g) => [g.point?.id ?? null, g.entries.map((e) => e.code)])).toEqual([
      ["booth-sat", ["GC-C"]],
      ["gate-sun", ["GC-A"]],
      [null, ["GC-B"]],
    ])
  })
})
