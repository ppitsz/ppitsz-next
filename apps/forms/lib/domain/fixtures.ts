import { DEFAULT_SETTINGS, NO_TICKETS } from "./definition"
import type { Form, FormResponse, Section } from "./types"

/** Test data: a form and its responses, with whatever overrides a test needs. */

export const NOW = new Date("2027-03-10T12:00:00+08:00")

export const SECTIONS: Section[] = [
  {
    id: "s1",
    title: "Tentang kamu",
    description: "",
    questions: [
      {
        id: "role",
        type: "single",
        title: "Kamu datang sebagai",
        help: "",
        required: true,
        options: [
          { id: "student", label: "Mahasiswa" },
          { id: "guest", label: "Tamu" },
        ],
      },
      {
        id: "major",
        type: "short",
        title: "Jurusan",
        help: "",
        required: true,
        options: [],
        showIf: { questionId: "role", optionIds: ["student"] },
      },
      {
        id: "food",
        type: "multi",
        title: "Makanan",
        help: "",
        required: false,
        options: [
          { id: "veg", label: "Vegetarian" },
          { id: "halal", label: "Halal" },
        ],
      },
    ],
  },
  {
    id: "s2",
    title: "Untuk tamu",
    description: "",
    showIf: { questionId: "role", optionIds: ["guest"] },
    questions: [{ id: "host", type: "short", title: "Diundang oleh", help: "", required: true, options: [] }],
  },
  {
    id: "s3",
    title: "Lainnya",
    description: "",
    questions: [
      { id: "note", type: "long", title: "Catatan", help: "", required: false, options: [] },
      { id: "cv", type: "file", title: "CV", help: "", required: false, options: [] },
    ],
  },
]

export function makeForm(overrides: Partial<Form> = {}): Form {
  return {
    id: "f1",
    slug: "gala-night",
    title: "Gala Night",
    description: "",
    line: "sosbud",
    status: "open",
    unlisted: false,
    opensAt: null,
    closesAt: null,
    settings: DEFAULT_SETTINGS,
    sections: SECTIONS,
    tickets: NO_TICKETS,
    team: [],
    teamUids: [],
    counts: { total: 0, live: 0, byType: {} },
    checkInDays: [],
    seen: {},
    broadcasts: [],
    cancelledAt: null,
    doneAt: null,
    purgedAt: null,
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  }
}

export function makeTicketForm(overrides: Partial<Form> = {}): Form {
  return makeForm({
    tickets: {
      enabled: true,
      venue: "Aula SZU",
      capacity: 100,
      days: [
        { id: "d1", date: "2027-03-17", starts: "18:00", ends: "21:00" },
        { id: "d2", date: "2027-03-18", starts: "", ends: "" },
      ],
      types: [
        { id: "all", name: "Dua hari", description: "", quota: null, salesStart: null, salesEnd: null, dayIds: [] },
        { id: "day1", name: "Hari pertama", description: "", quota: 10, salesStart: null, salesEnd: null, dayIds: ["d1"] },
      ],
    },
    ...overrides,
  })
}

export function makeResponse(overrides: Partial<FormResponse> = {}): FormResponse {
  return {
    id: "r1",
    formId: "f1",
    token: "tokentokentokentokentoke",
    code: "K7P3QX",
    status: "live",
    identity: { name: "Nadia", email: "nadia@contoh.test", wechatId: "nadia_wx", campus: "szu" },
    answers: {},
    ticketTypeId: "all",
    checkIns: {},
    mail: null,
    source: "online",
    deviceKey: "",
    accountUid: null,
    cancelledAt: null,
    cancelledBy: null,
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  }
}
