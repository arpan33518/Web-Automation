"use client"

import * as React from "react"
import { AlertTriangle } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  React.useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="flex flex-1 items-center justify-center p-6 h-full">
      <Empty className="border-0 bg-transparent max-w-sm">
        <EmptyHeader className="gap-3">
          <EmptyMedia
            variant="icon"
            className="size-12 rounded-xl bg-destructive/10 text-destructive [&_svg]:size-6"
          >
            <AlertTriangle className="size-6 text-destructive" />
          </EmptyMedia>
          <EmptyTitle className="text-lg font-semibold tracking-tight mt-2 text-foreground">
            Something went wrong
          </EmptyTitle>
          <EmptyDescription className="text-sm text-muted-foreground text-center leading-relaxed">
            {error.message || "An unexpected error occurred while loading this workflow."}
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent className="mt-4">
          <Button
            onClick={() => reset()}
            variant="outline"
            className="h-9 px-4 rounded-lg font-medium"
          >
            Try again
          </Button>
        </EmptyContent>
      </Empty>
    </div>
  )
}
