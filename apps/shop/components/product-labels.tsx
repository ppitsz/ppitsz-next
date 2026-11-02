import { Badge } from "@ppitsz/ui/components/badge"
import { cn } from "@ppitsz/ui/lib/utils"

/** A product's labels ("New", "Spicy") as tags. */
export function ProductTags({ tags, className }: { tags: string[]; className?: string }) {
  if (tags.length === 0) return null
  return (
    <span className={cn("flex flex-wrap gap-1.5", className)}>
      {tags.map((tag) => (
        <Badge key={tag} variant="outline">
          {tag}
        </Badge>
      ))}
    </span>
  )
}

/** "Allergens: Coconut · May contain shellfish". */
export function Allergens({ allergens, className }: { allergens: string[]; className?: string }) {
  if (allergens.length === 0) return null
  return (
    <span className={cn("type-caption text-warning-text", className)}>
      <span className="text-text">Allergens:</span> {allergens.join(" · ")}
    </span>
  )
}
