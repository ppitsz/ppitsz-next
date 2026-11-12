import { GoogleLogoIcon } from "@phosphor-icons/react/ssr"

import { buttonVariants } from "@ppitsz/ui/components/button"
import { Separator } from "@ppitsz/ui/components/separator"

/**
 * "Continue with Google" above the email form, then an "or" rule. A plain
 * link: /auth/google is a route that leaves for Google's page (ADR 0011).
 */
export function ContinueWithGoogle({ next }: { next: string }) {
  const href = next === "/" ? "/auth/google" : `/auth/google?next=${encodeURIComponent(next)}`
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <a href={href} className={buttonVariants({ size: "lg" })}>
          <GoogleLogoIcon aria-hidden />
          Continue with Google
        </a>
        <p className="type-body-sm text-muted">
          Google needs a VPN in mainland China. Your email and password work without one.
        </p>
      </div>
      <div className="flex items-center gap-4">
        <Separator className="flex-1" />
        <span className="type-ui text-muted">or</span>
        <Separator className="flex-1" />
      </div>
    </div>
  )
}

/** The profile page's "Link Google". */
export function LinkGoogleButton() {
  return (
    <a href="/auth/google?intent=link" className={buttonVariants()}>
      <GoogleLogoIcon aria-hidden />
      Link Google
    </a>
  )
}
