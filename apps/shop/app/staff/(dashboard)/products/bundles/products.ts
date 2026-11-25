import type { Product } from "@/lib/domain/types"
import type { BundleFormProduct } from "@/components/staff/bundle-form"

/** What the bundle form needs of each product it can choose from. */
export function bundleFormProducts(products: Product[]): BundleFormProduct[] {
  return products.map((p) => ({
    id: p.id,
    name: p.name,
    active: p.active,
    fromFen: Math.min(...p.variants.map((v) => v.priceFen)),
    pickupPointIds: p.pickupPointIds,
  }))
}
