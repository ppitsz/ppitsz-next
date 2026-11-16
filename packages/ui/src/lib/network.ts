/*
 * The PPITSZ network as data: divisions (lines), campuses (stations), recruitment
 * stages and status labels. The single source for every site and component.
 */

/* -------------------------------------------------------------------------
   Divisions — lines. Codes are permanent and keyed by division, not by
   cabinet year. The long codes are canonical for display.
   ------------------------------------------------------------------------- */

export const LINE_CODES = [
  "bph",
  "danus",
  "depol",
  "humas",
  "it",
  "medkref",
  "pka",
  "sosbud",
] as const

export type LineCode = (typeof LINE_CODES)[number]

export interface Division {
  code: LineCode
  /** The code as printed on the line badge. */
  badge: string
  /** Full Indonesian name: the badge's accessible name. */
  name: string
}

/** In display order: BPH (the main line) first. */
export const DIVISIONS: readonly Division[] = [
  { code: "bph", badge: "BPH", name: "Badan Pengurus Harian" },
  { code: "danus", badge: "DANUS", name: "Dana Usaha" },
  { code: "depol", badge: "DEPOL", name: "Departemen Olahraga" },
  { code: "humas", badge: "HUMAS", name: "Hubungan Masyarakat" },
  { code: "it", badge: "IT", name: "Informasi Teknologi" },
  { code: "medkref", badge: "MEDKREF", name: "Media Kreatif" },
  {
    code: "pka",
    badge: "PKA",
    name: "Perkembangan Karir dan Akademik",
  },
  { code: "sosbud", badge: "SOSBUD", name: "Sosial Budaya" },
]

const DIVISION_BY_CODE = new Map(DIVISIONS.map((d) => [d.code, d]))

export function getDivision(code: LineCode): Division {
  return DIVISION_BY_CODE.get(code)!
}

/**
 * The old codebase uses two code sets: recruitment (`DU`, `DO`, `HM`, `MK`, `SB`)
 * and committee (`DANUS`, `DEPOL` …). Map either to the canonical line code.
 */
const LEGACY_CODES: Record<string, LineCode> = {
  DU: "danus",
  DO: "depol",
  HM: "humas",
  MK: "medkref",
  SB: "sosbud",
}

export function toLineCode(code: string): LineCode | undefined {
  const upper = code.trim().toUpperCase()
  if (upper in LEGACY_CODES) return LEGACY_CODES[upper]
  const lower = upper.toLowerCase()
  return (LINE_CODES as readonly string[]).includes(lower)
    ? (lower as LineCode)
    : undefined
}

/* -------------------------------------------------------------------------
   Campuses — stations. Default order runs roughly west → east.
   ------------------------------------------------------------------------- */

export const CAMPUS_IDS = ["szu", "hitsz", "pku", "sigs", "sustech", "cuhksz"] as const

export type CampusId = (typeof CAMPUS_IDS)[number]

export interface Campus {
  id: CampusId
  /** Latin station name. */
  name: string
  /** Chinese station name, shown under the Latin one. */
  zh: string
  /** Full English name. */
  fullName: string
}

export const CAMPUSES: readonly Campus[] = [
  { id: "szu", name: "SZU", zh: "深圳大学", fullName: "Shenzhen University" },
  {
    id: "hitsz",
    name: "HITSZ",
    zh: "哈尔滨工业大学（深圳）",
    fullName: "Harbin Institute of Technology, Shenzhen",
  },
  {
    id: "pku",
    name: "PKU Shenzhen",
    zh: "北京大学深圳研究生院",
    fullName: "Peking University Shenzhen Graduate School",
  },
  {
    id: "sigs",
    name: "Tsinghua SIGS",
    zh: "清华大学深圳国际研究生院",
    fullName: "Tsinghua Shenzhen International Graduate School",
  },
  {
    id: "sustech",
    name: "SUSTech",
    zh: "南方科技大学",
    fullName: "Southern University of Science and Technology",
  },
  {
    id: "cuhksz",
    name: "CUHK-Shenzhen",
    zh: "香港中文大学（深圳）",
    fullName: "The Chinese University of Hong Kong, Shenzhen",
  },
]

