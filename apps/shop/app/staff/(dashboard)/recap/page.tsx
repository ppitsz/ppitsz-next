import type { Metadata } from "next"
import NextLink from "next/link"
import { DownloadSimpleIcon, PrinterIcon } from "@phosphor-icons/react/ssr"

import { Alert, AlertDescription, AlertTitle } from "@ppitsz/ui/components/alert"
import { Badge } from "@ppitsz/ui/components/badge"
import { buttonVariants } from "@ppitsz/ui/components/button"
import { Container } from "@ppitsz/ui/components/container"
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@ppitsz/ui/components/empty"
import { Link } from "@ppitsz/ui/components/link"
import { formatNumber, formatYuan } from "@ppitsz/ui/lib/format"
import { cn } from "@ppitsz/ui/lib/utils"
import { PAYMENT_METHOD_LABELS } from "@/lib/catalog"
import { FULFILLMENT_LABELS, FULFILLMENTS } from "@/lib/domain/delivery"
import { awaitsRefund, refundDue } from "@/lib/domain/order"
import { buildRecap } from "@/lib/domain/recap"
import { requireStaff } from "@/lib/server/auth"
import { pickedCampaign } from "@/lib/server/dashboard-campaign"
import { listBundles, listCampaigns, listOrders, listProducts } from "@/lib/store"
import { CampaignSwitcher } from "@/components/staff/campaign-switcher"
import { when } from "@/components/staff/order-bits"

export const metadata: Metadata = { title: "Recap" }

