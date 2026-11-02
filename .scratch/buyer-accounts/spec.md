# Buyer accounts and a new shop homepage

Status: resolved

The organisation's design (`docs/PPITSZ Store.pdf`) asks for a shop that feels like a store, not a list. It has an event hero, product cards, a "Halo, [name]" order tracker, a how-to-order band and a full footer. Today buyers have no account: an order belongs to whoever holds its link, and "Pesanan saya" only knows the orders saved on that phone.

Decided with the user on 2026-10-28.

## Decisions so far

- **Sign-in is email and password**, through our server like Danus staff sign-in, so it works in China without a VPN. Google sign-in was considered and left out because accounts.google.com needs a VPN in China. It could come later as an extra button.
- **An account is required to place an online order.** There is no guest checkout. Browsing the catalog needs no account, and walk-in sales at the kasir need none either.
- **Buying stays on each campaign's page.** The homepage entices people and links there, with no cart on the homepage.
- **The homepage has four sections:** a featured campaign hero, "Your orders" with progress, product highlights, and how to order with a fuller footer.
- **Out of scope:** reviews and ratings, allergens, "notify me when back", search, an English version, and the "Preparing" and "Ready" steps. Each needs its own feature.

## Words

- **Account** (*akun*): a buyer's email and password, with a profile holding their name, WeChat ID and phone. Every online order belongs to one account.
- **Buyer** changes meaning: a buyer now has an account. The **token** stays the order's secret link, but it no longer decides who owns the order.
- **Featured product** (*produk unggulan*): the product a campaign shows in the homepage hero.

## Accounts

- **Register** (`/daftar`) asks for:
  - name;
  - email;
  - WeChat ID;
  - phone, which is optional and only needed for Antar;
  - a password of at least 8 characters.

  If the email already has an account, the form says so and links to sign in.
- **Sign in** (`/masuk`) takes email and password. The session lives in its own cookie, separate from the staff cookie, for 14 days. Signing in returns the buyer to the page they came from, such as the checkout.
- **Forgotten password:**
  - `/lupa-sandi` asks Firebase to email a reset link.
  - The link opens our own page, `/atur-sandi`, which sets the new password through our server. Firebase's default reset page needs Google, so it isn't used.
  - **Needs one setting from you:** in the Firebase console, under Authentication › Templates › Password reset, the action URL must point to `https://<shop domain>/atur-sandi`.
- **Account page** (`/akun`): edit the profile, and sign out. The email can't be changed here.
- **Emails aren't verified before ordering**, because delivery to Chinese mailboxes is unreliable. The email is only used for password resets.
- **A Danus member** can register the same email as a buyer. Staff sign-in and buyer sign-in stay separate.

## Ordering

- **Checkout requires sign-in.**
  - Opening `/<campaign>/checkout` signed out sends the buyer to `/masuk` and brings them back afterwards. The cart is kept on the phone, so it survives.
  - On the catalog, the button that leads to checkout says "Masuk untuk memesan" while signed out.
- **Checkout starts with the profile filled in** (name, WeChat ID, phone). Whatever the buyer submits is saved back to the profile.
- **The order keeps a copy of the buyer** (name, WeChat ID, phone and now email) plus the account's id.
- **The unpaid-orders limit** counts per account instead of per WeChat ID. The per-device limit stays.
- **The order page `/pesanan/<token>` still opens with its link**, signed in or not. Danus's WeChat messages and the QR rely on it.
- **"Pesanan saya" (`/pesanan`)** becomes the account's order list, split into **Aktif** (waiting for payment, being checked, paid but not yet collected or delivered) and **Selesai** (collected, delivered, cancelled, expired). Signed out, it asks the buyer to sign in.
- **Removed:**
  - "Cari pesanan", which looked up an order by code and WeChat ID;
  - the list of orders saved on the phone.

  Every order now belongs to an account, so neither is needed.
- **Danus side:** the order detail shows the buyer's email next to WeChat ID and phone. Nothing else changes for staff.

## Homepage (`/`)

1. **Featured campaign hero.** This is a dark band (`tone-ink`) for the first open campaign in Danus's order.
   - **Left side:**
     - the campaign's phase badge;
     - its name in `type-display-2xl`, with its tagline;
     - three facts: when online ordering is open, how buyers receive orders (the Antar slots, pickup info and/or booth), and the delivery fee;
     - the primary button "Lihat katalog", and "N hari lagi" until online ordering closes.
   - **Right side:** a card for the campaign's **featured product**. It shows:
     - the image and name;
     - the price, as "mulai ¥…" when variants differ;
     - a stock bar ("Sisa 23 dari 60");
     - the close date;
     - a button to the product on the campaign page;
     - "Juga di paket": the bundles that hold it.

     With no featured product set, the card shows the campaign's cover photo. Admins pick the featured product in Pengaturan ("Produk unggulan"), and it's optional.
   - **Other open campaigns** are listed under the band as compact rows, as today.
