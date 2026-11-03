import { Container } from "@ppitsz/ui/components/container"
import { BrandLink } from "@/components/docs/brand-link"
import { DocsFooter } from "@/components/docs/docs-footer"
import { DocsHeader } from "@/components/docs/docs-header"
import { DocsSidebar } from "@/components/docs/docs-sidebar"

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <DocsHeader brand={<BrandLink />} />
      <Container className="lg:grid lg:grid-cols-[13rem_minmax(0,1fr)] lg:gap-12">
        <aside className="hidden lg:block">
          <div className="sticky top-17.5 max-h-[calc(100dvh-4.375rem)] overflow-y-auto pe-2">
            <DocsSidebar />
          </div>
        </aside>
        <main id="content" tabIndex={-1} className="min-w-0 outline-none">
          {children}
        </main>
      </Container>
      <DocsFooter />
    </>
  )
}
