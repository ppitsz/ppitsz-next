import * as React from "react"
import Link from "next/link"

import { cn } from "@ppitsz/ui/lib/utils"
import { Link as TextLink } from "@ppitsz/ui/components/link"
import { RouteStrip, type RouteStripSection } from "@ppitsz/ui/components/network/route-strip"
import { RouteList, RouteStop } from "@ppitsz/ui/components/network/route"
import { getNeighbours, type DocsGroup } from "@/lib/nav"

/*
 * A docs page: kicker, title, lede, then sections. Pages with 3+ sections get
 * the route strip — in the right gutter here, because the docs
 * navigation holds the left one — and a scrollable strip below xl.
 */
export function DocPage({
  href,
  kicker,
  title,
  lede,
  sections,
  children,
}: {
  href: string
  kicker: string
  title: React.ReactNode
  lede?: React.ReactNode
  sections: RouteStripSection[]
  children: React.ReactNode
}) {
  const { previous, next } = getNeighbours(href)
  const withStrip = sections.length >= 3
  return (
    <div className="min-w-0 xl:grid xl:grid-cols-[minmax(0,1fr)_12rem] xl:gap-12">
      <article className="min-w-0 pb-20">
        <header className="flex flex-col gap-4 pt-10 pb-10 lg:pt-14">
          <p className="type-kicker text-accent-text">{kicker}</p>
          <h1 className="type-display-xl text-text">{title}</h1>
          {lede && <p className="max-w-[60ch] type-lede text-muted">{lede}</p>}
        </header>
        {withStrip && (
          <RouteStrip
            variant="strip"
            sections={sections}
            aria-label="On this page"
            className="mb-12 xl:hidden"
          />
        )}
        <div className="flex flex-col gap-20">{children}</div>
        {(previous || next) && (
          <nav
            aria-label="Previous and next"
            className="mt-20 flex flex-col justify-between gap-6 border-t pt-8 sm:flex-row"
          >
            {previous ? (
              <span className="flex flex-col gap-1">
                <span className="type-kicker text-muted">Previous</span>
                <TextLink as={Link} href={previous.href} variant="standalone">
                  {previous.title}
                </TextLink>
              </span>
            ) : (
              <span />
            )}
            {next && (
              <span className="flex flex-col gap-1 sm:items-end">
                <span className="type-kicker text-muted">Next</span>
                <TextLink as={Link} href={next.href} variant="standalone">
                  {next.title}
                </TextLink>
              </span>
            )}
          </nav>
        )}
      </article>
      {withStrip && (
        <aside className="hidden xl:block">
          <div className="sticky top-24 flex flex-col gap-5 pt-14">
            <p className="type-kicker text-muted">On this page</p>
            <RouteStrip sections={sections} aria-label="On this page" />
          </div>
        </aside>
      )}
    </div>
  )
}

export function DocSection({
  id,
  title,
  intro,
  children,
  className,
}: {
  id: string
  title: string
  intro?: React.ReactNode
  children?: React.ReactNode
  className?: string
}) {
  return (
    <section aria-labelledby={id} className={cn("flex flex-col gap-8", className)}>
      <div className="flex flex-col gap-4">
        <h2 id={id} className="scroll-mt-24 type-display-lg text-text">
          {title}
        </h2>
        {intro && <Prose>{intro}</Prose>}
      </div>
      {children}
    </section>
  )
}

/** Running text: at most 66ch, inline code and lists styled. */
export function Prose({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        "flex max-w-[66ch] flex-col gap-4 type-body text-text",
        "[&_code]:rounded-md [&_code]:bg-surface-strong [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:text-[0.875em]",
        "[&_ul]:flex [&_ul]:list-disc [&_ul]:flex-col [&_ul]:gap-2 [&_ul]:ps-6",
        "[&_ol]:flex [&_ol]:list-decimal [&_ol]:flex-col [&_ol]:gap-2 [&_ol]:ps-6",
        className
      )}
    >
      {children}
    </div>
  )
}

/** A docs group's index: its pages as stations on one line. */
export function GroupIndex({ group }: { group: DocsGroup }) {
  return (
    <RouteList orientation="vertical" className="[--route-gap:--spacing(8)]">
      {group.pages.map((page) => (
        <RouteStop key={page.href} state="passed">
          <Link
            href={page.href}
            className="-mt-1 type-heading-md text-text underline-offset-4 hover:underline"
          >
            {page.title}
          </Link>
          <span className="max-w-[60ch] type-body-sm text-muted">{page.description}</span>
        </RouteStop>
      ))}
    </RouteList>
  )
}

/** A plain data table for specs. */
export function SpecTable({
  head,
  rows,
  className,
}: {
  head: React.ReactNode[]
  rows: React.ReactNode[][]
  className?: string
}) {
  return (
    <div className={cn("overflow-x-auto", className)}>
      <table className="w-full min-w-[36rem] border-collapse text-left">
        <thead>
          <tr className="border-b border-border-strong">
            {head.map((cell, i) => (
              <th key={i} scope="col" className="py-3 pe-6 align-bottom type-sign text-muted">
                {cell}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b">
              {row.map((cell, j) => (
                <td
                  key={j}
                  className="py-3 pe-6 align-top type-body-sm text-text [&_code]:rounded-md [&_code]:bg-surface-strong [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:text-[0.875em]"
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
