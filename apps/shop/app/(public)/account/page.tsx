import { redirect } from "next/navigation"

/** Your details and password live on PPITSZ Account now; here, the account is its orders. */
export default function AccountPage() {
  redirect("/orders")
}
