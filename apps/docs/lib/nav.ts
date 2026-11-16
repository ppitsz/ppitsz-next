/*
 * The docs map: the single source for the header, the sidebar, the group
 * index pages, the overview map and prev/next links.
 */

export interface DocsPage {
  href: string
  title: string
  description: string
}

export interface DocsGroup {
  id: "foundations" | "components" | "network" | "examples"
  title: string
  href: string
  description: string
  pages: DocsPage[]
}

export const DOCS_GROUPS: DocsGroup[] = [
  {
    id: "foundations",
    title: "Foundations",
    href: "/foundations",
    description: "Color, type, layout, shape, motion and imagery: the rules every page is built from.",
    pages: [
      { href: "/foundations/color", title: "Color", description: "Signal red, concrete neutrals, status colors and the eight division lines." },
      { href: "/foundations/typography", title: "Typography", description: "Archivo at five widths, Atkinson Hyperlegible Next, Noto Sans SC, and the type scale." },
      { href: "/foundations/layout", title: "Layout", description: "The grid, the content column and the eight signature layouts." },
      { href: "/foundations/shape", title: "Shape and elevation", description: "Capsules, soft panels, square edges, lines and badges. Shadows only on floating layers." },
      { href: "/foundations/motion", title: "Motion", description: "Movement through the network or a change of state. Nothing else moves." },
      { href: "/foundations/imagery", title: "Imagery and icons", description: "Real photos in natural color, the PPI mark, and the approved Phosphor icons." },
    ],
  },
  {
    id: "components",
    title: "Components",
    href: "/components",
    description: "shadcn/ui components on Base UI, restyled to Jaringan.",
    pages: [
      { href: "/components/button", title: "Button", description: "Primary, secondary, quiet and danger capsules. One red button per screen." },
      { href: "/components/link", title: "Link", description: "Inline, standalone and external links." },
      { href: "/components/form-fields", title: "Form fields", description: "Input, textarea, checkbox and radio with labels, helpers and errors." },
      { href: "/components/select", title: "Select", description: "Always native, so every device shows its own picker." },
      { href: "/components/badges", title: "Tags, status and chips", description: "Category tags, status badges in words, and filter chips." },
      { href: "/components/card", title: "Card and notice", description: "Contained panels for forms and notices, not for collections." },
      { href: "/components/dialog", title: "Dialog", description: "Modal dialogs and destructive confirmations." },
      { href: "/components/profile-menu", title: "Avatar and profile menu", description: "Who is signed in, the same in every app." },
      { href: "/components/toast", title: "Toast", description: "Confirmations of things that already happened." },
      { href: "/components/accordion", title: "Accordion", description: "The FAQ pattern." },
      { href: "/components/loading-and-empty", title: "Loading and empty", description: "Static skeletons, spinners and one-sentence empty states." },
      { href: "/components/header", title: "Header", description: "Sticky navigation with a station dot on the current page." },
      { href: "/components/footer", title: "Footer", description: "A tone-ink band with the sitemap drawn as a route." },
    ],
  },
  {
    id: "network",
    title: "Network",
    href: "/network",
    description: "Routes, stations, line badges and the boards and maps built from them.",
    pages: [
      { href: "/network/route", title: "Route and station", description: "The primitives every network graphic is built from." },
      { href: "/network/line-badge", title: "Line badge", description: "The division code in its line color." },
      { href: "/network/station-label", title: "Station label", description: "The Latin name with the Chinese name below." },
      { href: "/network/station-code", title: "Station code", description: "Order and ticket codes as station numbers." },
      { href: "/network/station-nameplate", title: "Station nameplate", description: "A flow page's title as a platform name sign, with the stations either side." },
      { href: "/network/route-tracker", title: "Route tracker", description: "The recruitment applicant's journey, with “You are here”." },
      { href: "/network/strip-map", title: "Strip map", description: "The map above the train doors: an order or a ticket on its way." },
      { href: "/network/route-strip", title: "Route strip", description: "In-page wayfinding for long pages." },
      { href: "/network/sign", title: "Signs and exits", description: "Overhead signs to the next destination; yellow exits out of the app." },
      { href: "/network/network-map", title: "Network map", description: "Every division line meeting at one interchange." },
      { href: "/network/departure-board", title: "Departure board", description: "Events as rows on a board, not cards." },
      { href: "/network/timetable", title: "Timetable", description: "First order, last order: the times that bound a campaign or form." },
      { href: "/network/ticket", title: "Ticket", description: "Event tickets and orders to collect, with a tear-off stub." },
      { href: "/network/gate", title: "Gate", description: "The answer to a scan: go, check first, or stop." },
      { href: "/network/service-notice", title: "Service notice", description: "Posted announcements when the service itself changes." },
      { href: "/network/share-image", title: "Share image", description: "Link previews as station signs." },
      { href: "/network/member-card", title: "Member card", description: "Portraits under division lines." },
      { href: "/network/article-card", title: "Article card", description: "News: one lead, then rows." },
    ],
  },
  {
    id: "examples",
    title: "Examples",
    href: "/examples",
    description: "Whole pages composed from the system.",
    pages: [
      { href: "/examples/home", title: "Home", description: "The home page: network hero, departure board, about, numbers and news." },
    ],
  },
]

export const ALL_PAGES: DocsPage[] = [
  { href: "/", title: "Overview", description: "The idea, the principles and how to use Jaringan." },
  ...DOCS_GROUPS.flatMap((group) => group.pages),
]

export function getPage(href: string) {
  return ALL_PAGES.find((page) => page.href === href)
}

export function getGroup(id: DocsGroup["id"]) {
  return DOCS_GROUPS.find((group) => group.id === id)!
}

export function getNeighbours(href: string) {
  const index = ALL_PAGES.findIndex((page) => page.href === href)
  return {
    previous: index > 0 ? ALL_PAGES[index - 1] : undefined,
    next: index >= 0 && index < ALL_PAGES.length - 1 ? ALL_PAGES[index + 1] : undefined,
  }
}