2. **Your orders.**
   - **Signed in:**
     - "Halo, {name}." with a one-line summary, such as "1 pesanan siap diambil" or "1 pesanan menunggu pembayaran";
     - up to four active orders as cards, each with its code, campaign, date, total and status badge;
     - the order's route (Pesan › Bayar › Verifikasi › Ambil, or Antar);
     - the first items;
     - the place and time (pickup info, or the Antar slot);
     - one action that fits: Bayar, Tunjukkan QR, or Lihat pesanan;
     - "Semua pesanan" links to `/pesanan`.
   - **Signed out:** a short panel, "Masuk untuk memesan dan melihat progres pesananmu", with Masuk and Daftar.
3. **Product highlights** ("Di toko sekarang").
   - Product cards from every open campaign: image, name, campaign, price, and a stock line with a bar.
   - Badges where one applies: **Segera** for upcoming sale dates, **Hampir habis** at 5 or fewer left, **Habis** when sold out.
   - Chips filter by category and **Paket**. Bundles appear as cards with their contents.
   - Each card links to that product on its campaign page. Products whose sale has ended are left out, as in the catalog.
4. **How to order, and the footer.**
   - **A dark band** with three numbered steps: order and pay by transfer; Danus checks the proof; delivery, or showing the QR at pickup. These follow what the open campaigns offer.
   - **Under the steps:** a strip with the pickup places and Antar slots of the open campaigns, and "Lihat pesananku".
   - **The footer** has the brand line, plus columns for Toko (open campaigns), Bantuan (Cara memesan, Pesanan saya, Akun) and Kontak.
   - **Contact details:** the footer shows WeChat, Instagram and email only once they're filled in. They live in one place in the shop app, `lib/contact.ts`. **Needs from you:** the real WeChat ID, Instagram handle and email.

**Header:** the links Penjualan and Pesanan saya, plus the account slot: "Masuk" signed out, or the buyer's name (linking to `/akun`) signed in.

**Campaign page:** each product gets an anchor, so homepage cards can link straight to it.

## Data

- **New collection `buyers/{uid}`:** name, wechatId, phone, email, createdAt.
- **`Order`** gains `buyerUid`, and `buyer.email`.
- **`Campaign`** gains `featuredProductId?`.
- **Seed:** a demo buyer account (`pembeli@contoh.test`) owns the sample orders. The local emulator data must be wiped and reseeded.

## Testing

- **Unit tests:** the profile check (name, WeChat ID, phone, password length), the order list split into Aktif and Selesai, and the homepage summary line.
- **Emulator tests:**
  - register, sign in and a wrong password;
  - a password reset through the emulator's out-of-band codes;
  - an order made without an account is refused;
  - an order is stored with `buyerUid`;
  - "Pesanan saya" lists only the account's orders;
  - the unpaid limit per account.
- **Smoke run:** the homepage signed out and signed in, the checkout redirect, and the account pages.

## Comments

**2026-10-28, implemented.**

What differs from the plan above:

- **Seed:** the seed makes no sample orders, so the demo buyer (`pembeli@contoh.test` / `pembeli-demo`) starts empty. GumamChan's featured product is Nasi Kuning. Merch has none, to show the cover-photo fallback.
- **After a password reset** the buyer signs in again, rather than being signed in at once: the reset revokes every session, this device's included.
- **The order copies the account onto `buyer`** (`buyer.uid`, `buyer.email`); a top-level `buyerUid` field serves the queries (`firestore.indexes.json`: `buyerUid` + `createdAt`).
- **The homepage shows four active orders at most**; the rest are in Pesanan saya.
- **Product cards** show "Di booth saja" for stock only the booth can sell, besides Segera, Hampir habis and Habis.
- **The hero** steps its title down one size when a word is longer than eight letters, so a name like GumamChan doesn't break mid-word.
- **Also fixed:** `buttonVariants()` from `@ppitsz/ui` now merges its classes. Links styled as buttons, including existing dashboard ones such as "Buat penjualan baru", had lost their outline because the base `border-transparent` beat the variant's border.

**Verification:**

- **Checks:** guardrails, typecheck, lint and build pass.
- **Tests:** 141 unit tests and 77 emulator tests pass. The emulator tests include `lib/server/buyers.test.ts` and new store tests for profiles, account orders and the featured product.
- **Smoke run:** 48 page checks against the built app, signed out, as a buyer and as staff.
- **Screenshots:** headless Edge screenshots of the homepage, Masuk and Pesanan saya at desktop width, and the homepage and Pesanan saya at 390px.
- **Not covered:** register, checkout and the reset form were not submitted by clicking in a browser. They are covered by the emulator tests at the store and auth level.
