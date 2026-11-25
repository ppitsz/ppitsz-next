# Pickup points, and products limited to some of them

Status: resolved

A campaign used to have one free-text "pickup place and time", which was also where the booth was. Organizers need several pickup options: separate places, each on its own date with its own time range, with several possible on one day. Some products can only be collected at some of them.

Decided with the user on 2026-11-25, while a campaign was live.

## Campaign

- **Pickup points.** With Pickup on, a campaign lists at least one point, up to 20: a place, a date, and a from–to time. One day can have several points at separate places. No order limit per point.
- **Booth place** is its own line of text, shown only while the booth is on. The old pickup text moves into it (read from `pickupInfo` until the campaign is saved again).

## Checkout

- The buyer of a pickup order **picks a point**. With one choosable point it is picked for them.
- A point **can't be picked once it has started**: a proof still has to be checked before pickup.
- Points that don't have every item in the cart are shown but disabled ("No Nasi kuning here"). When none suits the whole cart, checkout names each limited item's points and suggests ordering them separately, or Delivery.

## Products

- **Pickup limit:** an admin ticks the points a product can be picked up at. None ticked means any point, including points added later. Bundles inherit their components' limits. Delivery and the booth ignore it.
- The catalog says "Pickup only at …" on a limited product or bundle.

## After ordering

- The order keeps a **copy of its point**: shown on the buyer's ticket, order card, the scanner, the staff order page, the CSV export, and the printed pickup list, which is now one table per point.
- **Staff can move a pickup order** to any of its campaign's points (any role, until it is picked up, canceled or expired), ignoring start times and limits. This is also how orders placed before pickup points get one.
- **Orders from before pickup points** show every point ("Any of our pickup points: …") until staff set one, and print under "No pickup point chosen".

## Rollout for the live campaign

1. Deploy. Until its points are added, its checkout can't offer Pickup (Delivery still works).
2. In Settings, add the pickup points and save. The booth text keeps the old pickup text; edit it if the booth is on.
3. Optionally limit products to some points, in each product.
4. Set a point on old pickup orders from their order page when buyers say where they'll collect.
