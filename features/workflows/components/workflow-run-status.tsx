"use client"

import * as React from "react"
import {
  AlertCircle,
  ArrowRight,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  Layers,
  Loader2,
  Sparkles,
  Zap,
} from "lucide-react"
import { toast } from "sonner"

import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import type { WorkflowRunStatusType } from "@/features/workflows/actions"

export interface WorkflowRunState {
  runId: string | null
  status: WorkflowRunStatusType | "IDLE"
  isCompleted: boolean
  isExecuting: boolean
  isQueued: boolean
  createdAt: string | null
  startedAt: string | null
  finishedAt: string | null
  durationMs: number | null
  error: string | null
  output: unknown
  isSimulated?: boolean
}

interface WorkflowRunStatusProps {
  runState: WorkflowRunState | null
  onSimulate?: () => void
  onReset?: () => void
  className?: string
}

type StageKey = "QUEUED" | "DEQUEUED" | "EXECUTING" | "COMPLETED"

interface StageConfig {
  key: StageKey
  label: string
  shortDesc: string
}

const STAGES: StageConfig[] = [
  { key: "QUEUED", label: "Queued", shortDesc: "In task queue" },
  { key: "DEQUEUED", label: "Dequeued", shortDesc: "Claimed by worker" },
  { key: "EXECUTING", label: "Executing", shortDesc: "Processing steps" },
  { key: "COMPLETED", label: "Completed", shortDesc: "Finished" },
]

