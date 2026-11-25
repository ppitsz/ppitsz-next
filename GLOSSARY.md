# PPIT Shenzhen

The apps and design system of PPIT Shenzhen, the Indonesian students' association in Shenzhen. PPITSZ Shop (the shop, `apps/shop`) is its sales site, run by its fundraising division, Danus. GumamChan is the name of its food campaign. PPITSZ Forms (`apps/forms`) takes registrations and form responses, with tickets for events. PPITSZ Account (`apps/account`) is where everyone signs in, and where Portal admins manage roles.

Every term below is the word the UI shows, in English (ADR 0007), with no Indonesian insider words (ADR 0012).

The UI speaks as "we", one organization, and never names a division as the one acting: buyers read "we check your proof", staff read "shop admin" (ADR 0012).

## Accounts

**PPITSZ Account**:
The app at `account.ppitshenzhen.org`: the only place to sign in, sign up and reset a password, the home of your profile, and a launcher to the staff apps you can open. One sign-in covers every app, and signing out anywhere signs out everywhere (ADR 0008).
_Avoid_: SSO, login portal, admin site

**Staff app**:
Where staff work, each opened from PPITSZ Account: the **Shop dashboard** (shop staff, at the shop's `/staff`), the **Forms dashboard** (form admins and organizers, at Forms' `/staff`) and **Accounts** (Portal admins). The launcher names each one this way, with your role in it.
_Avoid_: Danus dashboard, Forms staff, admin panel

**Account**:
One person's email and password, with a profile holding their name, birthday and intake year and, optionally, WeChat ID and phone. The profile is the old website's record of them too (`users/{uid}`, ADR 0014). The same account buys in the shop, may sign in to Forms, and carries any staff roles. Signing in goes through our server, so it works without a VPN. An account with no role is an ordinary account; nothing is stored for that.
_Avoid_: user, member, login (that is the act)

**Avatar**:
The photo every app shows beside an account's name, in the profile menu. The person's own photo if they chose one in PPITSZ Account, else a copy of their linked Google account's photo, else their initials. Stored and served by us (ADR 0009, 0011).
_Avoid_: profile picture, pfp, photo (on its own)

**Profile menu**:
The header's account control in every app: "Sign in" when signed out; otherwise the avatar and first name, opening the name, email, role, the app's own links, "Your account" and "Sign out".
_Avoid_: user menu, account dropdown

**Role**:
What an account may do in one app: Admin or Booth staff in the shop, Form admin in Forms, Portal admin in PPITSZ Account, Website admin on ppitshenzhen.org. All are kept on the person's record and granted by Portal admins (ADR 0014); a role in one app grants nothing in another. Organizer isn't a role: it is per form.
_Avoid_: permission, claim

