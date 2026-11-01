/*
 * Illustrative content for the previews. Names, numbers, dates and venues
 * are examples, not real records; real content comes from the CMS / Firebase.
 */
import type { Article } from "@ppitsz/ui/components/blocks/article-card"
import type { DepartureEvent } from "@ppitsz/ui/components/blocks/departure-board"
import type { Member } from "@ppitsz/ui/components/blocks/member-card"
import type { CampusCount } from "@ppitsz/ui/components/network/campus-line"
import type { NetworkMapDivision } from "@ppitsz/ui/components/network/network-map"

/** A fixed "today" so previews render the same everywhere. */
export const NOW = new Date("2026-10-13T12:00:00+08:00")

export const CAMPUS_COUNTS: CampusCount[] = [
  { campus: "szu", members: 64 },
  { campus: "hitsz", members: 58 },
  { campus: "pku", members: 21 },
  { campus: "sigs", members: 27 },
  { campus: "sustech", members: 112 },
  { campus: "cuhksz", members: 236 },
]

export const DIVISION_COUNTS: NetworkMapDivision[] = [
  { code: "bph", members: 8, href: "#bph" },
  { code: "danus", members: 9, href: "#danus" },
  { code: "depol", members: 10, href: "#depol" },
  { code: "humas", members: 9, href: "#humas" },
  { code: "it", members: 7, href: "#it" },
  { code: "medkref", members: 12, href: "#medkref" },
  { code: "pka", members: 8, href: "#pka" },
  { code: "sosbud", members: 10, href: "#sosbud" },
]

export const PAST_EVENTS: DepartureEvent[] = [
  {
    slug: "malam-keakraban-2026",
    title: "Malam Keakraban 2026",
    startsAt: new Date("2026-09-27T19:00:00+08:00"),
    campus: "cuhksz",
    venue: "Main hall",
    divisions: ["bph", "sosbud"],
    status: "past",
    href: "#",
    galleryUrl: "https://example.com/gallery",
  },
  {
    slug: "masters-scholarship-seminar",
    title: "Master's scholarships in China: a seminar",
    startsAt: new Date("2026-10-04T14:00:00+08:00"),
    campus: "sustech",
    venue: "Lecture room 1",
    divisions: ["pka"],
    status: "past",
    href: "#",
    galleryUrl: "https://example.com/gallery",
  },
]

export const UPCOMING_EVENTS: DepartureEvent[] = [
  {
    slug: "pekan-budaya-indonesia",
    title: "Pekan Budaya Indonesia",
    startsAt: new Date("2026-10-25T18:30:00+08:00"),
    campus: "szu",
    venue: "Main field",
    divisions: ["sosbud", "medkref"],
    status: "upcoming",
    summary: "Dance, music and food from across Indonesia, open to friends from every campus.",
    href: "#",
  },
  {
    slug: "career-talk-internships",
    title: "Career talk: internships in Shenzhen",
    startsAt: new Date("2026-10-31T15:00:00+08:00"),
    campus: "hitsz",
    venue: "Building G, room 301",
    divisions: ["pka", "humas"],
    status: "full",
    href: "#",
  },
  {
    slug: "shenzhen-cup-2026",
    title: "Shenzhen Cup 2026",
    startsAt: new Date("2026-11-14T09:00:00+08:00"),
    campus: "sustech",
    venue: "Sports hall",
    divisions: ["depol"],
    status: "registration_open",
    summary: "Badminton, basketball, Mobile Legends and mini soccer, Sat, Nov 14 at SUSTech.",
    href: "#",
    registrationUrl: "#register",
  },
  {
    slug: "bazar-kuliner-nusantara",
    title: "Bazar Kuliner Nusantara",
    startsAt: new Date("2026-11-22T11:00:00+08:00"),
    campus: "cuhksz",
    venue: "Lower campus plaza",
    divisions: ["danus"],
    status: "registration_open",
    href: "#",
    registrationUrl: "#register",
  },
]

export const LEADS: Member[] = [
  {
    name: "Nadia Putri Rahman",
    role: "Chair",
    division: "bph",
    university: "cuhksz",
    instagram: "@contoh.nadia",
    quote: "One network means nobody goes it alone, whichever campus you come from.",
  },
  {
    name: "Dimas Aditya",
    role: "Vice chair",
    division: "bph",
    university: "sustech",
    quote: "We want every member to know who to ask, from their first day in Shenzhen.",
  },
]

export const HUMAS_MEMBERS: Member[] = [
  { name: "Raka Pratama", role: "Head of division", division: "humas", university: "sustech", instagram: "@contoh.raka" },
  { name: "Aulia Safitri", role: "Deputy head", division: "humas", university: "cuhksz" },
  { name: "Bima Saputra", role: "Staff", division: "humas", university: "pku" },
  { name: "Citra Lestari", role: "Staff", division: "humas", university: "sigs" },
  { name: "Fajar Nugroho", role: "Staff", division: "humas", university: "cuhksz" },
  { name: "Gita Maharani", role: "Staff", division: "humas", university: "szu" },
]

export const ARTICLES: Article[] = [
  {
    title: "Tiga hal yang kami pelajari dari Shenzhen Cup",
    href: "#",
    dek: "Dari jadwal pertandingan sampai transportasi antarkampus: catatan panitia untuk turnamen tahun ini.",
    category: "Olahraga",
    division: "depol",
    author: "Raka Pratama",
    publishedAt: new Date("2026-10-08T10:00:00+08:00"),
    readingMinutes: 5,
    lang: "id",
  },
  {
    title: "Panduan memperpanjang residence permit untuk mahasiswa baru",
    href: "#",
    dek: "Dokumen yang perlu disiapkan, urutan langkahnya, dan berapa lama prosesnya biasanya berjalan.",
    category: "Panduan",
    division: "pka",
    author: "Clara Wijaya",
    publishedAt: new Date("2026-10-02T10:00:00+08:00"),
    readingMinutes: 6,
    lang: "id",
  },
  {
    title: "Mengenal kepengurusan 2026/2027",
    href: "#",
    dek: "Delapan divisi, enam kampus, dan siapa yang bisa kamu hubungi untuk apa.",
    category: "Organisasi",
    division: "bph",
    author: "Dimas Aditya",
    publishedAt: new Date("2026-09-20T10:00:00+08:00"),
    readingMinutes: 4,
    lang: "id",
  },
  {
    title: "Your first month in Shenzhen: a checklist",
    href: "#",
    dek: "Bank card, SIM, metro and payments, in the order that saves you the most queues.",
    category: "Guide",
    author: "Aulia Safitri",
    publishedAt: new Date("2026-09-12T10:00:00+08:00"),
    readingMinutes: 7,
    lang: "en",
  },
]
