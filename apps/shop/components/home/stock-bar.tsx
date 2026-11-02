import { cn } from "@ppitsz/ui/lib/utils"
import { LOW_STOCK } from "@/lib/home"

/**
 * "23 of 60 left" with a thin bar of what is left. The words carry the
 * meaning; the bar is decoration.
 */
export function StockBar({ left, total, className }: { left: number; total: number; className?: string }) {
  const low = left <= LOW_STOCK
  const percent = total > 0 ? Math.min(100, Math.round((left / total) * 100)) : 0
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <span className={low ? "type-caption text-warning-text" : "type-caption text-success-text"}>
        {left === 0 ? "Sold out online" : `${left} of ${total} left`}
      </span>
      <span aria-hidden className="h-1 overflow-hidden rounded-full bg-surface-strong">
        <span className={cn("block h-full", low ? "bg-warning" : "bg-success")} style={{ width: `${percent}%` }} />
      </span>
    </div>
  )
}
