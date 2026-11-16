# PPITSZ Shop (shop)

PPIT Shenzhen's sales site, later at `https://shop.ppitshenzhen.org`. Several campaigns run at once, each at its own address: **GumamChan** for food (`/gumamchan`) and **Merch** (`/merch`), and any future mix of food and merchandise. Buyers sign in with their account, pick a campaign, order online, transfer and upload proof; the order is then **delivered** (Delivery) or **collected** with a QR code (Pickup). Staff verify payments, delivers or scans QRs, and records walk-in sales at the booth. First used at SZ Cup, 17 March 2027.

Built on the Jaringan design system (`@ppitsz/ui`). Runs on port **3001** (the docs site has 3000).

## How it works

- **A campaign is one sale period** with its own products, bundles, online order dates, ways of selling, delivery slots and fee, payment accounts and pickup info. It has a URL name (`/gumamchan`), an order code prefix (`GC`), a tagline, a cover photo, a display order and a status:
  - **Draft:** hidden from buyers. Signed-in staff open it from the homepage's Drafts list or Settings' **Open draft**, and can order in it whatever its dates: those are **test orders** (below).
  - **Open:** listed on `/`; buyers can order online, from the optional open date until the optional close date. The first open campaign leads the homepage, with its **featured product** (optional; its cover photo otherwise).
  - **Ended:** off the list, with no checkout; its orders keep working.

  It offers any of three ways of selling, at least one: **Delivery** (online orders delivered), **Pickup** (online orders collected at the pickup place) and **Booth** (walk-in sales at the register).

  The URL name and prefix are fixed once the campaign has an order. A new campaign may reuse the URL name of an ended one, so next year's food sale can be `/gumamchan` again (see `docs/adr/0002-a-campaign-is-one-sale-period.md`). Each campaign has its own cart: a buyer of food and merch places two orders.

```
pending_payment ──proof──▶ awaiting_verification ──approve──▶ paid ──scan or delivered──▶ picked_up
       ▲                          │
       └────────reject────────────┘
pending_payment past its deadline → expired · any open order → cancelled
a paid delivery order can go out with a courier first: still paid, with a tracking number
walk-in sales are created as picked_up
```

- **delivery orders** carry the buyer's address (typed in full), a phone number, the campaign's flat delivery fee (added once to the total) and a delivery slot. A slot can have a maximum number of orders: a full slot, or one that has started, can't be picked. The limit is counted in the checkout transaction from the live orders in that slot, so expired and canceled orders and overdue holds free their place. A delivery order is delivered whole; pickup orders can still be handed over in parts.

- **One module decides every status change**: `lib/domain/lifecycle.ts` says who may approve, reject, hand over, cancel or expire an order, from which status, and what changes. Pages ask it which buttons to show, so a button never offers what the server would refuse.
- **Stock** is two counters per variant: units taken by online orders and units sold at the booth. Each variant has an **online cap**, so part of the stock is always left for walk-ins. A cap of 0 means "booth only". A campaign without a booth ignores the cap.
- **Bundles** sell several products at one fixed price. A bundle has no stock of its own: each one sold takes units from its components, so bundles and single items can never oversell each other. The buyer (or the register) picks each component's size or flavor. Orders keep a copy of what their bundles held, so editing or deleting a bundle never changes an order, and expiry or cancellation returns every unit.
- **Size charts** are a measurement table typed per product (columns such as Chest width, one row per size, in cm) with a fit note and an optional image. Buyers open them from a "Size chart" button in the catalog and in bundles that contain the product.
- **Unpaid orders expire** after the campaign's payment window (default 2 hours) and give their stock back. An overdue order never blocks a sale: checkout and the register expire overdue orders in the same transaction that takes stock, and reading an order or listing products and orders expires them first. A daily cron tidies up campaigns nobody is looking at.
- **Test orders try a draft out.** Every order staff place in a draft campaign is a test order (`test: true`): it takes stock and goes through proof, verification, scanning and delivery like a real one, skips the unpaid-orders limit, and is labeled Test on every page. Settings → **Delete test orders** deletes them whatever their status, with their codes, checkouts and proofs, and gives back the stock they still take. A campaign can't leave Draft while it has test orders, so none reach a live sale.
- **A WeChat Pay or Alipay proof carries the last 6 digits of its transaction number**, the main way we find the transfer; the screenshot is the backup. Picking one of those accounts pops up a reminder to type the digits of their own payment. Exactly 6 digits, or a pasted whole number (16 to 40 digits) cut to its last 6; a bank transfer needs none. Staff see the digits on the verify card and the order page and can search orders by them (or by the whole number from a bill), and the verify card warns when another order's proof carries the same digits.
- **A rejected proof stays on record.** The buyer sees the latest reason; staff see every rejection on the order page. After rejecting, the dashboard shows a ready-made WeChat message (reason, amount, new deadline, order link) for staff to copy to the buyer, since the app can't message buyers itself.
- **Refunds are recorded, not sent.** We send money back in WeChat, Alipay or the bank app, then records the amount and method on the canceled order, once. What is owed includes the delivery fee of a delivery order that wasn't delivered. The buyer's order page shows it, and the recap lists canceled orders still waiting for their money.
- **Buyers have a PPITSZ account** (email + password, signed in on PPITSZ Account through our server, so no VPN is needed; ADR 0008), and ordering online needs one; browsing doesn't. It's the same account and the same sign-in as Forms and the Shop dashboard. Its profile (`users/{uid}`, shared with the old website: name, WeChat ID, phone; ADR 0014) fills checkout, which asks for whatever is missing and saves it back, and every online order belongs to one account: Your orders and the homepage list them with their progress. An order's page is still reached by its secret token (in the link and the QR), signed in or not, since our WeChat messages and the QR rely on it. Its short code (`GC-7K3P`, starting with its campaign's prefix) goes in transfer notes and serves as a fallback at the booth. A code typed without its prefix is looked up under every campaign's.
- **The browser never talks to Google.** Every Firebase call goes through the server with the Admin SDK, and images are streamed through `/media`. Buyers in China without a VPN only need to reach our domain. For the same reason, the security rules deny all client access.

