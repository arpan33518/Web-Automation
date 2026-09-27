"use client"

import * as React from "react"
import prettyMs from "pretty-ms"
import {
  AlertCircle,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  Copy,
  ExternalLink,
  History,
  Layers,
  Loader2,
  Terminal,
  Zap,
} from "lucide-react"
import { toast } from "sonner"

import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { NodeIcon } from "@/features/workflows/components/right-sidebar"
import type { NodeType } from "@/features/workflows/nodes/node-registry"
import {
  useWorkflowRuns,
  getRunSteps,
  type WorkflowRun,
} from "@/features/workflows/components/workflow-runs-provider"
import type { RunStep } from "@/features/workflows/tasks/run-workflow"

interface WorkflowConsoleProps {
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

function getRunDuration(run: WorkflowRun): number | null {
  if (run.durationMs !== undefined && run.durationMs !== null) {
    return run.durationMs
  }
  if (run.startedAt && run.finishedAt) {
    const start = new Date(run.startedAt).getTime()
    const finish = new Date(run.finishedAt).getTime()
    return Math.max(0, finish - start)
  }
  return null
}

function getRunStatusBadge(status?: string) {
  const normalized = (status || "").toUpperCase()
  switch (normalized) {
    case "COMPLETED":
      return {
        label: "COMPLETED",
        icon: <CheckCircle2 className="size-3 text-emerald-400" />,
        className:
          "bg-emerald-500/10 text-emerald-400 border-emerald-500/25 dark:bg-emerald-500/15",
      }
    case "EXECUTING":
      return {
        label: "EXECUTING",
        icon: <Loader2 className="size-3 animate-spin text-sky-400" />,
        className:
          "bg-sky-500/10 text-sky-400 border-sky-500/25 dark:bg-sky-500/15",
      }
    case "FAILED":
    case "CRASHED":
    case "TIMED_OUT":
      return {
        label: normalized || "FAILED",
        icon: <AlertCircle className="size-3 text-rose-400" />,
        className:
          "bg-rose-500/10 text-rose-400 border-rose-500/25 dark:bg-rose-500/15",
      }
    case "QUEUED":
    case "DEQUEUED":
    case "WAITING_FOR_DEPLOY":
    case "REATTEMPTING":
      return {
        label: normalized,
        icon: <Clock className="size-3 text-amber-400" />,
        className:
          "bg-amber-500/10 text-amber-400 border-amber-500/25 dark:bg-amber-500/15",
      }
    default:
      return {
        label: normalized || "IDLE",
        icon: <Clock className="size-3 text-muted-foreground" />,
        className: "bg-muted text-muted-foreground border-border",
      }
  }
}

export function WorkflowConsole({ className }: WorkflowConsoleProps) {
  const { runs, latestRun, isLive } = useWorkflowRuns()

  // Track the currently selected step key: `${run.id}-${step.id}`
  const [selectedStepKey, setSelectedStepKey] = React.useState<string | null>(null)
  const [copiedText, setCopiedText] = React.useState<string | null>(null)
  // Track collapsed/expanded runs; defaults to true (expanded)
  const [expandedRuns, setExpandedRuns] = React.useState<Record<string, boolean>>({})

  // Sort runs: latest first
  const sortedRuns = React.useMemo(() => {
    if (!runs || runs.length === 0) return []
    return [...runs].sort((a, b) => {
      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0
      if (timeA !== timeB) return timeB - timeA
      return b.id.localeCompare(a.id)
    })
  }, [runs])

  // Resolve selected step and run
  const activeSelection = React.useMemo(() => {
    if (!selectedStepKey) return null
    for (const run of sortedRuns) {
      const steps = getRunSteps(run)
      for (const step of steps) {
        if (`${run.id}-${step.id}` === selectedStepKey) {
          return { run, step }
        }
      }
    }
    return null
  }, [selectedStepKey, sortedRuns])

  const toggleRunExpanded = (runId: string) => {
    setExpandedRuns((prev) => ({
      ...prev,
      [runId]: prev[runId] === false ? true : false,
    }))
  }

  const handleStepClick = (runId: string, stepId: string) => {
    const key = `${runId}-${stepId}`
    // Clicking a step selects it; clicking again deselects
    setSelectedStepKey((prev) => (prev === key ? null : key))
  }

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    setCopiedText(label)
    toast.success(`${label} copied`)
    setTimeout(() => setCopiedText(null), 2000)
  }

