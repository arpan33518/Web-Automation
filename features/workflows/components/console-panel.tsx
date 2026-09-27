"use client"

import * as React from "react"
import prettyMs from "pretty-ms"
import {
  AlertCircle,
  Check,
  Clock,
  Copy,
  Layers,
  Loader2,
  Terminal,
} from "lucide-react"
import { toast } from "sonner"

import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { LogsPanel } from "@/features/workflows/components/logs-panel"
import { NodeIcon } from "@/features/workflows/components/right-sidebar"
import type { NodeType } from "@/features/workflows/nodes/node-registry"
import {
  useWorkflowRuns,
  type WorkflowRun,
} from "@/features/workflows/components/workflow-runs-provider"
import type { RunStep } from "@/features/workflows/tasks/run-workflow"

export interface ConsolePanelProps {
  className?: string
  onReset?: () => void
}

function formatDuration(ms?: number | null): string {
  if (ms === undefined || ms === null || isNaN(ms)) return ""
  try {
    return prettyMs(Math.max(0, Math.round(ms)), { secondsDecimalDigits: 1 })
  } catch {
    return `${Math.round(ms)}ms`
  }
}

export function ConsolePanel({ className }: ConsolePanelProps) {
  const { latestRun, isLive } = useWorkflowRuns()

  // ConsolePanel owns the selection
  const [selected, setSelected] = React.useState<{
    step: RunStep
    run: WorkflowRun
  } | null>(null)

  const [copiedText, setCopiedText] = React.useState<string | null>(null)

  // Clicking a step selects it, clicking again deselects
  const handleStepClick = (step: RunStep, run: WorkflowRun) => {
    setSelected((prev) => {
      if (prev && prev.step.id === step.id && prev.run.id === run.id) {
        return null
      }
      return { step, run }
    })
  }

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    setCopiedText(label)
    toast.success(`${label} copied`)
    setTimeout(() => setCopiedText(null), 2000)
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
                onClick={() => copyToClipboard(latestRun.id, "Latest Run ID")}
                className="font-mono text-foreground hover:underline"
                title="Click to copy Run ID"
              >
                {latestRun.id.slice(0, 14)}...
              </button>
            </span>
          )}
        </div>
      </div>

      {/* Main Console Split View: LogsPanel on Left, Step Details on Right */}
      <div className="grid flex-1 grid-cols-12 overflow-hidden">
        {/* Runs List as LogsPanel */}
        <div className="col-span-7 flex flex-col border-r border-border/60 overflow-hidden">
          <LogsPanel
            selectedStepKey={selectedStepKey}
            onStepClick={handleStepClick}
          />
        </div>

        {/* Step Details & Output Inspector */}
        <div className="col-span-5 flex flex-col bg-background overflow-hidden">
          {selected ? (
            <div className="flex size-full flex-col overflow-hidden">
              {/* Header */}
              <div className="flex h-10 shrink-0 items-center justify-between border-b border-border/60 bg-muted/20 px-3">
                <div className="flex items-center gap-2 min-w-0">
                  <NodeIcon
                    type={selected.step.nodeType as NodeType}
                    className="size-5 shrink-0"
                    iconClassName="size-3"
                  />
                  <span className="text-xs font-semibold text-foreground truncate">
                    {selected.step.title || selected.step.nodeType}
                  </span>
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-[10px] px-1.5 py-0 font-medium shrink-0",
                      selected.step.status === "done" &&
                        "bg-emerald-500/10 text-emerald-400 border-emerald-500/25",
                      selected.step.status === "failed" &&
                        "bg-rose-500/10 text-rose-400 border-rose-500/25",
                      selected.step.status === "running" &&
                        "bg-sky-500/10 text-sky-400 border-sky-500/25",
                      selected.step.status === "pending" &&
                        "bg-muted text-muted-foreground border-border"
                    )}
                  >
                    {selected.step.status?.toUpperCase() || "PENDING"}
                  </Badge>
                </div>

                <div className="flex items-center gap-2">
                  {selected.step.durationMs !== undefined && (
                    <span className="font-mono text-[11px] text-muted-foreground tabular-nums">
                      took {formatDuration(selected.step.durationMs)}
                    </span>
                  )}
                  <Button
                    variant="ghost"
                    size="xs"
                    className="h-6 text-[10px] px-1.5 text-muted-foreground hover:text-foreground"
                    onClick={() => setSelected(null)}
                    title="Deselect step"
                  >
                    Deselect
                  </Button>
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-3 space-y-3">
                {/* Step Error */}
                {selected.step.status === "failed" && (
                  <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-1.5 font-semibold text-rose-400">
                        <AlertCircle className="size-4" />
                        <span>Step Error</span>
                      </div>
                      {selected.step.error && (
                        <button
                          type="button"
                          onClick={() =>
                            copyToClipboard(
                              selected.step.error!,
                              "Error message"
                            )
                          }
                          className="inline-flex items-center gap-1 text-[10px] text-rose-300 hover:text-white"
                        >
                          <Copy className="size-3" />
                          <span>Copy</span>
                        </button>
                      )}
                    </div>
                    <pre className="font-mono text-[11px] whitespace-pre-wrap break-all bg-rose-950/40 p-2 rounded border border-rose-500/20 text-rose-200">
                      {selected.step.error ||
                        "Step failed without a specific error message."}
                    </pre>
                  </div>
                )}

                {/* Running notice */}
                {selected.step.status === "running" && (
                  <div className="rounded-lg border border-sky-500/30 bg-sky-500/5 p-3 text-xs text-sky-300 flex items-center gap-2">
                    <Loader2 className="size-4 animate-spin text-sky-400" />
                    <span>This step is currently executing...</span>
                  </div>
                )}

                {/* Pending notice */}
                {selected.step.status === "pending" && (
                  <div className="rounded-lg border border-border/60 bg-muted/30 p-3 text-xs text-muted-foreground flex items-center gap-2">
                    <Clock className="size-4" />
                    <span>This step is pending execution.</span>
                  </div>
                )}

                {/* Output viewer */}
                {selected.step.output !== undefined &&
                  selected.step.output !== null && (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs font-semibold text-foreground">
                        <span>Output</span>
                        <Button
                          variant="ghost"
                          size="xs"
                          className="h-6 text-[10px] gap-1 px-1.5"
                          onClick={() => {
                            const serialized =
                              typeof selected.step.output === "string"
                                ? selected.step.output
                                : JSON.stringify(selected.step.output, null, 2)
                            copyToClipboard(serialized, "Step output")
                          }}
                        >
                          {copiedText === "Step output" ? (
                            <Check className="size-3 text-emerald-400" />
                          ) : (
                            <Copy className="size-3" />
                          )}
                          <span>Copy Output</span>
                        </Button>
                      </div>

                      <div className="rounded-md border border-border/60 bg-zinc-950/80 p-2.5 font-mono text-[11px] text-zinc-200 overflow-x-auto">
                        <pre className="whitespace-pre-wrap break-all">
                          {typeof selected.step.output === "string"
                            ? selected.step.output
                            : JSON.stringify(selected.step.output, null, 2)}
                        </pre>
                      </div>
                    </div>
                  )}

                {/* Timing & Node Metadata */}
                <div className="rounded-md border border-border/50 bg-muted/20 p-2 text-[11px] text-muted-foreground space-y-1">
                  <div className="flex justify-between">
                    <span>Node ID:</span>
                    <span className="font-mono text-foreground">
                      {selected.step.id}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Type:</span>
                    <span className="font-mono text-foreground">
                      {selected.step.nodeType}
                    </span>
                  </div>
                  {selected.step.startedAt && (
                    <div className="flex justify-between">
                      <span>Started:</span>
                      <span className="font-mono text-foreground">
                        {new Date(selected.step.startedAt).toLocaleTimeString()}
                      </span>
                    </div>
                  )}
                  {selected.step.completedAt && (
                    <div className="flex justify-between">
                      <span>Completed:</span>
                      <span className="font-mono text-foreground">
                        {new Date(
                          selected.step.completedAt
                        ).toLocaleTimeString()}
                      </span>
                    </div>
                  )}
                  {selected.step.durationMs !== undefined && (
                    <div className="flex justify-between">
                      <span>Duration:</span>
                      <span className="font-mono text-foreground font-medium">
                        {formatDuration(selected.step.durationMs)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex size-full flex-col items-center justify-center p-6 text-center text-muted-foreground">
              <Layers className="size-8 stroke-[1.5] text-muted-foreground/40 mb-2" />
              <span className="text-xs font-semibold text-foreground">
                No step selected
              </span>
              <p className="mt-1 text-[11px] text-muted-foreground max-w-[200px]">
                Click any step on the left to inspect its output. Click again to deselect.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
