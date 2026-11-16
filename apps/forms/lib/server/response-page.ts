import { notFound } from "next/navigation"

import { isToken } from "../domain/codes"
import { getForm, getResponseByToken } from "../store"

/** The response and form behind a secret link, or not found. */
export async function loadByToken(token: string) {
  if (!isToken(token)) notFound()
  const response = await getResponseByToken(token)
  if (!response) notFound()
  const form = await getForm(response.formId)
  if (!form) notFound()
  return { form, response }
}

/** The URL is the responder's only key: keep it out of search engines and referrers. */
export const SECRET_PAGE_METADATA = {
  robots: { index: false, follow: false },
  referrer: "no-referrer" as const,
}