  return (
    <div
      className={cn(
        "flex size-full flex-col overflow-hidden bg-background text-foreground",
        className
      )}
    >
      {/* Console Top Header Bar */}
      <div className="flex h-9 shrink-0 items-center justify-between border-b border-border/70 bg-muted/40 px-3 py-1.5 text-xs">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 font-medium text-foreground">
            <Terminal className="size-3.5 text-muted-foreground" />
            <span>Execution Console</span>
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

        <div className="flex items-center gap-3">
          <span className="text-[11px] text-muted-foreground">
            {sortedRuns.length} {sortedRuns.length === 1 ? "run" : "runs"}
          </span>
        </div>
      </div>

      {/* Main Console Body: Runs & Steps List + Step Details Pane */}
      {sortedRuns.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center p-6 text-center text-muted-foreground">
          <div className="flex size-10 items-center justify-center rounded-full bg-muted/70 text-muted-foreground">
            <Zap className="size-5" />
          </div>
          <div className="mt-2 text-xs font-semibold text-foreground">
            No workflow runs recorded yet
          </div>
          <p className="mt-1 max-w-sm text-[11px] text-muted-foreground">
            Execute this workflow to see every run, its step transitions,
            execution outputs, and performance timings.
          </p>
        </div>
      ) : (
        <div className="grid flex-1 grid-cols-12 overflow-hidden">
          {/* Left Column: Workflow Runs (Every run and, below it, its steps) */}
          <div className="col-span-7 flex flex-col border-r border-border/60 bg-muted/10 overflow-hidden">
            <div className="flex h-7 shrink-0 items-center justify-between border-b border-border/50 px-2.5 text-[11px] font-medium text-muted-foreground">
              <span className="flex items-center gap-1">
                <History className="size-3" />
                Workflow Runs & Steps
              </span>
              <span>{sortedRuns.length} runs</span>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-border/40">
              {sortedRuns.map((run, idx) => {
                const runSteps = getRunSteps(run)
                const isExpanded = expandedRuns[run.id] !== false
                const badge = getRunStatusBadge(run.status)
                const duration = getRunDuration(run)
                const dateStr = run.createdAt
                  ? new Date(run.createdAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                    })
                  : `#${sortedRuns.length - idx}`

                const sessionUrl = (
                  run.metadata as { browserbaseSessionUrl?: string } | undefined
                )?.browserbaseSessionUrl

                return (
                  <div key={run.id} className="flex flex-col bg-background/50">
                    {/* Run Header Row */}
                    <div
                      className={cn(
                        "flex items-center justify-between px-3 py-2 text-xs transition-colors hover:bg-muted/40 cursor-pointer border-b border-border/30",
                        run.status === "EXECUTING" && "bg-sky-500/5"
                      )}
                      onClick={() => toggleRunExpanded(run.id)}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <button
                          type="button"
                          className="text-muted-foreground hover:text-foreground shrink-0"
                          onClick={(e) => {
                            e.stopPropagation()
                            toggleRunExpanded(run.id)
                          }}
                        >
                          {isExpanded ? (
                            <ChevronDown className="size-3.5" />
                          ) : (
                            <ChevronRight className="size-3.5" />
                          )}
                        </button>

                        <span className="font-mono text-[11px] font-semibold text-foreground truncate">
                          Run {run.id.slice(0, 14)}...
                        </span>

                        <Badge
                          variant="outline"
                          className={cn(
                            "px-1.5 py-0 text-[9px] font-semibold shrink-0 gap-1",
                            badge.className
                          )}
                        >
                          {badge.icon}
                          {badge.label}
                        </Badge>
                      </div>

                      <div className="flex items-center gap-2.5 text-[10px] text-muted-foreground shrink-0 font-mono">
                        {sessionUrl && (
                          <a
                            href={sessionUrl}
                            target="_blank"
                            rel="noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center gap-1 text-primary hover:underline"
                            title="Open Browserbase session"
                          >
                            <span>Session</span>
                            <ExternalLink className="size-2.5" />
                          </a>
                        )}

                        <span>{dateStr}</span>

                        {duration !== null && (
                          <span className="font-semibold text-foreground">
                            {formatDuration(duration)}
                          </span>
                        )}

                        <span className="text-muted-foreground/80">
                          ({runSteps.length} {runSteps.length === 1 ? "step" : "steps"})
                        </span>
                      </div>
                    </div>

                    {/* Below it: Its steps */}
                    {isExpanded && (
                      <div className="py-1 px-2 space-y-1 bg-muted/15 border-b border-border/40">
                        {runSteps.length === 0 ? (
                          <div className="py-2 px-3 text-[11px] text-muted-foreground italic">
                            No steps recorded for this run.
                          </div>
                        ) : (
                          runSteps.map((step, stepIdx) => {
                            const stepKey = `${run.id}-${step.id}`
                            const isSelected = selectedStepKey === stepKey
                            const isRunning = step.status === "running"
                            const isFailed = step.status === "failed"
                            const isPending = step.status === "pending" || !step.status
                            const isDone = step.status === "done"

                            const durationFormatted = formatDuration(step.durationMs)

                            return (
                              <button
                                key={step.id || stepIdx}
                                type="button"
                                onClick={() => handleStepClick(run.id, step.id)}
                                className={cn(
                                  "w-full text-left px-2.5 py-1.5 rounded-md transition-all cursor-pointer flex items-center justify-between gap-2 border text-xs",
                                  // Base styling
                                  "border-border/40 bg-card/60 hover:bg-accent/50",
                                  // Selection styling: clicking a step selects it, clicking again deselects
                                  isSelected &&
                                    "ring-1 ring-primary border-primary bg-accent font-medium shadow-xs",
                                  // Running state: spins while running
                                  isRunning &&
                                    "border-sky-500/40 bg-sky-500/10 text-sky-300 dark:bg-sky-500/15",
                                  // Failed state: turns red if it failed
                                  isFailed &&
                                    "border-rose-500/40 bg-rose-500/10 text-rose-400 dark:bg-rose-500/15",
                                  // Inactive state: looks inactive if it never ran
                                  isPending &&
                                    "opacity-40 grayscale text-muted-foreground border-transparent bg-transparent hover:opacity-70"
                                )}
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  {/* Step index */}
                                  <span className="text-[10px] font-mono text-muted-foreground/60 w-3 shrink-0">
                                    {stepIdx + 1}
                                  </span>

                                  {/* Node Icon chip (reused from right-sidebar) */}
                                  <NodeIcon
                                    type={step.nodeType as NodeType}
                                    className={cn(
                                      "size-5 shrink-0",
                                      isFailed && "bg-rose-500/20 text-rose-400",
                                      isPending && "opacity-60"
                                    )}
                                    iconClassName={cn(
                                      "size-3",
                                      isFailed && "text-rose-400"
                                    )}
                                  />

                                  {/* Step title */}
                                  <span
                                    className={cn(
                                      "truncate text-xs font-medium",
                                      isFailed
                                        ? "text-rose-400 dark:text-rose-300"
                                        : "text-foreground"
                                    )}
                                  >
                                    {step.title || step.nodeType}
                                  </span>
                                </div>

                                <div className="flex items-center gap-2 shrink-0">
                                  {/* How long it took (formatted with pretty-ms) */}
                                  {durationFormatted && (
                                    <span
                                      className={cn(
                                        "font-mono text-[10px] tabular-nums",
                                        isFailed
                                          ? "text-rose-400/80"
                                          : "text-muted-foreground"
                                      )}
                                    >
                                      {durationFormatted}
                                    </span>
                                  )}

                                  {/* Status indicator: spins while running, red icon if failed, checkmark if done */}
                                  {isRunning && (
                                    <Loader2 className="size-3.5 animate-spin text-sky-400" />
                                  )}
                                  {isFailed && (
                                    <AlertCircle className="size-3.5 text-rose-500" />
                                  )}
                                  {isDone && (
                                    <CheckCircle2 className="size-3.5 text-emerald-500" />
                                  )}
                                  {isPending && (
                                    <Clock className="size-3 text-muted-foreground/50" />
                                  )}
                                </div>
                              </button>
                            )
                          })
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Right Column: Step Output & Details Pane */}
          <div className="col-span-5 flex flex-col bg-background overflow-hidden">
            {activeSelection ? (
              <div className="flex size-full flex-col overflow-hidden">
                {/* Step Details Header */}
                <div className="flex h-10 shrink-0 items-center justify-between border-b border-border/60 bg-muted/20 px-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <NodeIcon
                      type={activeSelection.step.nodeType as NodeType}
                      className="size-5 shrink-0"
                      iconClassName="size-3"
                    />
                    <span className="text-xs font-semibold text-foreground truncate">
                      {activeSelection.step.title || activeSelection.step.nodeType}
                    </span>
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-[10px] px-1.5 py-0 font-medium shrink-0",
                        activeSelection.step.status === "done" &&
                          "bg-emerald-500/10 text-emerald-400 border-emerald-500/25",
                        activeSelection.step.status === "failed" &&
                          "bg-rose-500/10 text-rose-400 border-rose-500/25",
                        activeSelection.step.status === "running" &&
                          "bg-sky-500/10 text-sky-400 border-sky-500/25",
                        activeSelection.step.status === "pending" &&
                          "bg-muted text-muted-foreground border-border"
                      )}
                    >
                      {activeSelection.step.status?.toUpperCase() || "PENDING"}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-2">
                    {activeSelection.step.durationMs !== undefined && (
                      <span className="font-mono text-[11px] text-muted-foreground tabular-nums">
                        took {formatDuration(activeSelection.step.durationMs)}
                      </span>
                    )}
                    <Button
                      variant="ghost"
                      size="xs"
                      className="h-6 text-[10px] px-1.5 text-muted-foreground hover:text-foreground"
                      onClick={() => setSelectedStepKey(null)}
                      title="Deselect step"
                    >
                      Deselect
                    </Button>
                  </div>
                </div>

                {/* Step Details Content */}
                <div className="flex-1 overflow-y-auto p-3 space-y-3">
                  {/* Failure Error Alert */}
                  {activeSelection.step.status === "failed" && (
                    <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-1.5 font-semibold text-rose-400">
                          <AlertCircle className="size-4" />
                          <span>Step Error</span>
                        </div>
                        {activeSelection.step.error && (
                          <button
                            type="button"
                            onClick={() =>
                              copyToClipboard(
                                activeSelection.step.error!,
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
                        {activeSelection.step.error ||
                          "Step failed without a specific error message."}
                      </pre>
                    </div>
                  )}

                  {/* Running state notice */}
                  {activeSelection.step.status === "running" && (
                    <div className="rounded-lg border border-sky-500/30 bg-sky-500/5 p-3 text-xs text-sky-300 flex items-center gap-2">
                      <Loader2 className="size-4 animate-spin text-sky-400" />
                      <span>This step is currently executing...</span>
                    </div>
                  )}

                  {/* Pending state notice */}
                  {activeSelection.step.status === "pending" && (
                    <div className="rounded-lg border border-border/60 bg-muted/30 p-3 text-xs text-muted-foreground flex items-center gap-2">
                      <Clock className="size-4" />
                      <span>This step is pending execution.</span>
                    </div>
                  )}

                  {/* Output Viewer */}
                  {activeSelection.step.output !== undefined &&
                    activeSelection.step.output !== null && (
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs font-semibold text-foreground">
                          <span>Output</span>
                          <Button
                            variant="ghost"
                            size="xs"
                            className="h-6 text-[10px] gap-1 px-1.5"
                            onClick={() => {
                              const serialized =
                                typeof activeSelection.step.output === "string"
                                  ? activeSelection.step.output
                                  : JSON.stringify(
                                      activeSelection.step.output,
                                      null,
                                      2
                                    )
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
                            {typeof activeSelection.step.output === "string"
                              ? activeSelection.step.output
                              : JSON.stringify(
                                  activeSelection.step.output,
                                  null,
                                  2
                                )}
                          </pre>
                        </div>
                      </div>
                    )}

                  {/* Timing & Node Metadata */}
                  <div className="rounded-md border border-border/50 bg-muted/20 p-2 text-[11px] text-muted-foreground space-y-1">
                    <div className="flex justify-between">
                      <span>Node ID:</span>
                      <span className="font-mono text-foreground">
                        {activeSelection.step.id}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Type:</span>
                      <span className="font-mono text-foreground">
                        {activeSelection.step.nodeType}
                      </span>
                    </div>
                    {activeSelection.step.startedAt && (
                      <div className="flex justify-between">
                        <span>Started:</span>
                        <span className="font-mono text-foreground">
                          {new Date(
                            activeSelection.step.startedAt
                          ).toLocaleTimeString()}
                        </span>
                      </div>
                    )}
                    {activeSelection.step.completedAt && (
                      <div className="flex justify-between">
                        <span>Completed:</span>
                        <span className="font-mono text-foreground">
                          {new Date(
                            activeSelection.step.completedAt
                          ).toLocaleTimeString()}
                        </span>
                      </div>
                    )}
                    {activeSelection.step.durationMs !== undefined && (
                      <div className="flex justify-between">
                        <span>Duration:</span>
                        <span className="font-mono text-foreground font-medium">
                          {formatDuration(activeSelection.step.durationMs)}
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
      )}
    </div>
  )
}

export { ConsolePanel } from "@/features/workflows/components/console-panel"
export { LogsPanel } from "@/features/workflows/components/logs-panel"
