import { beforeAll, describe, expect, test } from "bun:test"

import { DEFAULT_SETTINGS, type Definition } from "../domain/definition"
import { processQueue, queueMail } from "../mail/queue"
import { db } from "../firebase/admin"
import {
  cancelEvent,
  cancelResponse,
  checkIn,
  createForm,
  createResponse,
  getForm,
  getResponse,
  newResponseId,
  responsesByEmail,
  saveAccessCode,
  saveDefinition,
  setFormStatus,
  updateResponseByStaff,
  useAccessCode,
} from "."
import { toDraft } from "../domain/definition"

/*
 * Against the Firestore emulator (bun run test:emulator): the transactions
 * that guard quotas, one-ticket-per-email, absen and cancellation.
 */

const now = new Date()
const staff = { uid: "u-organizer", name: "Rina" }
const identity = (email: string) => ({ name: "Nadia", email, wechatId: "nadia", campus: "szu" as const })

function event(slug: string): Definition {
  return {
    title: "Tes",
    slug,
    description: "",
    line: "it",
    unlisted: true,
    opensAt: null,
    closesAt: null,
    settings: DEFAULT_SETTINGS,
    sections: [{ id: "s1", title: "", description: "", questions: [] }],
    tickets: {
      enabled: true,
      venue: "",
      capacity: 3,
      days: [
        { id: "d1", date: "2027-03-17", starts: "", ends: "" },
        { id: "d2", date: "2027-03-18", starts: "", ends: "" },
      ],
      types: [
        { id: "a", name: "A", description: "", quota: 2, salesStart: null, salesEnd: null, dayIds: ["d1"] },
        { id: "b", name: "B", description: "", quota: null, salesStart: null, salesEnd: null, dayIds: [] },
      ],
    },
  }
}

async function openForm(slug: string) {
  const id = await createForm(event(`${slug}-${Date.now()}`), now)
  await setFormStatus(id, "open", now)
  return id
}

const add = (formId: string, email: string, ticketTypeId: string) =>
  createResponse(newResponseId(), { formId, identity: identity(email), answers: {}, ticketTypeId, source: "online", deviceKey: "dev" }, now)

beforeAll(async () => {
  await db().listCollections()
})

describe("registering", () => {
  test("refuses a draft, then takes places until the quota and the capacity are used", async () => {
    const id = await createForm(event(`draf-${Date.now()}`), now)
    await expect(add(id, "x@contoh.test", "a")).rejects.toThrow("isn't open yet")
    await setFormStatus(id, "open", now)
    await add(id, "1@contoh.test", "a")
    await add(id, "2@contoh.test", "a")
    await expect(add(id, "3@contoh.test", "a")).rejects.toThrow()
    await add(id, "3@contoh.test", "b")
    await expect(add(id, "4@contoh.test", "b")).rejects.toThrow("full")
    expect((await getForm(id))!.counts).toEqual({ total: 3, live: 3, byType: { a: 2, b: 1 } })
  })

  test("one live ticket per email; canceling frees the email and the place", async () => {
    const id = await openForm("satu")
    const first = await add(id, "nadia@contoh.test", "a")
    await expect(add(id, "nadia@contoh.test", "b")).rejects.toThrow("already responded")
    await cancelResponse(first.id, "self", now)
    expect((await getForm(id))!.counts.live).toBe(0)
    const again = await add(id, "nadia@contoh.test", "a")
    expect((await responsesByEmail(id, "nadia@contoh.test")).map((r) => r.id)).toEqual([again.id])
  })

  test("two people racing for the last place: one wins", async () => {
    const id = await openForm("balapan")
    await add(id, "1@contoh.test", "b")
    await add(id, "2@contoh.test", "b")
    const results = await Promise.allSettled([add(id, "3@contoh.test", "b"), add(id, "4@contoh.test", "b")])
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1)
    expect((await getForm(id))!.counts.live).toBe(3)
  })
})