export function WorkflowRunStatus({
  runState,
  onSimulate,
  onReset,
  className,
}: WorkflowRunStatusProps) {
  const [copied, setCopied] = React.useState(false)
  const [showOutput, setShowOutput] = React.useState(false)
  const [elapsedSec, setElapsedSec] = React.useState<number>(0)

  // Live timer for active run
  React.useEffect(() => {
    if (!runState || runState.status === "IDLE") {
      setElapsedSec(0)
      return
    }

    if (runState.isCompleted) {
      if (runState.durationMs) {
        setElapsedSec(Math.round(runState.durationMs / 100) / 10)
      }
      return
    }

    const startTime = runState.startedAt
      ? new Date(runState.startedAt).getTime()
      : Date.now()

    const interval = setInterval(() => {
      const seconds = (Date.now() - startTime) / 1000
      setElapsedSec(Math.max(0, Math.round(seconds * 10) / 10))
    }, 100)

    return () => clearInterval(interval)
  }, [runState])

  const copyRunId = () => {
    if (!runState?.runId) return
    navigator.clipboard.writeText(runState.runId)
    setCopied(true)
    toast.success("Run ID copied to clipboard")
    setTimeout(() => setCopied(false), 2000)
  }

  if (!runState || runState.status === "IDLE") {
    return (
      <div
        className={cn(
          "w-full rounded-xl border border-dashed border-border/70 bg-muted/20 p-4 text-center transition-all",
          className
        )}
      >
        <div className="flex flex-col items-center gap-2">
          <div className="flex size-9 items-center justify-center rounded-full bg-muted text-muted-foreground/80">
            <Zap className="size-4" />
          </div>
          <div className="text-xs font-medium text-foreground">
            Ready to Execute
          </div>
          <p className="text-[11px] text-muted-foreground">
            Click Run to execute this workflow with Trigger.dev
          </p>
          {onSimulate && (
            <button
              type="button"
              onClick={onSimulate}
              className="mt-1 inline-flex items-center gap-1.5 text-[11px] font-medium text-primary hover:underline"
            >
              <Sparkles className="size-3" />
              Preview execution flow
            </button>
          )}
        </div>
      </div>
    )
  }

  // Determine stage progress indices
  const getStageIndex = (status: WorkflowRunStatusType | "IDLE"): number => {
    switch (status) {
      case "QUEUED":
        return 0
      case "DEQUEUED":
        return 1
      case "EXECUTING":
        return 2
      case "COMPLETED":
        return 3
      default:
        return -1
    }
  }

  const currentIndex = getStageIndex(runState.status)
  const isFailed =
    runState.status === "FAILED" ||
    runState.status === "CRASHED" ||
    runState.status === "TIMED_OUT"

  // Status visual configurations
  const getStatusBadge = () => {
    switch (runState.status) {
      case "QUEUED":
        return {
          icon: <Clock className="size-3.5 animate-pulse text-amber-500" />,
          label: "QUEUED",
          title: "Waiting in Queue",
          desc: "Task has been enqueued and is awaiting a worker.",
          badgeClass:
            "bg-amber-500/10 text-amber-500 border-amber-500/25 dark:bg-amber-500/15",
          ringColor: "ring-amber-500/30",
        }
      case "DEQUEUED":
        return {
          icon: <Layers className="size-3.5 animate-bounce text-indigo-400" />,
          label: "DEQUEUED",
          title: "Dequeued by Worker",
          desc: "Assigned to worker runner and preparing execution.",
          badgeClass:
            "bg-indigo-500/10 text-indigo-400 border-indigo-500/25 dark:bg-indigo-500/15",
          ringColor: "ring-indigo-500/30",
        }
      case "EXECUTING":
        return {
          icon: <Loader2 className="size-3.5 animate-spin text-sky-400" />,
          label: "EXECUTING",
          title: "Executing Workflow",
          desc: "Actively running workflow steps and automation actions.",
          badgeClass:
            "bg-sky-500/10 text-sky-400 border-sky-500/25 dark:bg-sky-500/15",
          ringColor: "ring-sky-500/30",
        }
      case "COMPLETED":
        return {
          icon: <CheckCircle2 className="size-3.5 text-emerald-400" />,
          label: "COMPLETED",
          title: "Run Completed",
          desc: "Workflow executed successfully.",
          badgeClass:
            "bg-emerald-500/10 text-emerald-400 border-emerald-500/25 dark:bg-emerald-500/15",
          ringColor: "ring-emerald-500/30",
        }
      case "FAILED":
      case "CRASHED":
      case "TIMED_OUT":
        return {
          icon: <AlertCircle className="size-3.5 text-rose-400" />,
          label: runState.status,
          title: "Execution Failed",
          desc: runState.error || "An error occurred during workflow run.",
          badgeClass:
            "bg-rose-500/10 text-rose-400 border-rose-500/25 dark:bg-rose-500/15",
          ringColor: "ring-rose-500/30",
        }
      default:
        return {
          icon: <Clock className="size-3.5 text-muted-foreground" />,
          label: runState.status,
          title: runState.status,
          desc: "Run status updated.",
          badgeClass: "bg-muted text-muted-foreground border-border",
          ringColor: "ring-muted",
        }
    }
  }

  const badgeConfig = getStatusBadge()

  return (
    <div
      className={cn(
        "w-full overflow-hidden rounded-xl border border-border/80 bg-card/60 p-3.5 shadow-sm backdrop-blur-xs transition-all",
        badgeConfig.ringColor,
        className
      )}
    >
      {/* Header: Status badge & elapsed time */}
      <div className="flex items-center justify-between gap-2 border-b border-border/50 pb-2.5">
        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className={cn(
              "flex items-center gap-1.5 px-2 py-0.5 text-[11px] font-semibold tracking-wider",
              badgeConfig.badgeClass
            )}
          >
            {badgeConfig.icon}
            <span>{badgeConfig.label}</span>
          </Badge>
          {runState.isSimulated && (
            <span className="rounded-md bg-muted px-1.5 py-0.2 text-[9px] font-medium text-muted-foreground uppercase">
              Demo
            </span>
          )}
        </div>

        <div className="text-[11px] font-mono text-muted-foreground tabular-nums">
          {elapsedSec > 0 ? `${elapsedSec.toFixed(1)}s` : "0.0s"}
        </div>
      </div>

      {/* Main status info */}
      <div className="py-2.5">
        <div className="text-xs font-semibold text-foreground">
          {badgeConfig.title}
        </div>
        <div className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground line-clamp-2">
          {badgeConfig.desc}
        </div>
      </div>

      {/* Lifecycle Stage Pipeline: Queued -> Dequeued -> Executing -> Completed */}
      <div className="my-2 rounded-lg bg-muted/40 p-2.5">
        <div className="flex items-center justify-between gap-1">
          {STAGES.map((stage, idx) => {
            const isCompletedStage =
              !isFailed &&
              (currentIndex > idx || (runState.isCompleted && idx <= 3))
            const isActiveStage = !isFailed && currentIndex === idx
            const isFailedStage = isFailed && currentIndex === idx

            return (
              <React.Fragment key={stage.key}>
                <div className="flex flex-col items-center text-center">
                  <div
                    className={cn(
                      "flex size-5.5 items-center justify-center rounded-full text-[10px] font-medium transition-all duration-200",
                      isCompletedStage &&
                        "bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/40",
                      isActiveStage &&
                        "bg-primary/20 text-primary ring-2 ring-primary/60 shadow-[0_0_8px_rgba(59,130,246,0.3)] animate-pulse",
                      isFailedStage &&
                        "bg-rose-500/20 text-rose-400 ring-1 ring-rose-500/50",
                      !isCompletedStage &&
                        !isActiveStage &&
                        !isFailedStage &&
                        "bg-muted text-muted-foreground/60 border border-border/40"
                    )}
                  >
                    {isCompletedStage ? (
                      <Check className="size-3 stroke-[2.5]" />
                    ) : isActiveStage ? (
                      <span className="size-1.5 rounded-full bg-current" />
                    ) : isFailedStage ? (
                      <span className="text-[10px] font-bold">×</span>
                    ) : (
                      <span className="text-[9px]">{idx + 1}</span>
                    )}
                  </div>
                  <span
                    className={cn(
                      "mt-1 text-[10px] font-medium transition-colors",
                      isActiveStage && "text-foreground font-semibold",
                      isCompletedStage && "text-emerald-400/90",
                      isFailedStage && "text-rose-400",
                      !isActiveStage &&
                        !isCompletedStage &&
                        !isFailedStage &&
                        "text-muted-foreground/60"
                    )}
                  >
                    {stage.label}
                  </span>
                </div>

                {idx < STAGES.length - 1 && (
                  <div
                    className={cn(
                      "h-0.5 flex-1 transition-all duration-200",
                      currentIndex > idx || (runState.isCompleted && !isFailed)
                        ? "bg-emerald-500/40"
                        : isActiveStage
                          ? "bg-primary/40"
                          : "bg-border/60"
                    )}
                  />
                )}
              </React.Fragment>
            )
          })}
        </div>
      </div>

      {/* Run ID & Meta Row */}
      {runState.runId && (
        <div className="mt-2.5 flex items-center justify-between border-t border-border/50 pt-2 text-[11px]">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <span>Run:</span>
            <button
              type="button"
              onClick={copyRunId}
              className="inline-flex items-center gap-1 font-mono font-medium text-foreground/90 hover:text-primary transition-colors"
              title="Click to copy Run ID"
            >
              <span className="max-w-[110px] truncate">{runState.runId}</span>
              {copied ? (
                <Check className="size-3 text-emerald-500" />
              ) : (
                <Copy className="size-3 text-muted-foreground hover:text-foreground" />
              )}
            </button>
          </div>

          {runState.isCompleted && runState.output !== null && (
            <button
              type="button"
              onClick={() => setShowOutput((prev) => !prev)}
              className="text-[11px] font-medium text-primary hover:underline inline-flex items-center gap-0.5"
            >
              {showOutput ? "Hide output" : "View output"}
            </button>
          )}
        </div>
      )}

      {/* Output preview dropdown */}
      {showOutput && runState.output !== null && (
        <div className="mt-2 rounded-md bg-muted/60 p-2 text-[10px] font-mono text-muted-foreground overflow-x-auto border border-border/40">
          <pre className="whitespace-pre-wrap break-all">
            {typeof runState.output === "string"
              ? runState.output
              : JSON.stringify(runState.output, null, 2)}
          </pre>
        </div>
      )}

      {/* Offline worker hint if queued for a while */}
      {runState.status === "QUEUED" && elapsedSec > 4 && !runState.isSimulated && (
        <div className="mt-2.5 rounded-lg border border-amber-500/20 bg-amber-500/5 p-2 text-[10px] text-amber-500/90 flex flex-col gap-1">
          <div className="flex items-center gap-1 font-medium">
            <Clock className="size-3" />
            <span>Worker not connected?</span>
          </div>
          <p className="text-[10px] text-muted-foreground leading-tight">
            Run <code className="font-mono bg-muted px-1 rounded text-foreground">npx trigger.dev@latest dev</code> in your terminal to process queued runs.
          </p>
          {onSimulate && (
            <button
              type="button"
              onClick={onSimulate}
              className="text-left font-medium text-primary hover:underline mt-0.5"
            >
              Or simulate local flow →
            </button>
          )}
        </div>
      )}

      {/* Footer controls: Reset / Re-test */}
      {(runState.isCompleted || isFailed) && (
        <div className="mt-2.5 flex items-center justify-between border-t border-border/40 pt-2 text-[11px]">
          {onReset && (
            <button
              type="button"
              onClick={onReset}
              className="text-[11px] text-muted-foreground hover:text-foreground transition-colors"
            >
              Clear status
            </button>
          )}
          {onSimulate && (
            <button
              type="button"
              onClick={onSimulate}
              className="inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline ml-auto"
            >
              <Sparkles className="size-3" />
              Re-run simulation
            </button>
          )}
        </div>
      )}
    </div>
  )
}
