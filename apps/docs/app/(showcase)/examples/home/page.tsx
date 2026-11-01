import type { Metadata } from "next"
import Link from "next/link"
import { ArrowLeftIcon, DownloadSimpleIcon } from "@phosphor-icons/react/ssr"

import { ArticleLead, ArticleRow } from "@ppitsz/ui/components/blocks/article-card"
import { DepartureBoard, DepartureRow } from "@ppitsz/ui/components/blocks/departure-board"
import { SiteFooter } from "@ppitsz/ui/components/blocks/site-footer"
import { SiteHeader } from "@ppitsz/ui/components/blocks/site-header"
import { ThemeControl } from "@ppitsz/ui/components/blocks/theme-control"
import { Button } from "@ppitsz/ui/components/button"
import { Container } from "@ppitsz/ui/components/container"
import { Link as TextLink } from "@ppitsz/ui/components/link"
import { CampusLine } from "@ppitsz/ui/components/network/campus-line"
import { formatNumber } from "@ppitsz/ui/lib/format"
import {
  CabinetSlot,
  ORG_FOOTER_PROPS,
  ORG_LINKS,
  OrgBrand,
  SignInButton,
} from "@/components/docs/org-chrome"
import { SamplePhoto } from "@/components/docs/sample-media"
import { ARTICLES, CAMPUS_COUNTS, NOW, UPCOMING_EVENTS } from "@/lib/sample-data"

export const metadata: Metadata = {
  title: "Home (example)",
  description: "The PPIT Shenzhen home page composed from Jaringan.",
}

const totalMembers = CAMPUS_COUNTS.reduce((sum, c) => sum + c.members, 0)

const STATS = [
  [formatNumber(totalMembers), "registered members"],
  ["6", "campuses in Shenzhen"],
  ["8", "divisions"],
  ["2018", "year founded"],
]

