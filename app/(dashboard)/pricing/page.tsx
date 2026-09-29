import { auth } from "@clerk/nextjs/server"
import { PricingTable, OrganizationList, SignInButton } from "@clerk/nextjs"
import { Button } from "@/components/ui/button"
import { Sparkles, Building2, ShieldCheck } from "lucide-react"

export const metadata = {
  title: "Pricing | Browser Automation",
  description: "Manage subscription plans and upgrade your organization.",
}

export default async function PricingPage() {
  const { userId, orgId } = await auth()

  return (
    <div className="flex h-full flex-1 flex-col overflow-y-auto bg-background text-foreground">
      {/* Header section */}
      <div className="relative border-b border-border/40 bg-card/40 px-8 py-10 backdrop-blur-sm">
        <div className="mx-auto max-w-5xl">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            <Sparkles className="size-3.5" />
            <span>Organization Plans</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Flexible plans for automated workflows
          </h1>
          <p className="mt-3 max-w-2xl text-base text-muted-foreground">
            Scale your browser automations with higher concurrency, priority
            execution, and enterprise-ready AI capabilities.
          </p>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 px-8 py-8">
        <div className="mx-auto max-w-5xl">
          {!userId ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/20 p-12 text-center">
              <ShieldCheck className="mb-4 size-12 text-muted-foreground" />
              <h2 className="mb-2 text-xl font-semibold">
                Sign in to view plans
              </h2>
              <p className="mb-6 max-w-md text-sm text-muted-foreground">
                Please sign in to your account to view available subscription
                plans and manage your billing.
              </p>
              <SignInButton>
                <Button size="lg">Sign In</Button>
              </SignInButton>
            </div>
          ) : !orgId ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/20 p-10 text-center">
              <Building2 className="mb-4 size-12 text-primary/70" />
              <h2 className="mb-2 text-xl font-semibold">
                Select an Organization
              </h2>
              <p className="mb-6 max-w-md text-sm text-muted-foreground">
                These subscription plans attach to your organization. Select or
                create an organization to manage its subscription and unlock Pro
                features.
              </p>
              <OrganizationList
                hidePersonal
                afterCreateOrganizationUrl="/pricing"
                afterSelectOrganizationUrl="/pricing"
              />
            </div>
          ) : (
            <div className="flex w-full justify-center py-4">
              <PricingTable
                for="organization"
                newSubscriptionRedirectUrl="/pricing"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
