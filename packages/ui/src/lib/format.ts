/*
 * Dates, times and numbers. Every event time is Shenzhen time
 * (Asia/Shanghai, UTC+8); family-facing pages add the WIB (Jakarta) time.
 * The UI is English (ADR 0007): "id" and "zh" are for content blocks written
 * in those languages. Times are 24-hour in every locale.
 */

export type Locale = "id" | "en" | "zh"

export const SHENZHEN_TZ = "Asia/Shanghai"
export const WIB_TZ = "Asia/Jakarta"

const INTL_LOCALE: Record<Locale, string> = {
  id: "id-ID",
  en: "en-US",
  zh: "zh-CN",
}

/** "Sat, Nov 14" · "Sab, 14 Nov" · "11月14日周六" */
export function formatDate(date: Date, locale: Locale = "en") {
  return new Intl.DateTimeFormat(INTL_LOCALE[locale], {
    timeZone: SHENZHEN_TZ,
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(date)
}

/** "Oct 13, 2026" · "13 Okt 2026" · "2026年10月13日" */
export function formatLongDate(date: Date, locale: Locale = "en") {
  return new Intl.DateTimeFormat(INTL_LOCALE[locale], {
    timeZone: SHENZHEN_TZ,
    day: "numeric",
    month: locale === "zh" ? "long" : "short",
    year: "numeric",
  }).format(date)
}

/** "19:00" · "19.00" · "19:00" */
export function formatTime(date: Date, locale: Locale = "en", timeZone = SHENZHEN_TZ) {
  return new Intl.DateTimeFormat(INTL_LOCALE[locale], {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(date)
}

/** "19:00 Shenzhen time (18:00 WIB)" · "19.00 waktu Shenzhen (18.00 WIB)" */
export function formatTimeWithWib(date: Date, locale: Exclude<Locale, "zh"> = "en") {
  const shenzhen = formatTime(date, locale)
  const wib = formatTime(date, locale, WIB_TZ)
  return locale === "id"
    ? `${shenzhen} waktu Shenzhen (${wib} WIB)`
    : `${shenzhen} Shenzhen time (${wib} WIB)`
}

/** The pieces a departure-board time cell shows: "14", "Nov", "Sat". */
export function dateParts(date: Date, locale: Locale = "en") {
  const parts = new Intl.DateTimeFormat(INTL_LOCALE[locale], {
    timeZone: SHENZHEN_TZ,
    weekday: "short",
    day: "numeric",
    month: "short",
  }).formatToParts(date)
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? ""
  return { day: get("day"), month: get("month"), weekday: get("weekday") }
}

/** Calendar days from `now` to `date`, counted in Shenzhen time. */
export function daysUntil(date: Date, now: Date = new Date()) {
  const key = (d: Date) =>
    new Intl.DateTimeFormat("en-CA", { timeZone: SHENZHEN_TZ }).format(d)
  const toUtcMidnight = (k: string) => Date.parse(`${k}T00:00:00Z`)
  return Math.round((toUtcMidnight(key(date)) - toUtcMidnight(key(now))) / 86_400_000)
}

/**
 * "In 12 days" · "12 hari lagi". Updates per day, never per second
 * (no ticking countdowns).
 */
export function formatRelativeDays(date: Date, locale: Exclude<Locale, "zh"> = "en", now = new Date()) {
  const n = daysUntil(date, now)
  if (locale === "id") {
    if (n === 0) return "Hari ini"
    if (n === 1) return "Besok"
    return n > 1 ? `${n} hari lagi` : `${-n} hari lalu`
  }
  if (n === 0) return "Today"
  if (n === 1) return "Tomorrow"
  return n > 1 ? `In ${n} days` : `${-n} days ago`
}

/** The `dateTime` attribute for <time>, with the +08:00 offset. */
export function toShenzhenIso(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: SHENZHEN_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date)
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? ""
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}+08:00`
}

/** "1,500" · "1.500" */
export function formatNumber(n: number, locale: Locale = "en") {
  return new Intl.NumberFormat(INTL_LOCALE[locale]).format(n)
}

/** "Rp50,000" · "Rp50.000" */
export function formatRupiah(n: number, locale: Locale = "en") {
  return `Rp${formatNumber(Math.round(n), locale)}`
}

/**
 * "¥15" · "¥12.50" from an amount in fen (1/100 yuan), the unit prices are
 * stored in. Decimals appear only when the amount has them.
 */
export function formatYuan(fen: number, locale: Locale = "en") {
  const yuan = fen / 100
  const formatted = new Intl.NumberFormat(INTL_LOCALE[locale], {
    minimumFractionDigits: Number.isInteger(yuan) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(yuan)
  return `¥${formatted}`
}

/**
 * Article byline, in the article's language:
 * "By Nadia · Oct 13, 2026 · 4 min read" · "Oleh Nadia · 13 Okt 2026 · 4 menit baca"
 * · "Nadia · 2026年10月13日 · 阅读约4分钟"
 */
export function formatByline({
  author,
  publishedAt,
  readingMinutes,
  locale = "en",
}: {
  author: string
  publishedAt: Date
  readingMinutes: number
  locale?: Locale
}) {
  const date = formatLongDate(publishedAt, locale)
  if (locale === "en") return `By ${author} · ${date} · ${readingMinutes} min read`
  if (locale === "zh") return `${author} · ${date} · 阅读约${readingMinutes}分钟`
  return `Oleh ${author} · ${date} · ${readingMinutes} menit baca`
}
