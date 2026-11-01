import type { Metadata } from "next"

import { DocPage, GroupIndex } from "@/components/docs/doc-page"
import { getGroup } from "@/lib/nav"

const group = getGroup("foundations")

export const metadata: Metadata = { title: group.title, description: group.description }

export default function GroupPage() {
  return (
    <DocPage href={group.href} kicker="Jaringan" title={group.title} lede={group.description} sections={[]}>
      <GroupIndex group={group} />
    </DocPage>
  )
}
