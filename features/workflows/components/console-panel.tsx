"use client"

import * as React from "react"
import { Terminal } from "lucide-react"
import { toast } from "sonner"

import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable"
import { LogsPanel } from "@/features/workflows/components/logs-panel"
import { InspectorPanel } from "@/features/workflows/components/inspector-panel"
import {
  useWorkflowRuns,
  type WorkflowRun,
} from "@/features/workflows/components/workflow-runs-provider"
import type { RunStep } from "@/features/workflows/tasks/run-workflow"

export type ConsoleSelection =
  | { type: "step"; step: RunStep; run: WorkflowRun }
  | { type: "replay"; run: WorkflowRun; sessionId: string }

export interface ConsolePanelProps {
  className?: string
  onReset?: () => void
}

export function ConsolePanel({ className }: ConsolePanelProps) {
  const { latestRun, isLive } = useWorkflowRuns()

  // ConsolePanel owns the selection: either a step or a run's replay
  const [selected, setSelected] = React.useState<ConsoleSelection | null>(null)

  // Clicking a step selects it, clicking again deselects
  const handleStepClick = (step: RunStep, run: WorkflowRun) => {
    setSelected((prev) => {
      if (
        prev &&
        prev.type === "step" &&
        prev.step.id === step.id &&
        prev.run.id === run.id
      ) {
        return null
      }
      return { type: "step", step, run }
    })
  }

  // Clicking a replay selects it, clicking again deselects
  const handleReplayClick = (run: WorkflowRun, sessionId: string) => {
    setSelected((prev) => {
      if (prev && prev.type === "replay" && prev.run.id === run.id) {
        return null
      }
      return { type: "replay", run, sessionId }
    })
  }

  const selectedKey = selected
    ? selected.type === "step"
      ? `${selected.run.id}-${selected.step.id}`
      : `${selected.run.id}-replay`
    : null

  return (
    <div
      className={cn(
        "flex size-full flex-col overflow-hidden bg-background text-foreground",
        className
      )}
    >
      {/* Console Top Header */}
      <div className="flex h-9 shrink-0 items-center justify-between border-b border-border/70 bg-muted/40 px-3 py-1.5 text-xs">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 font-medium text-foreground">
            <Terminal className="size-3.5 text-muted-foreground" />
            <span>Console</span>
          </div>

          {isLive && (
            <Badge
              variant="outline"
              className="flex items-center gap-1 border-sky-500/30 bg-sky-500/10 px-1.5 py-0 text-[10px] font-semibold text-sky-400"
            >
              <span className="size-1.5 animate-pulse rounded-full bg-sky-400" />
              LIVE
            </Badge>
          )}

          {latestRun && (
            <span className="text-[11px] text-muted-foreground">
              • Latest Run{" "}
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(latestRun.id)
                  toast.success("Run ID copied")
                }}
                className="font-mono text-foreground hover:underline"
                title="Click to copy Run ID"
              >
                {latestRun.id.slice(0, 14)}...
              </button>
            </span>
          )}
        </div>
      </div>

      {/* Main Console View: Horizontal Resizable Panel Group between Logs and Inspector */}
      <div className="flex-1 overflow-hidden">
        <ResizablePanelGroup
          key={selected ? "with-inspector" : "logs-only"}
          orientation="horizontal"
          className="size-full"
        >
          {/* Runs List as LogsPanel */}
          <ResizablePanel
            defaultSize={selected ? 58 : 100}
            minSize={30}
            className="flex flex-col overflow-hidden"
          >
            <LogsPanel
              selectedKey={selectedKey}
              selectedStepKey={selectedKey}
              onStepClick={handleStepClick}
              onReplayClick={handleReplayClick}
            />
          </ResizablePanel>

          {/* InspectorPanel: rendered next to logs ONLY while a step or replay is selected */}
          {selected && (
            <>
              <ResizableHandle withHandle />
              <ResizablePanel
                defaultSize={42}
                minSize={25}
                className="flex flex-col overflow-hidden bg-background"
              >
                {selected.type === "step" ? (
                  <InspectorPanel
                    step={selected.step}
                    run={selected.run}
                    onClose={() => setSelected(null)}
                  />
                ) : (
                  <InspectorPanel
                    isReplay
                    sessionId={selected.sessionId}
                    run={selected.run}
                    onClose={() => setSelected(null)}
                  />
                )}
              </ResizablePanel>
            </>
          )}
        </ResizablePanelGroup>
      </div>
    </div>
  )
}