**Portal admin**:
Someone who manages accounts in PPITSZ Account: adds people, gives and removes every app's roles, and resets passwords. Can't remove their own Portal admin role, and the last one can't be removed. Stored as `roles.portal` on the person's record (`users/{uid}`, ADR 0014).
_Avoid_: superadmin, superuser, admin (that is the shop's role)

**Website admin**:
Someone who may use the control panel on ppitshenzhen.org: its forms and responses, recruitment applications, emails and tickets. The old website's own `admin` flag on the person's record, which its rules and pages read; granted by a Portal admin, or by another website admin there.
_Avoid_: admin (on its own), superadmin

**Intake year**:
The year someone started their studies, asked at sign-up with their birthday, as the old website always has. Stored as `cohortYear`.
_Avoid_: cohort, angkatan, batch

**Role change**:
One entry in the log of who gave or removed which role, or reset whose password, and when. Shown on the person's page in Accounts.
_Avoid_: audit, history (that is the list)

## Shop: people

**Shop staff**:
The people who run the shop, from the association's fundraising division, each with a shop role. Copy never names their division: buyers read "we".
_Avoid_: Danus (in copy), sellers, the team

**Admin**:
A shop staff role that may do everything, including verifying proofs, canceling any open order and managing products and the campaign.

**Booth staff**:
A shop staff role at the booth: hands over orders, records walk-in sales and may undo their own sale within the undo window.
_Avoid_: register (that is the screen, not the person), cashier

**Buyer**:
Whoever places an online order or buys at the booth. An online order needs an account; a walk-in sale needs none.
_Avoid_: customer, user

**Your orders**:
The shop's list of an account's orders with their progress, Active and Done. Every online order belongs to one account (see Accounts). A staff member who buys is signed in as themselves.

## Shop: selling

**Shop**:
The whole sales site, PPITSZ Shop, holding every campaign. Its main page leads with the first open campaign, shows the buyer's orders and what every open campaign sells, and links to each campaign's page to buy.
_Avoid_: store, marketplace, toko

**Campaign**:
One sale period, such as GumamChan at SZ Cup 2027, with its own products, bundles, online order dates, ways of selling, delivery slots and fee, pickup points, booth place, payment window and payment accounts. Several can be open at once, and any campaign may mix food and merchandise. Next year's sale of the same kind is a new campaign.
_Avoid_: event, sale, store

**Campaign status**:
What an admin sets: **Draft** (hidden from buyers; staff can open it and place test orders), **Open** (listed and selling) or **Ended** (off the list, no checkout, its orders still work). An open campaign shows buyers its phase: Opening soon, Ordering online, At the booth, or Orders closed for one without a booth.

**URL name** (slug in code):
A campaign's address on the shop, such as `/gumamchan`. Held by one draft or open campaign at a time; an ended campaign's name can be reused. Fixed once the campaign has an order.

**Code prefix**:
The two or three capitals that start a campaign's order codes, such as GC in GC-7K3P. Unique among all campaigns, fixed once the campaign has an order.

**Picked campaign**:
The campaign a dashboard device works on in Register, Products, Recap and Settings, chosen in the switcher at the top. Verify, Scan, Orders and the pickup list cover every campaign.

**Featured product**:
The one product a campaign shows in the main page's hero, picked by an admin; optional. Shown only while the campaign leads the main page and the catalog still shows the product; otherwise the cover photo stands in.

**Sale dates**:
A product's optional start and end, in Shenzhen time, for a seasonal item inside a longer campaign. Before the start it shows in the catalog as coming but can't be ordered; from the end it leaves the catalog and the register. A product is on sale when it is ticked For sale and inside its dates. Bundles that hold it keep their own switch.
_Avoid_: temporary product, permanent product

**Label**:
A short word an admin puts on a product for buyers, such as New, Spicy or Weekly; at most three. It says nothing about stock or dates, which the shop shows itself (Coming soon, Almost gone, Sold out).
_Avoid_: tag, badge (that is how it is drawn)

**Pickup limit** (`pickupPointIds` in code):
The pickup points a product can be collected at, when only some have it, such as food made fresh for one day. None ticked means any point. At checkout the buyer only sees the points that have every item in the cart, bundles included. Delivery and the booth ignore it.

**Allergen**:
What a product contains or may contain that some buyers must avoid, such as Coconut or May contain shellfish (shrimp paste), listed with the product.

**Variant**:
One option of a product, such as a size or flavor, with its own price and stock. A product without options has a single variant.
_Avoid_: SKU, option

**Bundle**:
Several products sold together at one fixed price, such as a shirt and a keychain. A bundle has no stock of its own: each one sold holds units of its components' variants, and the buyer picks the variant of each component. An order keeps a copy of what its bundles held, and a bundle is handed over as one item.
_Avoid_: package, combo, set, paket

**Size chart**:
A product's measurements in cm, one row per variant and one column per measure (chest width, body length), with a fit note and an optional image. Typed by an admin; opened by buyers from the catalog and from bundles.

**Online cap**:
The most units of a variant that online orders may take; the rest of its stock is kept for walk-in sales. Ignored by a campaign without a booth.
_Avoid_: pre-order cap

**Order**:
A buyer's request for variants, priced when it is made. Either an online order or a walk-in sale.
_Avoid_: purchase, transaction

**Online order**:
An order a buyer places on the shop's website and pays by transfer with a proof. It is delivered (Delivery) or collected (Pickup).
_Avoid_: pre-order

**Fulfillment**:
How an order reaches its buyer: **Delivery**, **Pickup** (collected with its QR at a pickup point) or **Booth** (a walk-in sale). A campaign chooses which of the three it offers; the buyer of an online order picks Delivery or Pickup at checkout.

**Delivery slot**:
A date and time range a delivery order is delivered in, with an optional maximum number of orders. A slot is full when its live orders reach the maximum, and can't be picked once it has started. An order keeps a copy of its slot.

**Pickup point**:
A place, a date and a time range where pickup orders are collected, such as PPIT booth, Sat Mar 13, 10:00–16:00. A campaign offering Pickup lists one or more, and one day can have several at separate places. The buyer picks one at checkout, and it can't be picked once it has started. An order keeps a copy of its point; staff can move it to another. Pickup orders from before pickup points have none and may be collected at any.
_Avoid_: pickup place, pickup info, pickup slot

**Booth place**:
Where and when a campaign's booth sells in person, as one line of text, such as PPIT booth at SZ Cup, Wed Mar 17, 09:00–17:00. Shown while the booth is on.

**Delivery fee**:
One flat amount per campaign, added once to every delivery order's total. 0 is free delivery.

**Tracking number**:
The courier's number for a delivery order sent by courier (SF Express, 闪送…), entered by staff and shown to the buyer.

**Booth**:
Where a campaign sells on the spot, through the register. Optional: a campaign without one sells online only, and its online cap holds nothing back.

**Walk-in sale**:
An order recorded at the register for a buyer standing at the booth. It is paid and handed over the moment it is made.
_Avoid_: register order, offline order

**Register**:
The booth screen where staff record walk-in sales, at `/staff/register`.
_Avoid_: kasir, POS, till, cashier

**Order code**:
The short code of an order, such as GC-7K3P, written in transfer notes and read aloud at the booth.

**Token**:
The secret in an order's link and QR. Whoever holds it can see the order, signed in or not; the order still belongs to its buyer's account.

## Shop: stock

**Hold**:
The units an order takes from a variant's stock, from the moment the order is made until it is canceled or expires.
_Avoid_: reservation, lock

**Overdue hold**:
The hold of an online order whose payment deadline has passed without a proof. It no longer counts against anyone, even before the order is marked expired.

**Settling**:
Expiring every overdue hold so that stock and statuses show what is really left.
_Avoid_: sweeping, cleanup

## Shop: an order's life

**Payment deadline**:
When an unpaid online order expires, set by the campaign's payment window from when the order was made or its proof was rejected.

**Proof**:
The transfer screenshot a buyer uploads for us to check, with the transaction number's last 6 digits when paid by WeChat Pay or Alipay. The digits are how we find the transfer; the screenshot is the backup.
_Avoid_: receipt, evidence

**Test order**:
An order staff place in a draft campaign to try it out. It takes stock and runs like a real order (proof, verification, pickup or delivery), is labeled Test everywhere, and skips the unpaid-orders limit. An admin deletes the campaign's test orders in Settings, which gives their stock back, before the campaign can leave Draft.
_Avoid_: dummy order, fake order

**Transaction number**:
The number WeChat Pay (交易单号 or 转账单号) or Alipay (订单号) gives a payment. The buyer types its last 6 digits when sending proof (a pasted whole number is cut to them), and we find the transfer in the receiving account's bills by them. The verify queue warns when two orders carry the same digits. A bank transfer needs none.
_Avoid_: payment code, reference, transaction ID

**Verification**:
An admin checking a proof, ending in approval or rejection.

**Rejection**:
An admin's verdict that a proof is wrong, with a reason the buyer reads. The order waits for payment again with a new payment deadline, and the rejection stays on record.

**Hand-over**:
Booth staff giving a paid pickup order's items to the buyer. It can be handed over in parts, such as food and merch separately. A delivery order is handed over whole, when it is delivered.
_Avoid_: redeem, pickup (pickup is what the buyer does)

**Expiry**:
The automatic end of an unpaid online order at its payment deadline. Its hold is released.
_Avoid_: timeout, auto-cancel

**Cancellation**:
Staff ending an open order, or undoing a walk-in sale. Units not yet handed over go back to stock. Money goes back as a refund.
_Avoid_: void, refund

**Refund**:
Money we send back for a canceled or expired online order, outside the app, then records on the order once: amount, method and a note. A canceled online order whose money came in waits for one; it is owed the price of the items not handed over, plus the delivery fee of a delivery order not delivered. An undone walk-in sale is settled at the booth and gets none.
_Avoid_: reimbursement, chargeback

**Buyer message**:
A ready-made WeChat text that staff copy and send to a buyer, such as the reason a proof was rejected with the order link. The app can't message buyers itself.

## Shop: after the sale

**Recap**:
The campaign counted from its orders: what was sold, money in and refunded per payment account, units per variant and bundle, and what is left to collect. Only paid online orders and walk-in sales count as sold, collected or not. Delivery fees count as sales but belong to no product.
_Avoid_: report, dashboard

**Pickup list**:
The printed backup for the booth: paid pickup orders still to collect, one table per pickup point, by buyer name, made just before the event in case the internet fails.

**Delivery list**:
Paid delivery orders not delivered yet, of every campaign, grouped by slot: the dashboard's Delivery page, and its printed copy for a delivery run.

**Undo window**:
The 30 minutes after a walk-in sale in which the booth staff who made it may cancel it themselves.

## Forms: people

**Form admin**:
Someone who creates forms, builds them, sets their status and picks each form's organizers. Stored as `roles.forms` on the person's record (`users/{uid}`, ADR 0014), granted by a Portal admin. Not a shop role: the same person may also be shop staff, with one account for both.
_Avoid_: owner, superuser

**Organizer**:
One of the people who run one form: they read its responses and files, scan its tickets, register people at the door and send announcements to ticket holders. Added by a form admin in the app, by email. Their access ends when the form is ended.
_Avoid_: panitia, committee members, form team, staff (staff is the shop's word)

**Responder**:
Whoever fills in a form. No account needed: the secret link of their response is their key, and a 6-digit code sent to their email gets them back to it. Signed in, their name, email and WeChat ID start filled in and the response is linked to their account, except on an anonymous form.
_Avoid_: user, registrant, attendee, participant

## Forms: forms and responses

**Form**:
One form at its own address (`forms.ppitshenzhen.org/<slug>`): sections, questions, response rules and, optionally, tickets. A survey, a sign-up and an event registration are all a form. Recruitment will be one too, with stages.
_Avoid_: event (the event is what a ticket form registers for, and lives on the main site), registration, survey

**Form status**:
What a form admin sets: **Draft** (only staff see it, as a preview), **Open** (takes responses, within its optional open and close dates), **Closed** (no new responses; tickets still scan) or **Ended** (archived: organizers lose access, and the purge clock starts). An open form shows responders its phase: Opening soon, Open, Fully booked or Registration closed.

**Response**:
One submission of a form. With tickets, one response is one person's ticket. Live until canceled; never deleted.
_Avoid_: submission, entry, registration

**Section**:
One page of a form. A section or a question can have a condition: shown only when an earlier choice question was answered with one of the named options.

**Unlisted**:
An open form left off the home page: only people with its link can open it.

## Forms: tickets

**Ticket**:
A live response of a form with tickets turned on, shown at `/tickets/<token>`. That page is the ticket; the email is a copy. One ticket is one person, with one QR code.
_Avoid_: pass, booking

**Ticket type**:
What a ticket is for: its name, an optional quota, optional sale dates and the event days it covers (every day by default). A ticket needs room in its type's quota and in the form's capacity.

**Capacity**:
The optional cap on live tickets of all types together.

**Check-in**:
Recording that a ticket's holder came, once per event day. A second scan the same day shows who recorded it and when, without refusing; a ticket whose type doesn't cover the day is refused.
_Avoid_: attendance (that is the recap), scan (that is the act), absen

**Walk-in sign-up**:
A ticket made at the scanner for someone who came without one. Created checked in, it counts against the quotas.
_Avoid_: door registration, on-site registration

**Announcement**:
An email organizers write to every live ticket: a change, or the cancellation of the event. Canceling the event closes the form and voids every ticket. There are no automatic reminders.
_Avoid_: message, blast, reminder

## Recruitment

**Recruitment**:
How students apply to join a division. An applicant moves through four stages: online form, written test, interview, results.
_Avoid_: oprec, hiring, registration

**Results**:
The last recruitment stage, when each applicant learns whether they are accepted onto a division or not selected.
_Avoid_: announcement (that is organizers' email to ticket holders), decision

## Design system

**Jaringan**:
The design system every PPIT Shenzhen site shares. It shows the organization the way the Shenzhen Metro shows its network: divisions are lines, campuses and events are stations.
_Avoid_: theme, UI kit

**Line**:
A division, drawn in its own permanent color. The brand red line is PPIT Shenzhen itself. Line colors mark divisions in network graphics only, never text, backgrounds or buttons.
_Avoid_: division color, track

**Line badge**:
A division's short code (BPH, HUMAS…) on its line color, like a metro line bullet. Never pressable: to filter by division, the badge goes inside a filter chip.
_Avoid_: division tag, division pill

**Station**:
A stop on a line: a campus, an event, or a step in a process such as recruitment. It is upcoming, passed, or "you are here".
_Avoid_: node, dot, step marker

**Interchange**:
A station where several lines meet: a campus served by many divisions, or an event run jointly.
_Avoid_: hub, junction

**Route**:
An ordered run of stations along a line, showing where something goes or how far along it is.
_Avoid_: timeline, progress bar, stepper

**Departure board**:
The list of events shown as departures: time, event, station and status, in rows rather than cards.
_Avoid_: event grid, event cards, calendar

**Station screen**:
A dark band inside a light page that holds a departure board or network map, like the screens on a metro platform.
_Avoid_: dark section, hero band
