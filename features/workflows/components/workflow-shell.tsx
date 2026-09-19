"use client"

import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable"
import { RightSidebar } from "@/features/workflows/components/right-sidebar"
import { WorkflowCanvas } from "@/features/workflows/components/workflow-canvas"

interface WorkflowShellProps {
  workflowId: string
}

export function WorkflowShell({ workflowId }: WorkflowShellProps) {
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
            <WorkflowCanvas workflowId={workflowId} />
          </ResizablePanel>

          <ResizableHandle />

          {/* Bottom panel: logs */}
          <ResizablePanel defaultSize="8rem" minSize="6rem">
            <div className="flex size-full items-center justify-center p-4">
              <span className="text-sm font-medium text-muted-foreground">Logs</span>
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
