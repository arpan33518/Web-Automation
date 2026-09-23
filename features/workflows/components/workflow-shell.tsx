"use client"

import { useCallback } from "react"
import dynamic from "next/dynamic"

import { useMutation, useStorage, useStorageRoot } from "@liveblocks/react"

import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable"
import { RightSidebar } from "@/features/workflows/components/right-sidebar"
import { WorkflowRunStatus } from "@/features/workflows/components/workflow-run-status"
import type { WorkflowGraph } from "@/lib/db/schema"

const WorkflowCanvas = dynamic(
  () =>
    import("@/features/workflows/components/workflow-canvas").then(
      (mod) => mod.WorkflowCanvas
    ),
  {
    ssr: false,
    loading: () => (
      <div className="flex size-full items-center justify-center bg-background text-xs text-muted-foreground">
        Loading canvas...
      </div>
    ),
  }
)

interface WorkflowShellProps {
  workflowId: string
  initialGraph?: WorkflowGraph
}

export function WorkflowShell({ workflowId, initialGraph }: WorkflowShellProps) {
  const [storageRoot] = useStorageRoot()
  const liveRunState = useStorage((storage) => (storage as any)?.lastRun)
  const resetRunState = useMutation(({ storage }) => {
    try {
      ;(storage as any).delete("lastRun")
    } catch {
      // ignore
    }
  }, [])

  const handleReset = useCallback(() => {
    if (!storageRoot) return
    try {
      resetRunState()
    } catch {
      // ignore
    }
  }, [storageRoot, resetRunState])

  return (
    <ResizablePanelGroup
      orientation="horizontal"
      className="size-full"
      data-workflow-id={workflowId}
    >
      {/* Left panel: primary column */}
      <ResizablePanel minSize="30rem">
        <ResizablePanelGroup orientation="vertical" className="size-full">
          {/* Top panel: canvas */}
          <ResizablePanel minSize="18rem">
            <WorkflowCanvas workflowId={workflowId} initialGraph={initialGraph} />
          </ResizablePanel>

          <ResizableHandle />

          {/* Bottom panel: logs / run execution */}
          <ResizablePanel defaultSize="10rem" minSize="6rem" className="bg-background">
            <div className="size-full overflow-y-auto p-3">
              <WorkflowRunStatus
                runState={liveRunState ?? null}
                onReset={handleReset}
              />
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </ResizablePanel>

      <ResizableHandle />

      {/* Right panel: inspector */}
      <RightSidebar workflowId={workflowId} />
    </ResizablePanelGroup>
  )
}