describe("the door", () => {
  test("checks in once per day, refuses the wrong day, and the day can't be deleted after", async () => {
    const id = await openForm("pintu")
    const r = await add(id, "a@contoh.test", "a")
    expect((await checkIn(id, r.id, "d1", staff, now)).result.kind).toBe("checked_in")
    const again = await checkIn(id, r.id, "d1", staff, now)
    expect(again.result.kind).toBe("again")
    expect((await checkIn(id, r.id, "d2", staff, now)).result).toEqual({ kind: "refused", reason: "wrong_day" })

    const form = (await getForm(id))!
    const draft = toDraft(form)
    draft.tickets.days = draft.tickets.days.filter((d) => d.id !== "d1")
    draft.tickets.types = draft.tickets.types.map((t) => ({ ...t, dayIds: [] }))
    expect(await saveDefinition(id, draft, now)).toEqual({ ok: false, error: expect.stringContaining("check-ins") })
  })

  test("a door registration skips sale dates but is checked in and counted", async () => {
    const id = await openForm("tempat")
    await setFormStatus(id, "closed", now)
    const r = await createResponse(
      newResponseId(),
      { formId: id, identity: { name: "Budi", email: "", wechatId: "", campus: "" }, answers: {}, ticketTypeId: "b", source: "door", deviceKey: "", checkIn: { dayId: "d2", byUid: staff.uid, byName: staff.name } },
      now
    )
    expect(r.checkIns.d2?.byName).toBe("Rina")
    expect((await getForm(id))!.checkInDays).toEqual(["d2"])
  })
})

describe("organizer edits", () => {
  test("moving type follows the new quota; changing email moves the lock", async () => {
    const id = await openForm("ubah")
    await add(id, "1@contoh.test", "a")
    await add(id, "2@contoh.test", "a")
    const r = await add(id, "3@contoh.test", "b")
    await expect(updateResponseByStaff(r.id, { identity: identity("3@contoh.test"), ticketTypeId: "a" }, now)).rejects.toThrow()
    await updateResponseByStaff(r.id, { identity: identity("baru@contoh.test"), ticketTypeId: "b" }, now)
    await expect(add(id, "baru@contoh.test", "b")).rejects.toThrow("already responded")
  })

  test("canceling the event voids every ticket", async () => {
    const id = await openForm("batal")
    await add(id, "1@contoh.test", "a")
    const r = await add(id, "2@contoh.test", "b")
    expect(await cancelEvent(id, now)).toHaveLength(2)
    expect((await getResponse(r.id))!.cancelledBy).toBe("event")
    const form = (await getForm(id))!
    expect(form.status).toBe("closed")
    expect(form.counts.live).toBe(0)
    expect((await checkIn(id, r.id, "d1", staff, now)).result.kind).toBe("refused")
  })
})

test("access code: right once, wrong ones counted", async () => {
  await saveAccessCode("f-kode", "n@contoh.test", "123456", now)
  expect(await useAccessCode("f-kode", "n@contoh.test", "000000", now)).toBe(false)
  expect(await useAccessCode("f-kode", "n@contoh.test", "123456", now)).toBe(true)
  expect(await useAccessCode("f-kode", "n@contoh.test", "123456", now)).toBe(false)
})

test("mail queue sends to the outbox and tracks it on the response", async () => {
  const id = await openForm("surel")
  const r = await add(id, "surel@contoh.test", "b")
  const [mailId] = await queueMail([{ kind: "ticket", from: "ticket", to: r.identity.email, subject: "Tes", html: "<p>hi</p>", text: "hi", responseId: r.id }])
  // queueMail starts sending at once (outside a request, without waiting): wait for it.
  const ref = db().collection("formMails").doc(mailId!)
  for (let i = 0; i < 50 && (await ref.get()).get("status") !== "sent"; i++) {
    await processQueue()
    await new Promise((r) => setTimeout(r, 100))
  }
  const mail = (await ref.get()).data()!
  expect(mail.status).toBe("sent")
  expect(mail.html).toBeUndefined()
  expect((await getResponse(r.id))!.mail?.status).toBe("sent")
})
