import Link from "next/link"
import { FileQuestion } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"

export default function NotFound() {
  return (
    <div className="flex flex-1 items-center justify-center p-6 h-full">
      <Empty className="border-0 bg-transparent max-w-sm">
        <EmptyHeader className="gap-3">
          <EmptyMedia
            variant="icon"
            className="size-12 rounded-xl bg-muted [&_svg]:size-6"
          >
            <FileQuestion className="size-6 text-foreground" />
          </EmptyMedia>
          <EmptyTitle className="text-lg font-semibold tracking-tight mt-2 text-foreground">
            Workflow not found
          </EmptyTitle>
          <EmptyDescription className="text-sm text-muted-foreground text-center leading-relaxed">
            The workflow you are looking for does not exist or you do not have permission to view it.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent className="mt-4">
          <Button asChild variant="outline" className="h-9 px-4 rounded-lg font-medium">
            <Link href="/">Back to Dashboard</Link>
          </Button>
        </EmptyContent>
      </Empty>
    </div>
  )
}
