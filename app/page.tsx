import { UserButton, Show, SignInButton } from "@clerk/nextjs"
import { Button } from "@/components/ui/button"

export default function Page() {
  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="flex flex-col items-center gap-4 rounded-xl border bg-card p-8 shadow-sm">
        <Show when="signed-in">
          <UserButton showName />
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
