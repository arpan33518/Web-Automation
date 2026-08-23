import { Show, SignInButton } from "@clerk/nextjs"
import { Button } from "@/components/ui/button"
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription, EmptyContent, EmptyMedia } from "@/components/ui/empty"
import { Plus, Workflow } from "lucide-react"

export default function Page() {
  return (
    <div className="flex min-h-screen items-center justify-center p-6 bg-background text-foreground">
      <Show when="signed-in">
        <Empty className="border-0 bg-transparent max-w-sm">
          <EmptyHeader className="gap-3">
            <EmptyMedia variant="icon" className="size-12 rounded-xl bg-muted [&_svg]:size-6">
              <Workflow className="size-6 text-foreground" />
            </EmptyMedia>
            <EmptyTitle className="text-lg font-semibold tracking-tight mt-2 text-foreground">
              No workflow selected
            </EmptyTitle>
            <EmptyDescription className="text-[14px] text-muted-foreground text-center leading-relaxed">
              Select a workflow from the sidebar
              <br />
              or create a new one to get started.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent className="mt-4">
            <Button className="h-9 px-4 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 font-medium flex items-center gap-1.5 shadow-sm">
              <Plus className="size-4" />
              <span>New workflow</span>
            </Button>
          </EmptyContent>
        </Empty>
      </Show>
      <Show when="signed-out">
        <div className="flex flex-col items-center gap-6 rounded-xl border bg-card p-8 shadow-sm min-w-[320px]">
          <SignInButton>
            <Button size="lg">Sign In to Continue</Button>
          </SignInButton>
        </div>
      </Show>
    </div>
  )
}