export default function HomeExample() {
  const events = [...UPCOMING_EVENTS].sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime())
  const [next, ...rest] = events
  const [leadArticle, ...moreArticles] = ARTICLES
  return (
    <>
      <div className="border-b bg-surface">
        <Container className="flex min-h-11 flex-wrap items-center justify-between gap-x-4 py-1">
          <p className="type-caption text-muted">Example page · content is illustrative</p>
          <TextLink as={Link} href="/examples" className="inline-flex items-center gap-1.5 type-caption">
            <ArrowLeftIcon aria-hidden className="size-4" />
            Back to the docs
          </TextLink>
        </Container>
      </div>

      <div>
        <SiteHeader
          brand={<OrgBrand />}
          cabinet={<CabinetSlot />}
          links={ORG_LINKS}
          currentHref="/"
          account={<SignInButton />}
          menuExtras={<ThemeControl />}
        />

        <main id="content" tabIndex={-1} className="outline-none">
          {/* L1 — network hero */}
          <section aria-labelledby="hero-title" className="pt-12 pb-16 lg:pt-20">
            <Container className="flex flex-col gap-12">
              <div className="flex max-w-[64rem] flex-col gap-6">
                <p lang="id" className="type-kicker text-accent-text">
                  Perhimpunan Pelajar Indonesia di Tiongkok · Cabang Shenzhen
                </p>
                <h1 id="hero-title" lang="id" className="type-display-2xl text-text">
                  500+ pelajar. 6 kampus. Satu jaringan.
                </h1>
                <p lang="id" className="max-w-[46ch] type-lede text-muted">
                  Kami menghubungkan pelajar Indonesia di seluruh Shenzhen: acara, panduan hidup,
                  dan teman dari kampus mana pun.
                </p>
                <div className="flex flex-wrap items-center gap-x-6 gap-y-4">
                  <Button variant="primary" size="lg" nativeButton={false} render={<a href="#events" />}>
                    See upcoming events
                  </Button>
                  <TextLink variant="standalone" href="#about">
                    About PPIT Shenzhen
                  </TextLink>
                </div>
              </div>
              <CampusLine campuses={CAMPUS_COUNTS} />
            </Container>
            <figure className="mt-12 flex flex-col gap-3">
              <SamplePhoto
                photo="group"
                priority
                alt="PPIT Shenzhen committee members on campus steps with the organization's banner."
                sizes="100vw"
                className="aspect-[4/5] w-full object-cover sm:aspect-[3/2] lg:aspect-[21/9]"
              />
              <Container>
                <figcaption className="type-caption text-muted">
                  The committee on the campus steps. Photo: Media Kreatif division.
                </figcaption>
              </Container>
            </figure>
          </section>

          {/* L3 — departure board as a station screen */}
          <section id="events" aria-labelledby="events-title" className="tone-ink scroll-mt-16 py-16 lg:py-20">
            <Container className="flex flex-col gap-10">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div className="flex flex-col gap-3">
                  <p className="type-kicker text-muted">Departure board</p>
                  <h2 id="events-title" className="type-display-lg text-text">Upcoming events</h2>
                </div>
                <TextLink variant="standalone" href="#events">See all events</TextLink>
              </div>
              <DepartureBoard>
                {next && (
                  <DepartureRow
                    variant="next"
                    event={next}
                    now={NOW}
                    media={<SamplePhoto photo="batik" sizes="(min-width: 768px) 36rem, 100vw" />}
                  />
                )}
                {rest.slice(0, 3).map((event) => (
                  <DepartureRow key={event.slug} event={event} now={NOW} />
                ))}
              </DepartureBoard>
            </Container>
          </section>

          {/* About — heading left, text right */}
          <section id="about" aria-labelledby="about-title" className="scroll-mt-16 py-16 lg:py-24">
            <Container className="grid gap-8 lg:grid-cols-12 lg:gap-12">
              <h2 id="about-title" className="type-display-lg text-text lg:col-span-5">
                About us
              </h2>
              <div lang="id" className="flex max-w-[66ch] flex-col gap-5 lg:col-span-7">
                <p className="type-body-lg text-text">
                  PPIT Shenzhen adalah rumah bagi pelajar Indonesia di Shenzhen sejak 2018. Kami
                  mengadakan acara olahraga, budaya dan karier, membantu mahasiswa baru menyesuaikan
                  diri, dan menjadi penghubung dengan KJRI Guangzhou.
                </p>
                <p className="type-body-lg text-muted">
                  Setiap tahun, kepengurusan baru dibentuk dari anggota di keenam kampus.
                </p>
                <TextLink variant="standalone" href="#about" lang="en">Meet the committee</TextLink>
              </div>
            </Container>
          </section>

          {/* Numbers */}
          <section aria-label="PPIT Shenzhen in numbers" className="border-y bg-surface py-12">
            <Container>
              <dl className="grid grid-cols-2 gap-x-6 gap-y-10 lg:grid-cols-4">
                {STATS.map(([value, label]) => (
                  <div key={label} className="flex flex-col-reverse gap-2">
                    <dt className="type-sign text-muted">{label}</dt>
                    <dd className="type-numeral text-text">{value}</dd>
                  </div>
                ))}
              </dl>
            </Container>
          </section>

          {/* News — lead plus rows */}
          <section aria-labelledby="news-title" className="py-16 lg:py-24">
            <Container className="flex flex-col gap-10">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <h2 id="news-title" className="type-display-lg text-text">Latest news</h2>
                <TextLink variant="standalone" href="#">All news</TextLink>
              </div>
              {leadArticle && (
                <ArticleLead
                  article={leadArticle}
                  headingLevel="h3"
                  media={<SamplePhoto photo="night" sizes="(min-width: 768px) 36rem, 100vw" />}
                />
              )}
              <div className="border-t">
                {moreArticles.slice(0, 2).map((article) => (
                  <ArticleRow key={article.title} article={article} />
                ))}
              </div>
            </Container>
          </section>

          {/* Guidebook feature */}
          <section aria-labelledby="guide-title" className="pb-20">
            <Container>
              <div className="grid items-center gap-8 overflow-hidden rounded-xl bg-surface md:grid-cols-2">
                <SamplePhoto
                  photo="beach"
                  sizes="(min-width: 768px) 36rem, 100vw"
                  className="aspect-[3/2] h-full w-full object-cover"
                />
                <div className="flex flex-col gap-4 p-6 md:p-10">
                  <p className="type-kicker text-muted">Guidebook</p>
                  <h2 id="guide-title" className="type-heading-lg text-text">
                    Living in Shenzhen
                  </h2>
                  <p className="type-body text-muted">
                    From bank cards and SIMs to the metro and payments: everything to sort out in your
                    first month, in one document.
                  </p>
                  <Button className="self-start">
                    <DownloadSimpleIcon aria-hidden />
                    Download the guide (PDF)
                  </Button>
                </div>
              </div>
            </Container>
          </section>
        </main>

        <SiteFooter {...ORG_FOOTER_PROPS} currentHref="/" />
      </div>
    </>
  )
}
