# Several campaigns at once: the shop

Status: resolved

GumamChan becomes **shop** (`apps/shop`, later `https://shop.ppitshenzhen.org`), the sales site of PPIT Shenzhen. Several campaigns can be open at once on one domain. The first two are **gumamchan** (mostly food) and **merch**. Any campaign may hold any mix of products: food or merch stays a product's category, never a property of the campaign.

Decided with the user on 2026-10-26.

## Order of work

1. **Rename, in its own step**, with no behaviour change:
   - `apps/gumamchan` → `apps/shop`, package `shop`;
   - `demo-gumamchan` → `demo-shop`;
   - `GumamError` → `ShopError`;
   - staff cookie `gumamchan_staf` → `shop_staf`, and the localStorage keys likewise;
   - docs, README, glossary and ADR updated to match.

   The interface says **Toko PPIT Shenzhen**. "GumamChan" survives only as the food campaign's name and in the seed. No migration: nothing is live, local emulator data is wiped and seeded again.
2. **Multi-campaign**, below.

## Model

- **A campaign is one sale period** (as today), with new fields:
  - **slug** (URL name, e.g. `gumamchan`). Unique among Draf and Dibuka campaigns. A new campaign may take the slug of a Selesai one; the old catalog is then unreachable by that name, while its orders still open through `/pesanan/[token]`. The slug is changeable until the campaign's first order. It can't be a path the site uses itself: `pesanan`, `danus`, `media`, `api`.
  - **code prefix**, 2–3 letters (`GC`, `MR`). Unique among campaigns and fixed after the first order. Order codes stay unique across the site (`orderCodes/{code}`), and the scanner accepts any prefix, including existing `GC-` codes.
  - **tagline** and **cover image**, for the campaign's card on the main page and its catalog header.
  - **display order** on the main page.
  - **status**:
    - **Draf:** hidden from buyers (404), but signed-in staff can preview it.
    - **Dibuka:** listed. Within it, the pre-order dates decide what the card says: "Segera dibuka", "Pre-order dibuka" or "Beli di booth".
    - **Selesai:** off the list. Its page says "Penjualan sudah selesai", with no checkout. Its orders keep working.
- **Staff:** the same Danus staff and roles (admin, booth) for every campaign. No per-campaign access.
- **One cart per campaign.** Each campaign keeps its own payment accounts, payment window and pickup info. A buyer who wants food and merch places two orders.

## Buyers

- **`/`:** the Dibuka campaigns as cards, always a list, even with only one.
- **`/[slug]`:** the catalog. **`/[slug]/checkout`:** the checkout.
- **`/pesanan/[token]`:** unchanged, independent of campaign, so links and QR codes already sent keep working.
- **`/pesanan`:** this phone's saved orders from every campaign.
- **The cart in localStorage** is keyed by campaign.

## Dashboard (`/danus`)

- **Shared across every campaign**, with each row naming its campaign:
  - Verifikasi (and the queue count in the header);
  - Scan;
  - Pesanan, with a campaign filter;
  - the printed pickup list (paid orders of every Dibuka campaign, by buyer name).
- **Per campaign**, picked with a switcher at the top and remembered per device in a cookie, so server pages know it:
  - **Kasir:** the switcher lists Dibuka campaigns only.
  - **Produk.**
  - **Rekap and its CSVs**, plus a **"Semua penjualan" money row** summing money across Dibuka campaigns.
  - **Pengaturan:** its schedule, accounts, slug, prefix, tagline, cover, order and status.
- **Same booth:** gumamchan and merch sell at the same SZ Cup booth. A buyer wanting both gets two quick kasir sales, one per campaign, after switching.
- **"Buat penjualan baru"** can be used any time. It can copy payment accounts from an existing campaign; products are added fresh.

## Seed

Two campaigns:
- **gumamchan:** the food products (nasi kuning, risoles, seblak, es teh). Prefix `GC`.
- **merch:** the shirt with its size chart, the keychain and the merch bundle. Prefix `MR`.

## To record

- An ADR on "a campaign is one sale period; slugs are reused after Selesai".
- In the glossary: update Campaign, and add the shop (Toko), Slug, Code prefix and the campaign statuses.

## Comments

**2026-10-27, implemented.**
- **Rename:** done as its own step, with no behaviour change. The app is `apps/shop`, the Firebase demo project `demo-shop`.
- **Multi-campaign:** built as specified above.
- **Records:** the decision is in `docs/adr/0002-a-campaign-is-one-sale-period.md`, and the glossary is updated.
- **Verified:** guardrails, typecheck, lint and the build pass, with 106 unit tests, 59 emulator tests and a 25-page smoke run against the seeded emulators.
- **Not covered:** a browser click-through of the switcher, the new-campaign form and the kasir switch.
