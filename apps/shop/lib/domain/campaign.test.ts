import { describe, expect, test } from "bun:test"
import { readdirSync } from "node:fs"
import path from "node:path"

import { campaignPhase, checkCampaignEdit, RESERVED_SLUGS, suggestSlug, type CampaignEdit } from "./campaign"
import { campaign } from "./fixtures"

/* Several campaigns at once: URL names, code prefixes and where each stands. */

const edit = (overrides: Partial<CampaignEdit> = {}): CampaignEdit => ({
  name: "Merch SZ Cup",
  slug: "merch",
  codePrefix: "MR",
  tagline: "",
  pickupInfo: "Booth PPIT",
  onlineOpensAt: new Date(0),
  onlineClosesAt: new Date(1000),
  offers: { delivery: false, pickup: true, booth: true },
  deliveryFeeFen: 0,
  deliverySlots: [],
  paymentWindowMinutes: 120,
  sortOrder: 2,
  status: "open",
  ...overrides,
})
const gumamchan = campaign({ id: "food", name: "GumamChan", slug: "gumamchan", codePrefix: "GC" })
const fields = (e: CampaignEdit, context: Partial<Parameters<typeof checkCampaignEdit>[1]> = {}) =>
  checkCampaignEdit(e, { current: null, others: [gumamchan], hasOrders: false, ...context }).map((i) => i.field)

describe("URL names", () => {
  test("lowercase letters, digits and dashes, never a path the site uses", () => {
    expect(fields(edit())).toEqual([])
    for (const slug of ["Merch", "-merch", "merch-", "me rch", "", "orders", "staff", "media", "api", "sign-in"]) {
      expect(fields(edit({ slug }))).toEqual(["slug"])
    }
  })

  test("every top-level page of the site is reserved", () => {
    // A campaign at /[slug] would be hidden behind a page of the same name.
    const app = path.join(import.meta.dir, "../../app")
    const segments = (dir: string) =>
      readdirSync(dir, { withFileTypes: true }).flatMap((e): string[] =>
        !e.isDirectory() || e.name.startsWith("[")
          ? []
          : e.name.startsWith("(")
            ? segments(path.join(dir, e.name))
            : [e.name]
      )
    expect(segments(app).filter((s) => !RESERVED_SLUGS.includes(s))).toEqual([])
  })

  test("one campaign holds a name at a time; a closed one lets it go", () => {
    expect(fields(edit({ slug: "gumamchan" }))).toEqual(["slug"])
    expect(fields(edit({ slug: "gumamchan" }), { others: [{ ...gumamchan, status: "closed" }] })).toEqual([])
    // A closed campaign may keep a name an open one has taken since.
    expect(fields(edit({ slug: "gumamchan", status: "closed" }))).toEqual([])
  })

  test("suggested from the name", () => {
    expect(suggestSlug("Merch SZ Cup 2027!")).toBe("merch-sz-cup-2027")
    expect(suggestSlug("  ")).toBe("")
  })
})

describe("code prefixes", () => {
  test("two or three capitals, unique among every campaign, closed ones too", () => {
    for (const codePrefix of ["M", "mr", "MERC", "M1"]) expect(fields(edit({ codePrefix }))).toEqual(["codePrefix"])
    expect(fields(edit({ codePrefix: "SZC" }))).toEqual([])
    expect(fields(edit({ codePrefix: "GC" }), { others: [{ ...gumamchan, status: "closed" }] })).toEqual(["codePrefix"])
  })
})

describe("after the first order", () => {
  test("the URL name and prefix are fixed; everything else can change", () => {
    const current = campaign({ id: "merch", slug: "merch", codePrefix: "MR" })
    const context = { current, hasOrders: true }
    expect(fields(edit({ slug: "merch-2027" }), context)).toEqual(["slug"])
    expect(fields(edit({ codePrefix: "MC" }), context)).toEqual(["codePrefix"])
    expect(fields(edit({ name: "Merch PPITSZ", status: "closed" }), context)).toEqual([])
    expect(fields(edit({ slug: "merch-2027" }), { current, hasOrders: false })).toEqual([])
  })
})

