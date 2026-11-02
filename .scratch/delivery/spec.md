# Delivery, and online orders instead of pre-orders

Status: resolved

Danus doesn't really run pre-orders. A buyer either **orders online** and has it **delivered** or **collects** it, or **buys on the spot** at a booth. Today the app only knows "pre-order, then collect at the booth" and the walk-in sale.

Decided with the user on 2026-10-27.

## Words

- **Online order** (*pesanan online*) replaces **pre-order** everywhere: the interface, the glossary and the code (`kind: "online" | "walk_in"`). The pre-order cap becomes the **online cap** (*batas pesanan online*).
- An online order has a **fulfilment**: **Antar** (delivery) or **Ambil sendiri** (collect).
- The **walk-in sale** keeps its name.

## Campaign

- **Online ordering is open while the campaign is Dibuka.** It can have an open date and a close date, and both are optional: empty means no limit on that side. "Pre-order dibuka" becomes "Pesan online". A campaign with a booth whose online ordering has closed still says "Beli di booth".
- **What a campaign offers.** Each campaign switches these three on or off, and at least one must be on:
  - **Antar:** delivery of online orders;
  - **Ambil sendiri:** online orders collected at the pickup place and time, as today;
  - **Booth:** walk-in sales at the kasir. Without a booth, the kasir doesn't list the campaign, the online cap is hidden and every unit can be ordered online.
- **Delivery fee:** one flat fee per campaign (0 means free), added once to every Antar order.
- **Delivery slots:** with Antar on, the campaign lists at least one slot. A slot has a date, a time range and an optional **maximum number of orders**. Expired and cancelled orders and overdue holds free their place, the same way they free stock. At checkout, a full slot shows "Penuh", and a slot that has already started can't be picked.

## Checkout

- **The buyer picks Antar or Ambil sendiri**, when the campaign offers both.
- **Antar asks for:**
  - a free-text address, up to 200 characters;
  - a phone number, required because couriers need one;
  - a slot.

  The total shows the items, plus the delivery fee as its own line.
- **Ambil sendiri** shows the pickup info, as today.
- **Payment is as now:** transfer, upload the proof, admin verifies. An unpaid order expires and releases its stock and its slot place.

## After payment

- **Ambil sendiri:** unchanged. The buyer shows the QR at the pickup, and the order can be handed over in parts.
- **Antar:** the order is delivered whole, never in parts.
  - **By hand:** a Danus member delivers it and staff mark it **Diantar**.
  - **By courier** (顺丰, 闪送…): staff enter the courier and the tracking number. The order shows **Dalam pengiriman** with the tracking number, and staff later mark it Diantar.
  - The buyer's order page shows the address, the slot, the status, and the tracking number when there is one.
  - **Buyer message:** "Pesananmu sudah dikirim lewat {kurir}, resi {nomor}", with the order link, to copy into WeChat.

## Dashboard

- **New "Antar" page**, shared across campaigns like Scan.
  - Paid Antar orders not yet delivered, grouped by slot.
  - Each order shows its campaign, buyer, phone, address and items.
  - Actions: **Kirim lewat kurir** (courier and tracking number) and **Tandai diantar**.
  - **A printable delivery list per slot**, the counterpart of the pickup list.
- **Scan** remains for Ambil sendiri orders. Scanning an Antar order says it is for delivery and shows its slot.
- **Pesanan** gets a fulfilment filter: Antar, Ambil sendiri, Booth.
- **Pengaturan** gets:
  - the three switches;
  - the delivery fee;
  - the slots editor: date, from, to, optional maximum;
  - the optional order dates.

## Money

- **Refund due** includes the delivery fee when an Antar order is cancelled before it was delivered.
- **Rekap** shows the delivery fees as their own money line, and counts orders by fulfilment.
- **The orders CSV** gains the columns fulfilment, address, slot, courier, tracking number and delivered at.

## Seed

- **gumamchan:** booth, Ambil sendiri and Antar by hand. Fee ¥5, two slots, one of them with a maximum.
- **merch:** booth, Ambil sendiri and Antar, with a free fee. Its seeded orders include one sent by courier with a tracking number.

No migration: wipe and reseed.

## Order of work

1. **Rename** pre-order → online order (interface, glossary, code, tests), with no change in behaviour.
2. **Campaign options:** the optional order dates, the three switches, and no kasir for a campaign without a booth.
3. **Delivery at checkout:** the fee, slots with their maximum, address and phone. Totals, refunds and expiry include them.
4. **Delivering:** the Antar page, courier and tracking number, Diantar, the buyer page, the buyer message and the printed delivery list.
5. **Rekap and CSV.**

## To record

In the glossary:
- replace **Pre-order** with **Online order**;
- add **Fulfilment** (Antar / Ambil sendiri), **Delivery slot**, **Delivery fee**, **Tracking number** and **Booth**;
- reword **Hand-over** for collect only, and **Pickup list**.

## Comments

**2026-10-27, implemented** in the order above.

- **The slot limit is counted, not stored.** Checkout counts the slot's live orders in its transaction (a query on `slotKey`), the same way the unpaid-orders limit works. Expiry and cancellation therefore free a place without touching a counter.
- **Orders keep a copy of their slot.** Editing or removing a slot later doesn't move orders that already picked it.
- **Statuses buyers and staff see.** A paid Antar order with a courier shows as **Dalam pengiriman**, and a delivered one as **Sudah diantar**. These are display statuses only: the stored status is still `paid` and then `picked_up`.
- **Choices made beyond the spec:**
  - With both options offered, the catalog's route ends in **Terima**.
  - Delivery orders are left out of the printed pickup list.
  - The orders CSV's "Jalur" column became "Cara terima".
- **Records:** the glossary and both READMEs are updated. No ADR, because nothing here is hard to reverse.
- **Verified:**
  - guardrails, typecheck, lint and the build pass;
  - 126 unit tests and 66 emulator tests pass;
  - a smoke run of 33 pages against the seeded emulators passes, including delivery orders, a courier hand-off, `/danus/antar`, the printed delivery list and the CSV.
- **Not covered:** a browser click-through of checkout with Antar, the slots editor in Pengaturan, and the courier dialog.