export default async function RecapPage() {
  await requireStaff("admin")
  const campaigns = await listCampaigns()
  const campaign = await pickedCampaign(campaigns)
  if (!campaign) {
    return (
      <Container className="py-16">
        <Empty>
          <EmptyHeader>
            <EmptyTitle>No campaigns yet.</EmptyTitle>
            <EmptyDescription>
              Create a campaign first in <NextLink href="/staff/settings">Settings</NextLink>.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      </Container>
    )
  }

  const now = new Date()
  const [allOrders, products, bundles] = await Promise.all([
    listOrders(undefined, { now }),
    listProducts(campaign.id, { includeInactive: true, now }),
    listBundles(campaign.id, { includeInactive: true }),
  ])
  const ordersOf = (id: string) => allOrders.filter((o) => o.campaignId === id)
  const orders = ordersOf(campaign.id)
  const recap = buildRecap(campaign, orders, products, bundles, PAYMENT_METHOD_LABELS)
  // Money only, so the products of the other campaigns aren't needed.
  const openMoney = campaigns
    .filter((c) => c.status === "open")
    .map((c) => ({ campaign: c, money: buildRecap(c, ordersOf(c.id), [], [], PAYMENT_METHOD_LABELS).money }))
  const sum = (pick: (m: (typeof openMoney)[number]["money"]) => number) =>
    openMoney.reduce((total, row) => total + pick(row.money), 0)
  const csv = (kind: string) => `/staff/export?kind=${kind}&campaign=${encodeURIComponent(campaign.id)}`
  const { money } = recap
  const owed = orders.filter(awaitsRefund)

  return (
    <Container className="flex flex-col gap-12 py-10">
      <div className="flex flex-col gap-4">
        <CampaignSwitcher campaigns={campaigns} currentId={campaign.id} />
        <h1 className="type-display-xl text-text">Recap</h1>
        <p className="max-w-[66ch] type-lede text-muted">
          Every order up to {when(now)} Shenzhen time. Sales count paid online orders
          and walk-in sales.
        </p>
        <div className="flex flex-wrap gap-3">
          <a href={csv("orders")} className={buttonVariants()}>
            <DownloadSimpleIcon aria-hidden />
            Download orders (CSV)
          </a>
          <a href={csv("products")} className={buttonVariants()}>
            <DownloadSimpleIcon aria-hidden />
            Download product recap (CSV)
          </a>
          <NextLink href="/staff/print/pickup" className={buttonVariants({ variant: "quiet" })}>
            <PrinterIcon aria-hidden />
            Pickup list
          </NextLink>
          {campaign.offers.delivery && (
            <NextLink href="/staff/print/delivery" className={buttonVariants({ variant: "quiet" })}>
              <PrinterIcon aria-hidden />
              Delivery list
            </NextLink>
          )}
        </div>
      </div>

      {owed.length > 0 && (
        <Alert variant="danger">
          <AlertTitle>
            {owed.length} canceled {owed.length === 1 ? "order is" : "orders are"} waiting for a refund ({formatYuan(money.owedFen)})
          </AlertTitle>
          <AlertDescription>
            <ul className="mt-1 flex flex-col gap-1">
              {owed.map((o) => (
                <li key={o.id}>
                  <Link as={NextLink} href={`/staff/orders/${o.id}`}>
                    {o.code}
                  </Link>{" "}
                  · {o.buyer?.name} · {formatYuan(refundDue(o))}
                </li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      <section aria-labelledby="money" className="@container flex flex-col gap-4">
        <h2 id="money" className="type-heading-lg text-text">
          Money
        </h2>
        <dl className="grid gap-4 @xl:grid-cols-2 @4xl:grid-cols-4">
          <Tile
            term="Sales"
            value={formatYuan(money.salesFen)}
            note={`Online orders ${formatYuan(money.salesByChannel.online)} · booth ${formatYuan(money.salesByChannel.walkin)}`}
          />
          {money.deliveryFeesFen > 0 && (
            <Tile term="Delivery fees" value={formatYuan(money.deliveryFeesFen)} note="Included in sales" />
          )}
          <Tile term="Money in" value={formatYuan(money.receivedFen)} note="Includes paid orders later canceled" />
          <Tile term="Refunded" value={formatYuan(money.refundedFen)} note="As recorded on orders" />
          <Tile term="Danus should hold" value={formatYuan(money.heldFen)} note="Money in minus refunds" />
        </dl>
        <p className="type-body-sm text-muted">
          Orders sold:{" "}
          {FULFILLMENTS.filter((f) => recap.ordersByFulfillment[f] > 0)
            .map((f) => `${FULFILLMENT_LABELS[f]} ${formatNumber(recap.ordersByFulfillment[f])}`)
            .join(" · ") || "none yet"}
          .
        </p>
        {(money.awaitingOrders > 0 || money.unpaidOrders > 0) && (
          <p className="type-body-sm text-muted">
            Not counted yet:{" "}
            {money.awaitingOrders > 0 && (
              <>
                <Link as={NextLink} href="/staff/verify">
                  {money.awaitingOrders} {money.awaitingOrders === 1 ? "proof" : "proofs"} not checked
                </Link>{" "}
                ({formatYuan(money.awaitingFen)})
              </>
            )}
            {money.awaitingOrders > 0 && money.unpaidOrders > 0 && " · "}
            {money.unpaidOrders > 0 &&
              `${money.unpaidOrders} ${money.unpaidOrders === 1 ? "order" : "orders"} waiting for a transfer (${formatYuan(money.unpaidFen)})`}
            .
          </p>
        )}
      </section>

      {openMoney.length > 1 && (
        <section aria-labelledby="all-campaigns" className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <h2 id="all-campaigns" className="type-heading-lg text-text">
              All campaigns
            </h2>
            <p className="max-w-[66ch] type-body-sm text-muted">Money from every open campaign.</p>
          </div>
          <Table
            head={["Campaign", "Sales (¥)", "Money in", "Refunded", "Held"]}
            numeric={[1, 2, 3, 4]}
            rows={[
              ...openMoney.map(({ campaign: c, money: m }) => [
                c.name,
                formatYuan(m.salesFen),
                formatYuan(m.receivedFen),
                formatYuan(m.refundedFen),
                formatYuan(m.heldFen),
              ]),
              [
                <strong key="total">Total</strong>,
                formatYuan(sum((m) => m.salesFen)),
                formatYuan(sum((m) => m.receivedFen)),
                formatYuan(sum((m) => m.refundedFen)),
                formatYuan(sum((m) => m.heldFen)),
              ],
            ]}
          />
        </section>
      )}

      <section aria-labelledby="accounts" className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h2 id="accounts" className="type-heading-lg text-text">
            Per payment account
          </h2>
          <p className="max-w-[66ch] type-body-sm text-muted">Match against each account's statement and the cash in the box.</p>
        </div>
        {recap.accounts.length === 0 ? (
          <p className="type-body-sm text-muted">No money in yet.</p>
        ) : (
          <Table
            head={["Account", "Orders", "In"]}
            numeric={[1, 2]}
            rows={[
              ...recap.accounts.map((a) => [a.label, formatNumber(a.orders), formatYuan(a.receivedFen)]),
              ...recap.refundsByMethod.map((r) => [
                `Refunded via ${PAYMENT_METHOD_LABELS[r.method]}`,
                formatNumber(r.orders),
                `−${formatYuan(r.fen)}`,
              ]),
            ]}
          />
        )}
      </section>

      <section aria-labelledby="sold" className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h2 id="sold" className="type-heading-lg text-text">
            Sold
          </h2>
          <p className="max-w-[66ch] type-body-sm text-muted">
            Per bundle and per product variant, at the price when ordered.
          </p>
        </div>
        {recap.lines.length === 0 ? (
          <p className="type-body-sm text-muted">Nothing sold yet.</p>
        ) : (
          <Table
            head={["Item", "Online", "Booth", "Revenue"]}
            numeric={[1, 2, 3]}
            rows={recap.lines.map((line) => [
              <span key="name" className="flex flex-wrap items-center gap-2">
                {line.kind === "bundle" && <Badge variant="outline">Bundle</Badge>}
                {line.name}
                {line.variantLabel && <span className="text-muted">· {line.variantLabel}</span>}
              </span>,
              formatNumber(line.qty.online),
              formatNumber(line.qty.walkin),
              formatYuan(line.fen),
            ])}
          />
        )}
      </section>

      <section aria-labelledby="stock" className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h2 id="stock" className="type-heading-lg text-text">
            Stock and pickup
          </h2>
          <p className="max-w-[66ch] type-body-sm text-muted">
            Units per variant, including those inside bundles. Not paid: held by orders that haven't
            transferred or whose proof isn't checked. {recap.toCollectOrders} paid {recap.toCollectOrders === 1 ? "order isn't" : "orders aren't"} fully picked up
            {recap.toDeliverOrders > 0 && (
              <>
                , {recap.toDeliverOrders}{" "}
                <Link as={NextLink} href="/staff/delivery">
                  not delivered
                </Link>
              </>
            )}
            .
          </p>
        </div>
        <Table
          head={["Item", "Online", "Booth", "In bundles", "Handed over", "Not picked up", "Not paid", "Left"]}
          numeric={[1, 2, 3, 4, 5, 6, 7]}
          rows={recap.units.map((u) => [
            <span key="name">
              {u.name}
              {u.variantLabel && <span className="text-muted"> · {u.variantLabel}</span>}
            </span>,
            formatNumber(u.sold.online),
            formatNumber(u.sold.walkin),
            formatNumber(u.inBundles),
            formatNumber(u.handedOver),
            formatNumber(u.toCollect),
            formatNumber(u.unpaid),
            u.left === null ? "Deleted" : `${formatNumber(u.left)} / ${formatNumber(u.stock ?? 0)}`,
          ])}
        />
      </section>
    </Container>
  )
}

function Tile({ term, value, note }: { term: string; value: string; note: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-xl bg-surface p-5">
      <dt className="type-caption text-muted">{term}</dt>
      <dd className="type-heading-lg text-text">{value}</dd>
      <dd className="type-caption text-muted">{note}</dd>
    </div>
  )
}

/** A plain data table that scrolls sideways inside itself on a phone. */
function Table({ head, rows, numeric }: { head: string[]; rows: React.ReactNode[][]; numeric: number[] }) {
  const align = (i: number) => (numeric.includes(i) ? "text-right" : "text-left")
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[32rem] border-collapse">
        <thead>
          <tr className="border-b border-border-strong">
            {head.map((cell, i) => (
              <th key={cell} scope="col" className={cn("py-2 pe-4 align-bottom type-sign text-muted", align(i))}>
                {cell}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b">
              {row.map((cell, j) =>
                j === 0 ? (
                  <th key={j} scope="row" className="py-2 pe-4 text-left align-top type-body-sm text-text">
                    {cell}
                  </th>
                ) : (
                  <td key={j} className={cn("py-2 pe-4 align-top type-body-sm text-text", align(j))}>
                    {cell}
                  </td>
                )
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