| Path | What |
|---|---|
| `lib/domain/` | Types and business rules, pure TypeScript and unit-tested: `campaign.ts` (campaign settings rules, URL names and prefixes, ways of selling and slots, where a campaign stands), `delivery.ts` (Delivery and Pickup: slots and their limits, the delivery list, the status buyers see), `lifecycle.ts` (status changes, refunds, and who may make them), `cart.ts` (cart limits, shared with the shop and register), `payment.ts` (which account a payment went to), `product.ts` (product and size chart edit rules, shared with the product form), `bundle.ts` (bundle edit rules and how many bundles stock can make, shared with the bundle form and the shop), `order.ts` and `stock.ts` (pricing, codes, deadlines, counters, what a refund owes), `recap.ts` (the sales recap and pickup list), `export.ts` (the recap as CSV) |
| `lib/store/` | Firestore and Storage access. Every stock or status change runs in a transaction. Integration-tested against the emulators. `media.ts` holds uploads and their file rules. |
| `lib/actions/buyer.ts` | Buyer server actions: checkout (signed in, idempotent per checkout id), proof upload |
| `lib/actions/staff.ts` | Staff server actions: sign in/out, approve, reject, cancel, record a refund, scan and hand over, send by courier and mark delivered, register sales and undo. Each checks the session itself; the lifecycle checks the role. |
| `lib/actions/admin.ts` | Admin server actions: products (with photos and size charts), bundles, campaigns (address, status, ways of selling, delivery slots and fee, schedule, cover, payment accounts with QR images), the test alert |
| `lib/actions/state.ts` | The result every form action returns, and how domain errors become messages |
| `lib/server/` | Server-only request code: staff roles and sessions from the shared PPITSZ account (`staff.ts`, `auth.ts`, on `@ppitsz/accounts`), the dashboard's picked campaign (`dashboard-campaign.ts`), which campaigns a visitor may see (`buyer-campaign.ts`), the buyer's device cookie and client address (`request-meta.ts`), error alerts (`alerts.ts`, fed by `instrumentation.ts`), and the public origin |
| `lib/client/` | Browser-only code: the cart and the last delivery address in localStorage, visible-tab polling, image shrinking before upload, the cart summary |
| `lib/*.ts` | Shared by server and browser: the buyer's catalog, the homepage's cards and featured product (`home.ts`), the footer's contact details (`contact.ts`), the sentences about a campaign and its slots (`campaign-copy.ts`), order links, messages for buyers (`buyer-message.ts`), Shenzhen time, staff role names |
| `lib/store/rate-limit.ts` | Spam limits: request counters in Firestore |
| `app/(public)/` | Buyer pages: `/` the homepage (hero, your orders, what is on sale, how to order) · `/[slug]` a campaign's catalog · `/[slug]/checkout` (signed in) · `/orders/[token]` order and QR · `/orders` the account's orders and sign-out · `/sign-in`, `/sign-up`, `/forgot-password`, `/reset-password` and `/account` only redirect (to PPITSZ Account, or `/orders`) |
| `app/staff/` | Dashboard: `/staff/sign-in` (redirects to PPITSZ Account) · `/staff/no-access` (signed in without a shop role) · `/staff/verify` payment queue · `/staff/scan` booth scanner · `/staff/delivery` delivery list · `/staff/register` walk-in sales · `/staff/orders` order list and detail · `/staff/recap` sales recap · `/staff/products` products and bundles (`/staff/products/bundles/[id]`) · `/staff/settings` campaign settings · `/staff/proofs/[id]` proofs (staff only) · `/staff/print/pickup` printable pickup list · `/staff/print/delivery` printable delivery list · `/staff/export?kind=orders\|products` CSV export |
| `app/media/`, `app/api/cron` | Public images · expiry cron |
| `app/api/orders/[token]`, `app/staff/queue` | What open pages poll: an order's version (buyer page) and the proof queue count (dashboard) |

