# 1. Bundles take stock from their components

Date: 2026-10-26 · Status: accepted

## Context

Danus wants to sell bundles (paket), such as a shirt and a keychain at one price, next to the same products sold on their own. A bundle could keep its own stock count, or take units from the products inside it.

## Decision

A bundle has no stock. Selling one holds units of each component's variant, on the same counters single items use, inside the same transaction. The buyer picks each component's variant, so one bundle covers every size. The bundle has its own fixed price.

In an order, a bundle is one item (`BundleItem`) that carries a copy of what it held (`contents`: product, variant, names, quantity per bundle). Releasing stock on expiry or cancellation reads that copy, never the current bundle. A bundle is handed over as one item.

## Consequences

- Bundles and single items can never oversell each other, and Danus doesn't split stock between them by hand.
- Editing or deleting a bundle never changes an existing order, so deleting a bundle is always allowed. A product inside a bundle can't be deleted until it leaves the bundle.
- `OrderItem` and `CartLine` are unions. Code that needs a variant from an item goes through `stockUnits` (lib/domain/order.ts), which expands bundles.
- A bundle can hold a product that is hidden from the catalog, for items sold only in a bundle.
