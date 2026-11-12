import { afterEach, describe, expect, test } from "bun:test"

import { cleanProfile, generatePassword, passwordIssue } from "./fields"
import { roleLabel } from "./role-labels"
import { appOrigin, rootDomain, safeNext, sessionCookieDomain, transferApps } from "./urls"

const ORIGINS = ["https://account.ppitshenzhen.org", "https://shop.ppitshenzhen.org", "https://forms.ppitshenzhen.org"]

describe("safeNext", () => {
  test("keeps a path on the account app", () => {
    expect(safeNext("/accounts/u1", "/", ORIGINS)).toBe("/accounts/u1")
  })

  test("keeps a full URL on one of our apps", () => {
    expect(safeNext("https://shop.ppitshenzhen.org/gumamchan/checkout", "/", ORIGINS)).toBe(
      "https://shop.ppitshenzhen.org/gumamchan/checkout"
    )
  })

  test("keeps a full URL on the account app as a path", () => {
    expect(safeNext("https://account.ppitshenzhen.org/accounts?q=1#top", "/", ORIGINS)).toBe("/accounts?q=1#top")
  })

  test("refuses anywhere else", () => {
    for (const next of [
      "https://evil.example/",
      "https://shop.ppitshenzhen.org.evil.example/",
      "https://shop.ppitshenzhen.org@evil.example/",
      "//evil.example",
      "/\\evil.example",
      "/\t/evil.example",
      "/\n/evil.example",
      "\t//evil.example",
      " //evil.example",
      "javascript:alert(1)",
      "",
      42,
      undefined,
    ]) {
      expect(safeNext(next, "/", ORIGINS)).toBe("/")
    }
  })
})

describe("cleanProfile", () => {
  test("only the name is required", () => {
    expect(cleanProfile({ name: "  Sari ", wechatId: "", phone: "" })).toEqual({
      profile: { name: "Sari", wechatId: "", phone: "" },
      issues: {},
    })
  })

  test("says what is wrong", () => {
    const { issues } = cleanProfile({ name: "S", wechatId: "x".repeat(41), phone: "abc" })
    expect(Object.keys(issues).sort()).toEqual(["name", "phone", "wechatId"])
  })
})

test("passwordIssue", () => {
  expect(passwordIssue("1234567")).not.toBeNull()
  expect(passwordIssue("12345678")).toBeNull()
})

test("generatePassword has 12 characters without look-alikes", () => {
  for (let i = 0; i < 50; i++) expect(generatePassword()).toMatch(/^[2-9a-hj-km-np-zA-HJ-NP-Z]{12}$/)
})

test("roleLabel", () => {
  expect(roleLabel("shop", "booth")).toBe("Booth staff")
  expect(roleLabel("portal", "admin")).toBe("Yes")
  expect(roleLabel("forms", null)).toBe("None")
})

describe("app origins", () => {
  const saved = { ROOT_DOMAIN: process.env.ROOT_DOMAIN, VERCEL: process.env.VERCEL }
  afterEach(() => {
    for (const [key, value] of Object.entries(saved)) {
      if (value === undefined) delete process.env[key]
      else process.env[key] = value
    }
  })

  test("locally, each app is on its dev port and the cookie has no domain", () => {
    delete process.env.ROOT_DOMAIN
    delete process.env.VERCEL
    expect(rootDomain()).toBeNull()
    expect(appOrigin("shop")).toBe("http://localhost:3001")
    expect(appOrigin("account")).toBe("http://localhost:3003")
    expect(sessionCookieDomain()).toBeUndefined()
  })

  test("on Vercel, each app is a subdomain of ppitshenzhen.org", () => {
    delete process.env.ROOT_DOMAIN
    process.env.VERCEL = "1"
    expect(appOrigin("shop")).toBe("https://shop.ppitshenzhen.org")
    expect(appOrigin("forms")).toBe("https://forms.ppitshenzhen.org")
    expect(sessionCookieDomain()).toBe(".ppitshenzhen.org")
  })

  test("ROOT_DOMAIN moves every app, and stray dots are dropped", () => {
    process.env.VERCEL = "1"
    process.env.ROOT_DOMAIN = ".preview.ppitshenzhen.org."
    expect(appOrigin("account")).toBe("https://account.preview.ppitshenzhen.org")
    expect(sessionCookieDomain()).toBe(".preview.ppitshenzhen.org")
    expect(safeNext("https://shop.preview.ppitshenzhen.org/x")).toBe("https://shop.preview.ppitshenzhen.org/x")
    expect(safeNext("https://shop.ppitshenzhen.org/x")).toBe("/")
  })

  test("the Transfer menu leaves out the current app", () => {
    expect(transferApps("shop").map((app) => app.label)).not.toContain("PPITSZ Shop")
    expect(transferApps("shop").map((app) => app.label)).toContain("PPITSZ Account")
  })
})
