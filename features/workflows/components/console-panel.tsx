"use client"

import * as React from "react"
import { Terminal } from "lucide-react"
import { toast } from "sonner"

import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { LogsPanel } from "@/features/workflows/components/logs-panel"
import { InspectorPanel } from "@/features/workflows/components/inspector-panel"
import {
  useWorkflowRuns,
  type WorkflowRun,
} from "@/features/workflows/components/workflow-runs-provider"
import type { RunStep } from "@/features/workflows/tasks/run-workflow"

export interface ConsolePanelProps {
  className?: string
  onReset?: () => void
}

export function ConsolePanel({ className }: ConsolePanelProps) {
  const { latestRun, isLive } = useWorkflowRuns()

  // ConsolePanel owns the selection
  const [selected, setSelected] = React.useState<{
    step: RunStep
    run: WorkflowRun
  } | null>(null)

  // Clicking a step selects it, clicking again deselects
  const handleStepClick = (step: RunStep, run: WorkflowRun) => {
    setSelected((prev) => {
      if (prev && prev.step.id === step.id && prev.run.id === run.id) {
        return null
      }
      return { step, run }
    })
  }

  const selectedStepKey = selected
    ? `${selected.run.id}-${selected.step.id}`
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

      {/* Main Console View: LogsPanel and optional InspectorPanel */}
      <div className="flex flex-1 overflow-hidden">
        {/* Runs List as LogsPanel */}
        <div
          className={cn(
            "flex flex-col overflow-hidden transition-all duration-150",
            selected ? "w-7/12 border-r border-border/60" : "w-full"
          )}
        >
          <LogsPanel
            selectedStepKey={selectedStepKey}
            onStepClick={handleStepClick}
          />
        </div>

        {/* InspectorPanel: rendered next to logs ONLY while a step is selected */}
        {selected && (
          <div className="w-5/12 flex flex-col overflow-hidden bg-background">
            <InspectorPanel
              step={selected.step}
              run={selected.run}
              onClose={() => setSelected(null)}
            />
          </div>
        )}
      </div>
    </div>
  )
}