const CAMPUS_BY_ID = new Map(CAMPUSES.map((c) => [c.id, c]))

export function getCampus(id: CampusId): Campus {
  return CAMPUS_BY_ID.get(id)!
}

/* -------------------------------------------------------------------------
   Recruitment — the applicant's route
   ------------------------------------------------------------------------- */

export interface RecruitmentStage {
  /** Matches `currentStage` in the existing recruitment data. */
  stage: 0 | 1 | 2 | 3
  label: string
}

export const RECRUITMENT_STAGES: readonly RecruitmentStage[] = [
  { stage: 0, label: "Online form" },
  { stage: 1, label: "Written test" },
  { stage: 2, label: "Interview" },
  { stage: 3, label: "Results" },
]

/** `currentStage` value the recruitment data uses for a rejected applicant. */
export const RECRUITMENT_REJECTED_STAGE = 4

/* -------------------------------------------------------------------------
   Status labels. Status is always shown in words.
   ------------------------------------------------------------------------- */

export type StatusTone =
  | "outline"
  | "neutral"
  | "success"
  | "warning"
  | "danger"
  | "highlight"

interface StatusLabel {
  label: string
  tone: StatusTone
}

export const STATUSES = {
  event: {
    upcoming: { label: "Upcoming", tone: "outline" },
    registration_open: { label: "Registration open", tone: "success" },
    full: { label: "Fully booked", tone: "warning" },
    past: { label: "Ended", tone: "neutral" },
  },
  /**
   * Forms (apps/forms): draft, open, closed and done are what admins set; an
   * open form shows responders its phase (upcoming, full, ended) instead.
   */
  form: {
    open: { label: "Open", tone: "success" },
    closed: { label: "Closed", tone: "neutral" },
    submitted: { label: "Submitted", tone: "outline" },
    attended: { label: "Attended", tone: "success" },
    draft: { label: "Draft", tone: "neutral" },
    done: { label: "Ended", tone: "neutral" },
    upcoming: { label: "Opening soon", tone: "outline" },
    full: { label: "Fully booked", tone: "warning" },
    ended: { label: "Registration closed", tone: "neutral" },
    cancelled: { label: "Canceled", tone: "danger" },
  },
  recruitment: {
    pending: { label: "Under review", tone: "warning" },
    scheduled: { label: "Interview scheduled", tone: "outline" },
    accepted: { label: "Accepted", tone: "success" },
    rejected: { label: "Not selected", tone: "danger" },
  },
  content: {
    new: { label: "New", tone: "highlight" },
  },
  /**
   * Shop campaigns: draft, open and closed are what admins set; an open
   * campaign shows buyers its phase (upcoming, online, booth, ended) instead.
   */
  campaign: {
    draft: { label: "Draft", tone: "neutral" },
    open: { label: "Open", tone: "success" },
    closed: { label: "Ended", tone: "neutral" },
    upcoming: { label: "Opening soon", tone: "outline" },
    online: { label: "Ordering online", tone: "success" },
    booth: { label: "At the booth", tone: "warning" },
    ended: { label: "Orders closed", tone: "neutral" },
  },
  /** Shop orders. */
  order: {
    pending_payment: { label: "Not paid", tone: "outline" },
    awaiting_verification: { label: "Needs checking", tone: "warning" },
    paid: { label: "Paid", tone: "success" },
    picked_up: { label: "Picked up", tone: "neutral" },
    /** A delivery order handed to a courier, and one delivered. */
    sending: { label: "On its way", tone: "success" },
    delivered: { label: "Delivered", tone: "neutral" },
    expired: { label: "Expired", tone: "neutral" },
    cancelled: { label: "Canceled", tone: "danger" },
  },
} as const satisfies Record<string, Record<string, StatusLabel>>

export type StatusDomain = keyof typeof STATUSES
export type StatusValue<D extends StatusDomain> = keyof (typeof STATUSES)[D]
export type EventStatus = StatusValue<"event">
