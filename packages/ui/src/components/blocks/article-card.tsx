import * as React from "react"

import { cn } from "@ppitsz/ui/lib/utils"
import { formatByline, formatLongDate, toShenzhenIso, type Locale } from "@ppitsz/ui/lib/format"
import type { LineCode } from "@ppitsz/ui/lib/network"
import { LineBadge } from "@ppitsz/ui/components/network/line-badge"

/*
 * Article card ("News"). An archive is one lead followed by rows —
 * never a grid of 3+ same-size cards. The card root gets lang={article.lang}
 * when the article's language differs from the page.
 */

export interface Article {
  title: string
  href: string
  dek: string
  category: string
  division?: LineCode
  author: string
  publishedAt: Date
  readingMinutes: number
  lang: Locale
}

const HTML_LANG: Record<Locale, string> = { id: "id", en: "en", zh: "zh-Hans" }

function Kicker({ article }: { article: Article }) {
  return (
    <p className="flex flex-wrap items-center gap-2">
      <span className="type-kicker text-accent-text">{article.category}</span>
      {article.division && (
        <LineBadge code={article.division} />
      )}
    </p>
  )
}

function Byline({ article }: { article: Article }) {
  return (
    <p className="type-caption text-muted">
      <time dateTime={toShenzhenIso(article.publishedAt)}>
        {formatByline({
          author: article.author,
          publishedAt: article.publishedAt,
          readingMinutes: article.readingMinutes,
          locale: article.lang,
        })}
      </time>
    </p>
  )
}

function rowClasses(extra?: string) {
  return cn(
    "group/row relative transition-colors duration-(--duration-fast) ease-out",
    "has-[[data-slot=row-link]:focus-visible]:outline-2 has-[[data-slot=row-link]:focus-visible]:outline-offset-2 has-[[data-slot=row-link]:focus-visible]:outline-focus",
    extra
  )
}

function TitleLink({
  article,
  linkAs,
}: {
  article: Article
  linkAs?: React.ElementType
}) {
  const Link: React.ElementType = linkAs ?? "a"
  return (
    <Link
      href={article.href}
      data-slot="row-link"
      className="outline-none underline-offset-4 after:absolute after:inset-0 group-hover/row:underline"
    >
      {article.title}
    </Link>
  )
}

interface CardProps {
  article: Article
  /** Page language; sets lang on the card when the article differs. */
  pageLang?: Locale
  media?: React.ReactNode
  linkAs?: React.ElementType
  className?: string
  headingLevel?: "h2" | "h3"
}

/** Lead: 16:9 image beside the text on desktop; title in type-display-lg. */
function ArticleLead({ article, pageLang = "en", media, linkAs, className, headingLevel = "h2" }: CardProps) {
  const Heading = headingLevel
  return (
    <article
      data-slot="article-lead"
      lang={article.lang !== pageLang ? HTML_LANG[article.lang] : undefined}
      className={rowClasses(cn("@container rounded-xl", className))}
    >
      <div className="grid gap-6 @2xl:grid-cols-2 @2xl:items-center @2xl:gap-10">
        {media && (
          <div className="aspect-video overflow-hidden rounded-xl bg-surface [&_img]:size-full [&_img]:object-cover">
            {media}
          </div>
        )}
        <div className="flex flex-col gap-4">
          <Kicker article={article} />
          <Heading className="type-display-lg text-text">
            <TitleLink article={article} linkAs={linkAs} />
          </Heading>
          <p className="max-w-[60ch] type-lede text-muted">{article.dek}</p>
          <Byline article={article} />
        </div>
      </div>
    </article>
  )
}

/** Row: title, 2-line dek, byline, optional 3:2 thumbnail. */
function ArticleRow({ article, pageLang = "en", media, linkAs, className, headingLevel = "h3" }: CardProps) {
  const Heading = headingLevel
  return (
    <article
      data-slot="article-row"
      lang={article.lang !== pageLang ? HTML_LANG[article.lang] : undefined}
      className={rowClasses(
        cn("@container border-b px-3 py-6 hover:bg-surface-strong sm:px-4", className)
      )}
    >
      <div className={cn("grid gap-4", media && "@lg:grid-cols-[minmax(0,1fr)_12rem] @lg:gap-8")}>
        <div className="flex min-w-0 flex-col gap-2.5">
          <Kicker article={article} />
          <Heading className="type-heading-lg text-text">
            <TitleLink article={article} linkAs={linkAs} />
          </Heading>
          <p className="line-clamp-2 max-w-[66ch] type-body-sm text-muted">{article.dek}</p>
          <Byline article={article} />
        </div>
        {media && (
          <div className="hidden aspect-[3/2] overflow-hidden rounded-xl bg-surface @lg:block [&_img]:size-full [&_img]:object-cover">
            {media}
          </div>
        )}
      </div>
    </article>
  )
}

/** Compact: title and date, for side lists. */
function ArticleCompact({ article, pageLang = "en", linkAs, className, headingLevel = "h3" }: CardProps) {
  const Heading = headingLevel
  return (
    <article
      data-slot="article-compact"
      lang={article.lang !== pageLang ? HTML_LANG[article.lang] : undefined}
      className={rowClasses(cn("flex flex-col gap-1 border-b py-3 hover:bg-surface-strong", className))}
    >
      <Heading className="type-ui text-text">
        <TitleLink article={article} linkAs={linkAs} />
      </Heading>
      <time dateTime={toShenzhenIso(article.publishedAt)} className="type-caption text-muted">
        {formatLongDate(article.publishedAt, article.lang)}
      </time>
    </article>
  )
}

export { ArticleLead, ArticleRow, ArticleCompact }