## Shop staff

Staff open `/staff` and sign in on PPITSZ Account with email + password (ADR 0008). The password goes to our server, which sets the shared session cookie, so the browser never contacts Google. A booth phone signs in once before the event and then works without a VPN; it is signed in to every app as that person.

| Role | Can |
|---|---|
| `admin` | Everything: verify payments, cancel orders and sales, scan, deliver, register, products, settings |
| `booth` | Scan QRs and hand over orders, deliver delivery orders (courier and tracking number, Mark delivered), sell at the register and undo their own sale within 30 minutes, view orders and proofs |

One PPITSZ account per person, shared with Forms and with buying in the shop, and one sign-in on PPITSZ Account for all of them (ADR 0008). The role is kept in Firestore (`roles.shop` on `users/{uid}`, ADR 0014), not as a custom claim, and is read on every request (ADR 0004).

Roles are given and removed by a Portal admin in PPITSZ Account (`apps/account`, Accounts), and every change is logged. The script still works, against the real project (the `FIREBASE_*` variables in `.env.local`), and logs its changes too:

```bash
bun scripts/staff.ts add nadia@example.com admin "Nadia"   # sets the role; a new account gets a printed password
bun scripts/staff.ts password nadia@example.com            # prints a new password and signs them out everywhere
bun scripts/staff.ts remove nadia@example.com              # takes the role away at once; the account stays
bun scripts/staff.ts list
```

Running `add` for an existing email (a Forms organizer, a buyer) only sets the role: they keep their password.

## Booth scanner

`/staff/scan` reads the QR on the buyer's phone with the camera, shows the order, and hands over the ticked items. Every item is ticked by default, and food and merch can be collected separately. Scanning a collected order again shows who handed it over and when. The QR is decoded on the phone (with the browser's BarcodeDetector, or jsQR on Safari), so scanning uses no extra network.

The live camera needs HTTPS or `localhost`. When a phone opens the dev server over the LAN (`http://192.168.x.x:3001`), the camera is blocked. Use **Take or choose a photo of the QR code** instead (a photo or screenshot of the QR), or type the code. Both also work at the booth if camera permission is denied.

Scanning a delivery order says it is meant for delivery and shows its slot and address. If the buyer comes to collect it anyway, it is handed over whole.

## Delivery

`/staff/delivery` (every staff member) lists the paid delivery orders of every campaign that aren't delivered yet, grouped by slot, with the buyer's phone, address and items. A staff member who delivers by hand taps **Mark delivered**. For a courier (SF Express, 闪送…), **Send by courier** records the courier and tracking number: the buyer's page shows them, and the dashboard offers a ready-made WeChat message with the tracking number. Saving it again corrects a typo. **Print delivery list** (`/staff/print/delivery`) prints the list, one page per slot, for a delivery run.

## Register

`/staff/register` records walk-in sales, for open campaigns with a booth. Tap a product to add it, choose Cash, WeChat or Alipay, and save. The stock goes down at once, taken from what is left after online orders. For cash, typing the amount received shows the change. Each sale gets an id when the cart is filled, so a double tap or a retry on a bad connection sells only once. A mistake can be undone from "Recent sales on this phone": booth staff can undo their own sale for 30 minutes, and admins any sale from its order page. The stock shown refreshes every 30 seconds and after every sale, so two register phones stay in step.

## Recap

`/staff/recap` (admins) counts the picked campaign from its orders, and, with several campaigns open, adds an **All campaigns** table with each open campaign's money and the total:

