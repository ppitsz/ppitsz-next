import { describe, expect, test } from "bun:test"

import { PAYMENT_METHOD_LABELS } from "../catalog"
import { csvFileName, ordersCsv, toCsv } from "./export"
import { campaign, order } from "./fixtures"

/* The recap's CSV files. */

const rowsOf = (csv: string) => csv.replace(/^﻿/, "").trimEnd().split("\r\n")

describe("CSV cells", () => {
  test("quoted, with a BOM for Excel, and names that look like formulas defused", () => {
    const csv = toCsv([["a\"b", 12, null, "=SUM(A1)", "+86 138 0000 0000", "-", "@x"]])
    expect(csv.startsWith("﻿")).toBe(true)
    expect(rowsOf(csv)).toEqual([`"a""b","12","","'=SUM(A1)","+86 138 0000 0000","-","'@x"`])
  })
})

describe("the orders file", () => {
  test("one row per item; order totals only on its first row, so a column sum counts each order once", () => {
    const o = order({
      createdAt: new Date("2027-03-10T09:05:00+08:00"),
      payment: { method: "wechat", accountId: "wx", verifiedAt: new Date("2027-03-10T10:00:00+08:00"), verifiedBy: "u1" },
    })
    const rows = rowsOf(ordersCsv(campaign(), [o], PAYMENT_METHOD_LABELS, () => "Nadia"))
    expect(rows).toHaveLength(3)
    expect(rows[1]).toStartWith(`"GC-AAAA","2027-03-10 09:05","Pickup","Paid","A","a","","a@test.test","Nasi","","","2","15.00","30.00","No","110.00","WeChat Pay","Nadia","2027-03-10 10:00","Nadia"`)
    expect(rows[2]).toContain(`"Kaos","M","","1","80.00","80.00","No","",""`)
  })

  test("a delivery order adds its fee, address, slot and courier once", () => {
    const o = order({
      status: "picked_up",
      totalFen: 11500,
      pickedUpAt: new Date("2027-03-13T16:10:00+08:00"),
      delivery: {
        address: "SZU 斋区 5栋 302",
        slot: { id: "s", startsAt: new Date("2027-03-13T15:00:00+08:00"), endsAt: new Date("2027-03-13T18:00:00+08:00"), maxOrders: null },
        feeFen: 500,
        courier: "SF Express",
        trackingNumber: "SF123",
        sentAt: new Date("2027-03-13T15:00:00+08:00"),
      },
    })
    const rows = rowsOf(ordersCsv(campaign(), [o], PAYMENT_METHOD_LABELS, () => "Nadia"))
    expect(rows[1]).toStartWith(`"GC-AAAA","1970-01-01 08:00","Delivery","Delivered"`)
    expect(rows[1]).toEndWith(`"5.00","SZU 斋区 5栋 302","2027-03-13 15:00–18:00","SF Express","SF123","2027-03-13 16:10"`)
    expect(rows[2]).toEndWith(`"","","","","",""`)
  })

  test("file names carry the campaign and the Shenzhen date", () => {
    expect(csvFileName(campaign({ name: "SZ Cup 2027" }), "orders", new Date("2027-03-16T20:00:00Z"))).toBe(
      "ppitsz-shop-sz-cup-2027-orders-2027-03-17.csv"
    )
  })
})
