import { describe, expect, test } from "bun:test"

import {
  codeChallenge,
  googleAuthUrl,
  googleError,
  identityFromIdToken,
  largeGooglePhoto,
  newGoogleFlow,
  parseGoogleFlow,
  planGoogle,
} from "./google"

const CLIENT = "client-123.apps.googleusercontent.com"
const NOW = Date.UTC(2026, 10, 12, 12)

/** An unsigned ID token: identityFromIdToken only reads the claims. */
function idToken(claims: Record<string, unknown>) {
  const part = (value: object) => Buffer.from(JSON.stringify(value)).toString("base64url")
  return `${part({ alg: "RS256" })}.${part(claims)}.signature`
}

const CLAIMS = {
  iss: "https://accounts.google.com",
  aud: CLIENT,
  exp: NOW / 1000 + 600,
  nonce: "n1",
  sub: "1081",
  email: "Rina@Gmail.com",
  email_verified: true,
  name: " Rina ",
  picture: "https://lh3.googleusercontent.com/a/abc=s96-c",
}

const check = (claims: Record<string, unknown>) => identityFromIdToken(idToken(claims), { clientId: CLIENT, nonce: "n1", now: NOW })

describe("identityFromIdToken", () => {
  test("reads a valid token, lowercasing the email", () => {
    expect(check(CLAIMS)).toEqual({
      ok: true,
      value: { sub: "1081", email: "rina@gmail.com", name: "Rina", picture: CLAIMS.picture },
    })
  })

  test("refuses another client, issuer or nonce, and an expired token", () => {
    for (const bad of [{ aud: "other" }, { iss: "https://evil.example" }, { nonce: "n2" }, { exp: NOW / 1000 - 1 }]) {
      expect(check({ ...CLAIMS, ...bad })).toEqual({ ok: false, code: "failed" })
    }
  })

  test("refuses an unverified email", () => {
    expect(check({ ...CLAIMS, email_verified: false })).toEqual({ ok: false, code: "unverified" })
  })

  test("refuses garbage", () => {
    expect(identityFromIdToken("not-a-token", { clientId: CLIENT, nonce: "n1" })).toEqual({ ok: false, code: "failed" })
  })
})

test("codeChallenge matches RFC 7636's example", () => {
  expect(codeChallenge("dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk")).toBe("E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM")
})

test("googleAuthUrl asks for the code with PKCE, state and nonce", () => {
  const flow = newGoogleFlow("signIn", "/")
  const url = new URL(googleAuthUrl(CLIENT, "https://account.ppitshenzhen.org/auth/google/callback", flow))
  expect(url.origin).toBe("https://accounts.google.com")
  expect(Object.fromEntries(url.searchParams)).toMatchObject({
    client_id: CLIENT,
    response_type: "code",
    scope: "openid email profile",
    state: flow.state,
    nonce: flow.nonce,
    code_challenge: codeChallenge(flow.verifier),
    code_challenge_method: "S256",
  })
  expect(url.searchParams.has("code_verifier")).toBe(false)
})

describe("parseGoogleFlow", () => {
  test("round-trips a flow", () => {
    const flow = newGoogleFlow("link", "/")
    expect(parseGoogleFlow(JSON.stringify(flow))).toEqual(flow)
  })

  test("refuses a missing, broken or incomplete cookie", () => {
    expect(parseGoogleFlow(undefined)).toBeNull()
    expect(parseGoogleFlow("{")).toBeNull()
    expect(parseGoogleFlow(JSON.stringify({ ...newGoogleFlow("signIn", "/"), state: "" }))).toBeNull()
    expect(parseGoogleFlow(JSON.stringify({ ...newGoogleFlow("signIn", "/"), intent: "admin" }))).toBeNull()
  })
})

describe("planGoogle", () => {
  const sub = "g1"
  const account = (uid: string, googleSub: string | null = null) => ({ uid, googleSub })

  test("signs in to the account it is linked to", () => {
    expect(planGoogle({ sub, linked: account("u1", sub), emailOwner: account("u2"), signedIn: null })).toEqual({
      kind: "signIn",
      uid: "u1",
    })
  })

  test("links to the account with its email, which Google verified", () => {
    expect(planGoogle({ sub, linked: null, emailOwner: account("u1"), signedIn: null })).toEqual({
      kind: "link",
      uid: "u1",
      sameEmail: true,
    })
  })

  test("never takes over an email whose account has another Google account", () => {
    expect(planGoogle({ sub, linked: null, emailOwner: account("u1", "g2"), signedIn: null })).toEqual({
      kind: "refuse",
      code: "email-has-google",
    })
  })

  test("makes a new account for a new email", () => {
    expect(planGoogle({ sub, linked: null, emailOwner: null, signedIn: null })).toEqual({ kind: "create" })
  })

  test("links to the signed-in account, whatever its email", () => {
    expect(planGoogle({ sub, linked: null, emailOwner: null, signedIn: account("u1") })).toEqual({
      kind: "link",
      uid: "u1",
      sameEmail: false,
    })
  })

  test("refuses to link a Google account another account has", () => {
    expect(planGoogle({ sub, linked: account("u2", sub), emailOwner: null, signedIn: account("u1") })).toEqual({
      kind: "refuse",
      code: "linked-elsewhere",
    })
  })

  test("refuses a second Google account on one account", () => {
    expect(planGoogle({ sub, linked: null, emailOwner: null, signedIn: account("u1", "g2") })).toEqual({
      kind: "refuse",
      code: "has-google",
    })
  })
})

test("googleError knows only its own codes", () => {
  expect(googleError("unverified")).toContain("verified")
  expect(googleError("toString")).toBeNull()
  expect(googleError(undefined)).toBeNull()
})

test("largeGooglePhoto asks for 512px", () => {
  expect(largeGooglePhoto("https://lh3.googleusercontent.com/a/abc=s96-c")).toBe("https://lh3.googleusercontent.com/a/abc=s512-c")
})