- **Money:** sales (paid online orders and booth sales, delivery fees included and also shown on their own), everything that came in, what was refunded, and what we should hold now ("We should hold"). Then the same per payment account, to check against each account's statement and the cash box. Proofs not checked yet and unpaid online orders are shown apart, not counted. Sold orders are counted by fulfillment: Delivery, Pickup, Booth.
- **What was sold:** per bundle and per variant, online and booth, with revenue at the prices ordered.
- **Stock and pickup:** per variant, units sold including those inside bundles, handed over, still to collect, held by unpaid orders, and what is left, plus how many paid orders are still to collect or to deliver.
- **Refunds owed:** canceled orders whose money hasn't gone back yet.

Two CSV downloads: every order item (for filters and pivot tables, with each order's fulfillment and, for delivery, its fee, address, slot, courier, tracking number and delivery time), and the per-variant recap. They are UTF-8 with a BOM, comma-separated. If Excel puts everything in one column (Indonesian regional settings expect `;`), open the file with Data → From Text/CSV, or in WPS or Google Sheets.

**The pickup list** (`/staff/print/pickup`, every staff member, linked from Scan) is the paper backup for the booth: paid pickup orders still to collect, by buyer name, with a tick box per order. Print it, or save it as PDF on the booth phone, just before the event. It only knows the orders paid before it was made.

## Products and settings

Admins manage the catalog at `/staff/products`: name, description, category, photo, size chart (for merchandise), up to three labels ("New", "Spicy", "Weekly"; shown on the catalog row and the homepage card), allergens (shown with the product, and a food category holding any gets an allergy note in the catalog), display order, optional sale dates for a seasonal item (before the start it shows as "From …" and can't be ordered; from the end it leaves the catalog and the register; checkout and the register refuse it outside its dates), and for each option (size, flavor) its price, stock and online cap (hidden for a campaign without a booth). A save never overwrites the counters that orders keep, so editing during a sale is safe. Stock can't go below what is already ordered and sold, an option that was ordered can't be removed, and a product that was ordered can't be deleted (untick **For sale** to hide it instead). Photos are shrunk in the browser to 1200 px and served through `/media`.

`/staff/settings` holds the picked campaign: its name, URL name, code prefix, tagline, cover photo, featured product, status and display order, its ways of selling (Delivery, Pickup, Booth), the pickup place and time, the delivery fee and slots (date, from, to, optional maximum), when online orders open and close (Shenzhen time, both optional), the payment window, and the payment accounts with their 收款码 QR images. **Create new campaign** starts a campaign as a draft and can copy another campaign's payment accounts; their QR images are copied too, so each campaign owns its files. **Delete campaign** removes a campaign with no orders yet (a test or a mistake), with its products, bundles and images; one with orders can only be ended.

## Several campaigns in the dashboard

The same shop staff and roles work on every campaign.

- **Shared:** Verify, Scan, Delivery, Orders (with campaign and fulfillment filters), the pickup list and the delivery list cover every campaign; each row names its campaign.
- **Per campaign:** Register, Products, Recap and Settings work on the campaign picked in the switcher at the top of the page, remembered on each device. The register lists only open campaigns with a booth. When food and merch sell at the same booth, a buyer of both gets two quick sales, one after switching.

## Spam limits

Every unpaid order holds stock for the payment window, so:

- One account may hold **2** unpaid orders and one device **3** (`lib/domain/order.ts`). Orders past their deadline don't count, whether or not they have been expired yet. A device is a random id in a year-long cookie.
- Requests are counted per device, per client address and per email (`lib/store/rate-limit.ts`). Per 10 minutes: checkout 10 per device and 60 per address. Per hour: proof uploads 10 per order. The address limits are generous because a whole dormitory can share one address. Sign-in, sign-up and password reset limits live on PPITSZ Account (`apps/account/lib/server/rate-limit.ts`).

When testing checkout locally, register another account after two unpaid orders.

## Live updates

Open pages poll small endpoints instead of holding a connection open:

- The buyer's order page checks its order every 10 to 60 seconds (one read each time) and re-renders only when something changed. The QR appears after approval, and a courier's tracking number once staff enter it, without a reload.
- Admin dashboards check the proof queue every 20 seconds, update the Verify count and announce new proofs.

Polling pauses while the tab or the phone screen is hidden.

## Local development

Development connects to the **real Firebase project**, `ppitsz`, like production: there is no emulator. It is the old website's project too (ADR 0013), so everything you do locally (orders, accounts, role changes, password resets) happens to real data the live old site also uses. Copy `.env.example` to `.env.local` and fill in the `FIREBASE_*` variables (the same five in the shop, Forms and PPITSZ Account).

```bash
bun run dev          # from the repo root: the shop on http://localhost:3001 (dashboard at /staff), PPITSZ Account on :3003 for signing in
```

Sign in with a real account. On localhost, cookies ignore ports, so signing in on :3003 signs you in on :3001 and :3002 too.

## Tests

```bash
bun run test            # business rules, no emulator needed
bun run test:emulator   # Firestore/Storage integration: starts and stops the emulators itself
```

The integration tests use their own fixed data (`lib/store/test-data.ts`) and a throwaway emulator on its own ports (`firebase.test.json`: Firestore 8180, Storage 9299, Auth 9399), started and stopped by `test:emulator`. It is the only place an emulator is used: the tests wipe the database before every test, so they must never run against `ppitsz`. Needs Java 21+.

The integration tests cover the situations that matter on the day: buyers racing for the last units, two scanners on one QR, expiry releasing stock, rejected proofs, walk-ins, undoing a register mistake, a double-tapped sale, product edits racing orders, bundles sharing stock with single items, refunds, delivery slots filling up and freeing again, courier hand-offs, campaigns without a booth, the unpaid-order and rate limits, and accounts (staff roles on the shared session, a password reset signing out every device, an order needing an account, the role change log and the Portal admin guards).

## Production

Set these on Vercel:

| Variable | |
|---|---|
| `FIREBASE_PROJECT_ID` | `ppitsz`, shared with Forms, PPITSZ Account and the old website (ADR 0013) |
| `FIREBASE_CLIENT_EMAIL` | From a service account key |
| `FIREBASE_PRIVATE_KEY` | Same key; paste as is, `\n` escapes are fine |
| `FIREBASE_STORAGE_BUCKET` | Defaults to `<project>.firebasestorage.app` |
| `FIREBASE_API_KEY` | The project's Web API key (Project settings). Enable Email/Password in Authentication. |
| `ROOT_DOMAIN` | Unset. On Vercel the apps are `<app>.ppitshenzhen.org` (ADR 0010); set it only to move them to another root, like a preview branch |
| `CRON_SECRET` | Any long random string, for `/api/cron` |
| `ALERT_WEBHOOK_URL` | Optional. A group chat webhook for server errors, see below |

Create Firestore and the Storage bucket in **Hong Kong (`asia-east2`)**. The location can't be changed later, and the functions run in Vercel's Hong Kong region (`hkg1`, set in `vercel.json`), so every request stays close to China.

Then deploy the rules and indexes once: `firebase deploy --only firestore,storage --project <id>`.

Password resets are sent by PPITSZ Account, through Firebase's reset email with its action URL set to Account's own page (see its README). An old reset link to the shop's `/reset-password?oobCode=…` still works: it is passed on to PPITSZ Account.

Fill in our WeChat ID, Instagram handle and email in `lib/contact.ts`; the footer shows each once it is set.

Old rate-limit counters and Forms' access codes delete themselves through TTL policies on `expiresAt` (`rateLimits`, `formRateLimits`, `formAccessCodes`). They are `fieldOverrides` in `firestore.indexes.json`, so the deploy above sets them. If a deploy asks to delete field overrides, answer **no**: those are the TTL policies.

To start the real sale, sign in as an admin, create each campaign under **Settings → Create new campaign**, add its products under **Products**, and set it to **Open**.

Without the `FIREBASE_*` variables, every run fails loudly, development included: there is no emulator to fall back on.

### Error alerts

Unexpected server errors (a bug, Firebase down) are posted to a group chat, so IT hears about a failing checkout during the sale. Expected refusals such as "sold out" never alert. The same error is sent once per 10 minutes per server instance; the next message says how many were held back. Messages name the route pattern, never a buyer's order link.

Set `ALERT_WEBHOOK_URL` to an incoming webhook. The format follows the URL:

- **Feishu / Lark** (works in China without a VPN): group settings → Bots → Add bot → Custom bot. For security, choose a keyword: `PPITSZ Shop`.
- **WeCom (企业微信)**: group → Add group robot.
- **Discord** or **Slack**: an incoming webhook URL.
- **Telegram**: `https://api.telegram.org/bot<token>/sendMessage?chat_id=<chat id>`.

Then use **Send test** under Settings to check that it arrives.
