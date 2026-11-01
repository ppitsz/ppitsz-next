# 2. A campaign is one sale period

Date: 2026-10-27 · Status: accepted

## Context

The sales site became the shop: several campaigns open at once on one domain, starting with GumamChan (food) and Merch at SZ Cup 2027. "GumamChan" and "Merch" sound like lasting shops that sell again at every event, so they could have been a level above campaigns (a shop with a series of campaigns), with `/gumamchan` always showing its current one.

## Decision

There is one level. A campaign is one sale period with its own products, bundles, schedule, payment accounts and pickup info, as before. Each campaign gets:

- **a URL name (slug).** Unique among draft and open campaigns. A closed campaign's name can be taken by a new one, so next year's food sale can be `/gumamchan` again.
- **an order code prefix** (`GC`, `MR`). Unique among all campaigns.

Both are fixed once the campaign has an order. `/[slug]` serves the draft or open campaign holding the name, or else the latest closed one.

Order pages stay at `/pesanan/[token]`, independent of campaign. Order codes stay unique across the site, in `orderCodes/{code}`, and a code typed without its prefix is looked up under every prefix.

## Consequences

- No new level in the data, the dashboard or the recap. Products, bundles, stock, holds and the recap were already campaign-scoped.
- When a new campaign reuses a closed one's URL name, the old catalog page can no longer be reached by that name. Its orders still open by their link and their code, which carries the old prefix.
- Prefixes are never reused, so a code always names one order, whatever happened to its campaign later.
- Nothing links one year's GumamChan to the next. If that is ever needed (a shop page with past campaigns, or "copy last year's products"), it can be added as a grouping field on campaigns without changing orders.
