"use client"

import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable"

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
            <div className="flex size-full items-center justify-center p-4">
              <span className="text-sm font-medium text-muted-foreground">Canvas</span>
            </div>
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
      <ResizablePanel defaultSize="16rem" minSize="14rem" maxSize="36rem">
        <div className="flex size-full items-center justify-center p-4">
          <span className="text-sm font-medium text-muted-foreground">Inspector</span>
        </div>
      </ResizablePanel>
    </ResizablePanelGroup>
  )
}
