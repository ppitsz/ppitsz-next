"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { failure, type ActionState } from "./state"
import { sendAlert } from "../server/alerts"
import { requireStaff } from "../server/auth"
import { checkCampaignEdit, type CampaignEdit } from "../domain/campaign"
import { CAMPAIGN_STATUSES, CATEGORIES, type DeliverySlot } from "../domain/types"
import { fromShenzhenInput } from "../shenzhen-time"
import {
  deleteBundle,
  deleteCampaign,
  deleteProduct,
  deleteTestOrders,
  getCampaign,
  listCampaigns,
  saveBundle,
  saveCampaign,
  saveProduct,
  type CampaignSave,
  type ImageChange,
  type ImageFile,
} from "../store"
import { pickCampaignAction } from "./staff"

/*
 * Admin-only server actions: products, bundles and campaign settings. Forms
 * send their fields as JSON in "data" plus image files, already shrunk by the
 * browser. The schemas below only check the shape; the product rules are
 * checkProductEdit (lib/domain/product.ts), which the store runs on save.
 */

const productSchema = z.object({
  name: z.string().max(200),
  description: z.string().max(2000),
  category: z.enum(CATEGORIES),
  active: z.boolean(),
  /** ISO dates from the form (it converts from Shenzhen time); null for no limit. */
  onSaleFrom: z.iso.datetime().nullable().optional(),
  onSaleUntil: z.iso.datetime().nullable().optional(),
  tags: z.array(z.string().max(100)).max(20).optional(),
  allergens: z.array(z.string().max(200)).max(40).optional(),
  sortOrder: z.number(),
  variants: z
    .array(
      z.object({
        id: z.string().max(40).optional(),
        label: z.string().max(200),
        priceFen: z.number(),
        stock: z.number(),
        onlineCap: z.number().nullable(),
        measurements: z.array(z.string().max(100)).max(20).optional(),
      })
    )
    .max(50),
  sizeChart: z
    .object({ measures: z.array(z.string().max(100)).max(20), note: z.string().max(2000) })
    .nullable()
    .optional(),
})

/** Products and bundles name their campaign; the store checks a product belongs to it. */
export async function saveProductAction(
  campaignId: string,
  productId: string | null,
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireStaff("admin")
  const parsed = productSchema.safeParse(parseJson(formData.get("data")))
  if (!parsed.success) return { error: firstIssue(parsed.error) }
  const { onSaleFrom, onSaleUntil, ...fields } = parsed.data

  try {
    const product = await saveProduct({
      campaignId: String(campaignId),
      productId: productId ?? undefined,
      edit: {
        ...fields,
        onSaleFrom: onSaleFrom ? new Date(onSaleFrom) : null,
        onSaleUntil: onSaleUntil ? new Date(onSaleUntil) : null,
      },
      image: await imageChange(formData, "photo"),
      sizeChart: await imageChange(formData, "sizeChart"),
    })
    revalidatePath("/", "layout")
    return { done: Date.now(), id: product.id }
  } catch (error) {
    return failure(error)
  }
}

export async function deleteProductAction(campaignId: string, productId: string): Promise<ActionState> {
  await requireStaff("admin")
  try {
    await deleteProduct(String(campaignId), String(productId))
  } catch (error) {
    return failure(error)
  }
  revalidatePath("/", "layout")
  return { done: Date.now() }
}

/* The bundle rules are checkBundleEdit (lib/domain/bundle.ts), which the store runs on save. */
const bundleSchema = z.object({
  name: z.string().max(200),
  description: z.string().max(2000),
  priceFen: z.number(),
  active: z.boolean(),
  sortOrder: z.number(),
  components: z.array(z.object({ productId: z.string().max(100), qty: z.number() })).max(20),
})

export async function saveBundleAction(
  campaignId: string,
  bundleId: string | null,
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireStaff("admin")
  const parsed = bundleSchema.safeParse(parseJson(formData.get("data")))
  if (!parsed.success) return { error: firstIssue(parsed.error) }

  try {
    const bundle = await saveBundle({
      campaignId: String(campaignId),
      bundleId: bundleId ?? undefined,
      edit: parsed.data,
      image: await imageChange(formData, "photo"),
    })
    revalidatePath("/", "layout")
    return { done: Date.now(), id: bundle.id }
  } catch (error) {
    return failure(error)
  }
}

export async function deleteBundleAction(campaignId: string, bundleId: string): Promise<ActionState> {
  await requireStaff("admin")
  try {
    await deleteBundle(String(campaignId), String(bundleId))
  } catch (error) {
    return failure(error)
  }
  revalidatePath("/", "layout")
  return { done: Date.now() }
}

/* The campaign rules are checkCampaignEdit (lib/domain/campaign.ts); the store runs them on save. */
const campaignSchema = z.object({
  name: z.string().max(200),
  slug: z.string().max(100),
  codePrefix: z.string().max(10),
  tagline: z.string().max(1000),
  pickupInfo: z.string().max(1000),
  /** Shenzhen "YYYY-MM-DDTHH:mm"; empty for no limit. */
  onlineOpensAt: z.string(),
  onlineClosesAt: z.string(),
  offers: z.object({ delivery: z.boolean(), pickup: z.boolean(), booth: z.boolean() }),
  deliveryFeeFen: z.number(),
  deliverySlots: z
    .array(
      z.object({
        id: z.string().regex(/^[a-z0-9-]{1,40}$/),
        startsAt: z.string(),
        endsAt: z.string(),
        maxOrders: z.number().nullable(),
      })
    )
    .max(50),
  paymentWindowMinutes: z.number(),
  sortOrder: z.number(),
  status: z.enum(CAMPAIGN_STATUSES),
  /** Empty for none. */
  featuredProductId: z.string().max(100).optional(),
  copyAccountsFrom: z.string().max(100).optional(),
  accounts: z
    .array(
      z.object({
        id: z.string().regex(/^[a-z0-9-]{1,40}$/),
        method: z.enum(["wechat", "alipay", "bank"]),
        holder: z.string().trim().min(1, "Write the holder of every payment account.").max(60),
        detail: z.string().trim().min(1, "Write the account or number of every payment account.").max(80),
        removeQr: z.boolean().optional(),
      })
    )
    .max(10, "At most 10 payment accounts."),
})

