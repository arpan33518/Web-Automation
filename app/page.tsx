import { UserButton, Show, SignInButton, OrganizationSwitcher } from "@clerk/nextjs"
import { Button } from "@/components/ui/button"

export default function Page() {
  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="flex flex-col items-center gap-6 rounded-xl border bg-card p-8 shadow-sm min-w-[320px]">
        <Show when="signed-in">
          <div className="flex flex-col items-center gap-4 w-full">
            <UserButton showName />
            <div className="border-t pt-4 w-full flex justify-center">
              <OrganizationSwitcher
                hidePersonal
                afterCreateOrganizationUrl="/"
                afterSelectOrganizationUrl="/"
                afterLeaveOrganizationUrl="/"
              />
            </div>
          </div>
        </Show>
        <Show when="signed-out">
          <SignInButton>
            <Button size="lg">Sign In to Continue</Button>
          </SignInButton>
        </Show>
      </div>
    </div>
  )
}