describe("test orders", () => {
  test("keep a draft a draft until they're deleted", () => {
    const current = campaign({ id: "merch", slug: "merch", codePrefix: "MR", status: "draft" })
    const tested = { current, hasOrders: true, hasTestOrders: true }
    expect(fields(edit({ status: "open" }), tested)).toEqual(["status"])
    expect(fields(edit({ status: "closed" }), tested)).toEqual(["status"])
    expect(fields(edit({ status: "draft", name: "Merch 2027" }), tested)).toEqual([])
    expect(fields(edit({ status: "open" }), { current, hasOrders: true, hasTestOrders: false })).toEqual([])
  })
})

describe("the other settings", () => {
  test("dates in order, payment window, display order", () => {
    expect(fields(edit({ onlineClosesAt: new Date(0) }))).toEqual(["onlineClosesAt"])
    expect(fields(edit({ paymentWindowMinutes: 10 }))).toEqual(["paymentWindowMinutes"])
    expect(fields(edit({ sortOrder: -1 }))).toEqual(["sortOrder"])
    expect(fields(edit({ name: "M", pickupInfo: "" }))).toEqual(["name", "pickupInfo"])
  })
})

describe("what a campaign offers", () => {
  const slot = { id: "s1", startsAt: new Date(100), endsAt: new Date(200), maxOrders: null }
  const delivery = (overrides: Partial<CampaignEdit> = {}) =>
    edit({ offers: { delivery: true, pickup: false, booth: false }, deliverySlots: [slot], ...overrides })

  test("at least one way to sell", () => {
    expect(fields(edit({ offers: { delivery: false, pickup: false, booth: false } }))).toEqual(["offers"])
    expect(fields(delivery())).toEqual([])
  })

  test("order dates are optional on either side", () => {
    expect(fields(edit({ onlineOpensAt: null, onlineClosesAt: null }))).toEqual([])
    expect(fields(edit({ onlineOpensAt: null, onlineClosesAt: new Date(0) }))).toEqual([])
  })

  test("a pickup place only when something is collected", () => {
    expect(fields(delivery({ pickupInfo: "" }))).toEqual([])
    expect(fields(edit({ offers: { delivery: false, pickup: false, booth: true }, pickupInfo: "" }))).toEqual(["pickupInfo"])
  })

  test("delivery needs slots that end after they start, a fee and sensible limits", () => {
    expect(fields(delivery({ deliverySlots: [] }))).toEqual(["deliverySlots"])
    expect(fields(delivery({ deliverySlots: [{ ...slot, endsAt: new Date(100) }] }))).toEqual(["deliverySlots"])
    expect(fields(delivery({ deliverySlots: [{ ...slot, maxOrders: 0 }] }))).toEqual(["deliverySlots"])
    expect(fields(delivery({ deliverySlots: [slot, slot] }))).toEqual(["deliverySlots"])
    expect(fields(delivery({ deliveryFeeFen: -1 }))).toEqual(["deliveryFeeFen"])
    expect(fields(delivery({ deliveryFeeFen: 0, deliverySlots: [{ ...slot, maxOrders: 30 }] }))).toEqual([])
    // Slots don't matter while delivery is off.
    expect(fields(edit({ deliverySlots: [{ ...slot, maxOrders: 0 }] }))).toEqual([])
  })
})

describe("where a campaign stands", () => {
  const c = campaign({ onlineOpensAt: new Date(100), onlineClosesAt: new Date(200) })
  test("an open campaign follows its online order dates; drafts and closed ones don't", () => {
    expect(campaignPhase(c, new Date(50))).toBe("upcoming")
    expect(campaignPhase(c, new Date(150))).toBe("online")
    expect(campaignPhase(c, new Date(250))).toBe("booth")
    expect(campaignPhase({ ...c, status: "draft" }, new Date(150))).toBe("draft")
    expect(campaignPhase({ ...c, status: "closed" }, new Date(150))).toBe("closed")
  })

  test("no dates means always open; no booth means ended after the cutoff", () => {
    expect(campaignPhase({ ...c, onlineOpensAt: null, onlineClosesAt: null }, new Date(9e12))).toBe("online")
    const noBooth = { ...c, offers: { delivery: true, pickup: false, booth: false } }
    expect(campaignPhase(noBooth, new Date(250))).toBe("ended")
    expect(campaignPhase({ ...c, offers: { delivery: false, pickup: false, booth: true } }, new Date(150))).toBe("booth")
  })
})
