import { NotFoundMessage } from "@/components/not-found-message"

/** notFound() on a responder page: the (public) layout already draws the header. */
export default function PublicNotFound() {
  return <NotFoundMessage />
}
