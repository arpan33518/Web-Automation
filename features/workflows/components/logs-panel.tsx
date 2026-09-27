"use client"

import * as React from "react"
import prettyMs from "pretty-ms"
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  ExternalLink,
  History,
  Loader2,
  Zap,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { NodeIcon } from "@/features/workflows/components/node-icon"
import type { NodeType } from "@/features/workflows/nodes/node-registry"
import {
  useWorkflowRuns,
  getRunSteps,
  type WorkflowRun,
} from "@/features/workflows/components/workflow-runs-provider"
import type { RunStep } from "@/features/workflows/tasks/run-workflow"

export interface LogsPanelProps {
  className?: string
  selectedStepKey?: string | null
  onStepClick?: (step: RunStep, run: WorkflowRun) => void
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

export function LogsPanel({
  className,
  selectedStepKey,
  onStepClick,
}: LogsPanelProps) {
  const { runs } = useWorkflowRuns()
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

  const toggleRunExpanded = (runId: string) => {
    setExpandedRuns((prev) => ({
      ...prev,
      [runId]: prev[runId] === false ? true : false,
    }))
  }

  if (sortedRuns.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center p-6 text-center text-muted-foreground">
        <div className="flex size-10 items-center justify-center rounded-full bg-muted/70 text-muted-foreground">
          <Zap className="size-5" />
        </div>
        <div className="mt-2 text-xs font-semibold text-foreground">
          No workflow runs recorded yet
        </div>
        <p className="mt-1 max-w-sm text-[11px] text-muted-foreground">
          Execute this workflow to see every run and its step transitions.
        </p>
      </div>
    )
  }

  return (
    <div className={cn("flex flex-1 flex-col overflow-hidden", className)}>
      <div className="flex h-7 shrink-0 items-center justify-between border-b border-border/50 px-2.5 text-[11px] font-medium text-muted-foreground bg-muted/20">
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

              {/* Below each run: its steps */}
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
                          onClick={() => onStepClick?.(step, run)}
                          className={cn(
                            "w-full text-left px-2.5 py-1.5 rounded-md transition-all cursor-pointer flex items-center justify-between gap-2 border text-xs",
                            "border-border/40 bg-card/60 hover:bg-accent/50",
                            // Clicking a step selects it, clicking again deselects
                            isSelected &&
                              "ring-1 ring-primary border-primary bg-accent font-medium shadow-xs",
                            // A step spins while it's running
                            isRunning &&
                              "border-sky-500/40 bg-sky-500/10 text-sky-300 dark:bg-sky-500/15",
                            // Turns red if it failed
                            isFailed &&
                              "border-rose-500/40 bg-rose-500/10 text-rose-400 dark:bg-rose-500/15",
                            // Looks inactive if it never ran
                            isPending &&
                              "opacity-40 grayscale text-muted-foreground border-transparent bg-transparent hover:opacity-70"
                          )}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            {/* Step index */}
                            <span className="text-[10px] font-mono text-muted-foreground/60 w-3 shrink-0">
                              {stepIdx + 1}
                            </span>

                            {/* Node icon with running spinner inside its colored chip */}
                            <NodeIcon
                              type={step.nodeType as NodeType}
                              running={isRunning}
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
                            {/* Duration formatted with pretty-ms */}
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

                            {/* Status: red icon if failed, checkmark if done, clock if pending */}
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
  )
}
