import type { Metadata } from "next"

import { ArticleCompact, ArticleLead, ArticleRow } from "@ppitsz/ui/components/blocks/article-card"
import { DocPage, DocSection, Prose } from "@/components/docs/doc-page"
import { DoDont } from "@/components/docs/do-dont"
import { Example } from "@/components/docs/example"
import { SamplePhoto } from "@/components/docs/sample-media"
import { ARTICLES } from "@/lib/sample-data"

export const metadata: Metadata = { title: "Article card" }

const SECTIONS = [
  { id: "archive", label: "Archive" },
  { id: "compact", label: "Compact" },
  { id: "rules", label: "Rules" },
]

export default function ArticleCardPage() {
  const [lead, ...rows] = ARTICLES
  return (
    <DocPage
      href="/network/article-card"
      kicker="Network · article-card"
      title="Article card"
      lede="News: one lead article, then rows separated by hairlines. The kicker carries the category and, when a division wrote it, its line badge."
      sections={SECTIONS}
    >
      <DocSection id="archive" title="Archive" intro={<p>The lead has a 16:9 image beside the text and its title in type-display-lg. Rows have a two-line dek, a byline and an optional 3:2 thumbnail. The English article gets <code>lang=&quot;en&quot;</code> and an English byline automatically.</p>}>
        <Example
          layout="block"
          code={`<ArticleLead article={lead} media={<Image … alt="" />} linkAs={NextLink} />
<div className="border-t">
  {rows.map((a) => <ArticleRow key={a.href} article={a} linkAs={NextLink} />)}
</div>`}
        >
          <div className="flex flex-col gap-10">
            {lead && (
              <ArticleLead
                article={lead}
                headingLevel="h3"
                media={<SamplePhoto photo="night" sizes="(min-width: 768px) 24rem, 100vw" />}
              />
            )}
            <div className="border-t">
              {rows.map((article, i) => (
                <ArticleRow
                  key={article.title}
                  article={article}
                  media={i === 0 ? <SamplePhoto photo="group" sizes="12rem" /> : undefined}
                />
              ))}
            </div>
          </div>
        </Example>
      </DocSection>

      <DocSection id="compact" title="Compact" intro={<p>Title and date, for side lists.</p>}>
        <Example layout="block" code={`<ArticleCompact article={article} />`}>
          <div className="flex max-w-sm flex-col border-t">
            {ARTICLES.slice(0, 3).map((article) => (
              <ArticleCompact key={article.title} article={article} />
            ))}
          </div>
        </Example>
      </DocSection>

      <DocSection id="rules" title="Rules">
        <Prose>
          <ul>
            <li>Bylines follow the article's language: “By … · Oct 13, 2026 · 4 min read”; “Oleh … · 13 Okt 2026 · 4 menit baca”; “… · 2026年10月13日 · 阅读约4分钟”.</li>
            <li>Hover, focus and loading behave like the departure row.</li>
          </ul>
        </Prose>
        <DoDont
          dont={<p>A grid of three or more same-size article cards.</p>}
          doThis={<p>One lead, then rows.</p>}
        />
      </DocSection>
    </DocPage>
  )
}
