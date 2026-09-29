"use client"

import { useCallback } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@clerk/nextjs"

export interface UseProReturn {
  /**
   * Whether the currently active organization is on the Pro plan.
   */
  isPro: boolean
  /**
   * Whether the Clerk auth state has finished loading.
   */
  isLoaded: boolean
  /**
   * Whether the user is signed in.
   */
  isSignedIn: boolean
  /**
   * The active organization ID, if any.
   */
  orgId: string | null | undefined
  /**
   * Whether there is an active organization selected.
   */
  hasActiveOrg: boolean
  /**
   * Navigate to the pricing page to view plans or upgrade.
   */
  redirectToPricing: () => void
  /**
   * Shorthand alias for redirectToPricing.
   */
  upgrade: () => void
  /**
   * Helper that verifies Pro status and redirects to pricing if not Pro.
   * Returns true if Pro, false if redirected.
   */
  requirePro: () => boolean
}

/**
 * Reusable hook to check whether the active organization has an active Pro subscription,
 * and navigate to the pricing page to upgrade.
 */
export function usePro(): UseProReturn {
  const router = useRouter()
  const { isLoaded, isSignedIn, orgId, has } = useAuth()

  const hasActiveOrg = Boolean(orgId)

  // In Clerk billing, org plan slugs can be checked with 'pro' or 'org:pro'
  const isPro = Boolean(
    hasActiveOrg && (has?.({ plan: "pro" }) || has?.({ plan: "org:pro" }))
  )

  const redirectToPricing = useCallback(() => {
    router.push("/pricing")
  }, [router])

  const requirePro = useCallback(() => {
    if (!isPro) {
      router.push("/pricing")
      return false
    }
    return true
  }, [isPro, router])

  return {
    isPro,
    isLoaded: Boolean(isLoaded),
    isSignedIn: Boolean(isSignedIn),
    orgId,
    hasActiveOrg,
    redirectToPricing,
    upgrade: redirectToPricing,
    requirePro,
  }
}

// Alias for convenience
export const useOrgPro = usePro