/**
 * Saves a campaign, or creates one when `campaignId` is null. A new campaign
 * becomes the one this device's dashboard works on.
 */
export async function saveCampaignAction(
  campaignId: string | null,
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireStaff("admin")
  const parsed = campaignSchema.safeParse(parseJson(formData.get("data")))
  if (!parsed.success) return { error: firstIssue(parsed.error) }
  const { accounts: accountFields, copyAccountsFrom, deliverySlots: slotFields, ...data } = parsed.data

  // Empty is no limit (null); anything unreadable is undefined.
  const optionalDate = (value: string) => (value ? (fromShenzhenInput(value) ?? undefined) : null)
  const opens = optionalDate(data.onlineOpensAt)
  const closes = optionalDate(data.onlineClosesAt)
  if (opens === undefined || closes === undefined) return { error: "The online ordering dates aren't right yet." }
  const deliverySlots: DeliverySlot[] = []
  for (const slot of slotFields) {
    const startsAt = fromShenzhenInput(slot.startsAt)
    const endsAt = fromShenzhenInput(slot.endsAt)
    if (!startsAt || !endsAt) return { error: "Fill in the date and time of every delivery slot." }
    deliverySlots.push({ id: slot.id, startsAt, endsAt, maxOrders: slot.maxOrders })
  }
  if (new Set(accountFields.map((a) => a.id)).size !== accountFields.length) {
    return { error: "A payment account appears twice. Reload the page." }
  }
  const edit: CampaignEdit = {
    ...data,
    onlineOpensAt: opens,
    onlineClosesAt: closes,
    deliverySlots,
    featuredProductId: data.featuredProductId || null,
  }
  // The first problem, before any upload; the store checks again against the other campaigns.
  const others = (await listCampaigns()).filter((c) => c.id !== campaignId)
  const current = campaignId ? await getCampaign(campaignId) : null
  const issue = checkCampaignEdit(edit, { current, others, hasOrders: false })[0]
  if (issue) return { error: issue.message }

  let saved
  try {
    const accounts: CampaignSave["accounts"] = []
    for (const account of accountFields) {
      accounts.push({ ...account, qrImage: await imageFrom(formData.get(`qr-${account.id}`)) })
    }
    saved = await saveCampaign(campaignId, {
      ...edit,
      accounts,
      cover: await imageChange(formData, "cover"),
      copyAccountsFrom: campaignId ? undefined : copyAccountsFrom,
    })
  } catch (error) {
    return failure(error)
  }
  if (!campaignId) await pickCampaignAction(saved.id)
  revalidatePath("/", "layout")
  return { done: Date.now(), id: saved.id }
}

/** Deletes a campaign with no orders, with its products and bundles. */
export async function deleteCampaignAction(campaignId: string): Promise<ActionState> {
  await requireStaff("admin")
  try {
    await deleteCampaign(String(campaignId))
  } catch (error) {
    return failure(error)
  }
  revalidatePath("/", "layout")
  return { done: Date.now() }
}

/** Deletes a campaign's test orders and gives their stock back. */
export async function deleteTestOrdersAction(campaignId: string): Promise<ActionState> {
  await requireStaff("admin")
  try {
    await deleteTestOrders(String(campaignId))
  } catch (error) {
    return failure(error)
  }
  revalidatePath("/", "layout")
  return { done: Date.now() }
}

/** Checks the alert webhook from Settings. */
export async function sendTestAlertAction(): Promise<ActionState> {
  const staff = await requireStaff("admin")
  if (!process.env.ALERT_WEBHOOK_URL) return { error: "ALERT_WEBHOOK_URL isn't set." }
  const sent = await sendAlert(`PPITSZ Shop: test error alert from ${staff.name}. If this arrived, alerts work.`)
  return sent ? { done: Date.now() } : { error: "The webhook didn't answer. Check its URL, then try again." }
}

/** The image field `name`: a new file, `remove-${name}` set to "1" to remove it, or nothing to keep it. */
async function imageChange(formData: FormData, name: string): Promise<ImageChange> {
  if (formData.get(`remove-${name}`) === "1") return null
  return imageFrom(formData.get(name))
}

async function imageFrom(value: FormDataEntryValue | null): Promise<ImageFile | undefined> {
  if (!(value instanceof File) || value.size === 0) return undefined
  return { bytes: new Uint8Array(await value.arrayBuffer()), contentType: value.type }
}

function parseJson(value: FormDataEntryValue | null): unknown {
  try {
    return typeof value === "string" ? JSON.parse(value) : null
  } catch {
    return null
  }
}

function firstIssue(error: z.ZodError) {
  const issue = error.issues[0]
  // Messages written above are sentences; zod's own defaults mean a broken form.
  return issue && /[.!]$/.test(issue.message) ? issue.message : "The form isn't complete. Reload the page."
}
