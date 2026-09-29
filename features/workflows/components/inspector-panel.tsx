"use client"

import * as React from "react"
import prettyMs from "pretty-ms"
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  FileText,
  Film,
  Loader2,
  X,
} from "lucide-react"
import { toast } from "sonner"

import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { NodeIcon } from "@/features/workflows/components/node-icon"
import type { NodeType } from "@/features/workflows/nodes/node-registry"
import {
  getRunSessionId,
  type WorkflowRun,
} from "@/features/workflows/components/workflow-runs-provider"
import type { RunStep } from "@/features/workflows/tasks/run-workflow"
import { SessionReplay } from "@/features/workflows/components/session-replay"

export interface InspectorPanelProps {
  step?: RunStep | null
  run?: WorkflowRun | null
  sessionId?: string | null
  isReplay?: boolean
  className?: string
  onClose?: () => void
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

function formatDuration(ms?: number | null): string {
  if (ms === undefined || ms === null || isNaN(ms)) return ""
  try {
    return prettyMs(Math.max(0, Math.round(ms)), { secondsDecimalDigits: 1 })
  } catch {
    return `${Math.round(ms)}ms`
  }
}

function formatJson(val: unknown): string {
  if (val === undefined || val === null) return ""
  if (typeof val === "string") {
    try {
      const parsed = JSON.parse(val)
      return JSON.stringify(parsed, null, 2)
    } catch {
      return val
    }
  }
  return JSON.stringify(val, null, 2)
}

export function InspectorPanel({
  step,
  run,
  sessionId,
  isReplay = false,
  className,
  onClose,
}: InspectorPanelProps) {
  const [copiedKey, setCopiedKey] = React.useState<string | null>(null)

  // Replay Mode: render the SessionReplay for the run's session ID
  if (isReplay) {
    const effectiveSessionId =
      sessionId ||
      getRunSessionId(run) ||
      (run?.metadata as { browserbaseSessionId?: string } | undefined)
        ?.browserbaseSessionId

    const duration = run ? getRunDuration(run) : null

    return (
      <div
        className={cn(
          "flex size-full flex-col overflow-hidden bg-background text-foreground",
          className
        )}
      >
        {/* Header Bar */}
        <div className="flex h-10 shrink-0 items-center justify-between border-b border-border/60 bg-muted/20 px-3">
          <div className="flex min-w-0 items-center gap-2">
            <div className="flex size-5 shrink-0 items-center justify-center rounded-md border border-sky-500/25 bg-sky-500/15 text-sky-400">
              <Film className="size-3" />
            </div>
            <span className="truncate text-xs font-semibold text-foreground">
              Session Replay
            </span>
            <Badge
              variant="outline"
              className="shrink-0 border-sky-500/25 bg-sky-500/10 px-1.5 py-0 text-[10px] font-medium text-sky-400"
            >
              RECORDING
            </Badge>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            {duration !== null && (
              <span className="font-mono text-[11px] text-muted-foreground tabular-nums">
                took {formatDuration(duration)}
              </span>
            )}

            {onClose && (
              <Button
                variant="ghost"
                size="xs"
                className="size-6 p-0 text-muted-foreground hover:text-foreground"
                onClick={onClose}
                title="Close output view"
              >
                <X className="size-3.5" />
              </Button>
            )}
          </div>
        </div>

        {/* Content Area: Player & Run Details */}
        <div className="flex-1 space-y-3 overflow-y-auto p-3">
          {effectiveSessionId ? (
            <SessionReplay sessionId={effectiveSessionId} autoPlay />
          ) : (
            <div className="rounded-lg border border-dashed border-border/70 p-6 text-center text-xs text-muted-foreground">
              No session recording available for this run.
            </div>
          )}

          {run && (
            <div className="space-y-1 rounded-md border border-border/50 bg-muted/20 p-2.5 text-[11px] text-muted-foreground">
              <div className="flex justify-between">
                <span>Run ID:</span>
                <span className="font-mono text-foreground">{run.id}</span>
              </div>
              <div className="flex justify-between">
                <span>Status:</span>
                <span className="font-mono text-foreground">{run.status}</span>
              </div>
              {effectiveSessionId && (
                <div className="flex justify-between">
                  <span>Session ID:</span>
                  <span className="font-mono text-foreground">
                    {effectiveSessionId}
                  </span>
                </div>
              )}
              {run.startedAt && (
                <div className="flex justify-between">
                  <span>Started:</span>
                  <span className="font-mono text-foreground">
                    {new Date(run.startedAt).toLocaleTimeString()}
                  </span>
                </div>
              )}
              {run.finishedAt && (
                <div className="flex justify-between">
                  <span>Finished:</span>
                  <span className="font-mono text-foreground">
                    {new Date(run.finishedAt).toLocaleTimeString()}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    )
  }

  if (!step) {
    return null
  }

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    setCopiedKey(label)
    toast.success(`${label} copied`)
    setTimeout(() => setCopiedKey(null), 2000)
  }

  const isFailed = step.status === "failed" || Boolean(step.error)
  const isRunning = step.status === "running"
  const isPending = step.status === "pending"
  const isDone = step.status === "done"

  const hasOutput =
    step.output !== undefined &&
    step.output !== null &&
    (typeof step.output !== "string" || step.output.trim().length > 0)

  const formattedOutput = hasOutput ? formatJson(step.output) : ""

  return (
    <div
      className={cn(
        "flex size-full flex-col overflow-hidden bg-background text-foreground",
        className
      )}
    >
      {/* Header Bar */}
      <div className="flex h-10 shrink-0 items-center justify-between border-b border-border/60 bg-muted/20 px-3">
        <div className="flex min-w-0 items-center gap-2">
          <NodeIcon
            type={step.nodeType as NodeType}
            className="size-5 shrink-0"
            iconClassName="size-3"
          />
          <span className="truncate text-xs font-semibold text-foreground">
            {step.title || step.nodeType}
          </span>

          <Badge
            variant="outline"
            className={cn(
              "shrink-0 gap-1 px-1.5 py-0 text-[10px] font-medium",
              isDone &&
                "border-emerald-500/25 bg-emerald-500/10 text-emerald-400",
              isFailed && "border-rose-500/25 bg-rose-500/10 text-rose-400",
              isRunning && "border-sky-500/25 bg-sky-500/10 text-sky-400",
              isPending && "border-border bg-muted text-muted-foreground"
            )}
          >
            {isRunning && <Loader2 className="size-2.5 animate-spin" />}
            {isFailed && <AlertCircle className="size-2.5" />}
            {isDone && <CheckCircle2 className="size-2.5" />}
            {step.status?.toUpperCase() || "PENDING"}
          </Badge>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {step.durationMs !== undefined && (
            <span className="font-mono text-[11px] text-muted-foreground tabular-nums">
              took {formatDuration(step.durationMs)}
            </span>
          )}

          {onClose && (
            <Button
              variant="ghost"
              size="xs"
              className="size-6 p-0 text-muted-foreground hover:text-foreground"
              onClick={onClose}
              title="Close output view"
            >
              <X className="size-3.5" />
            </Button>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 space-y-3 overflow-y-auto p-3">
        {/* 1. Error view if step failed */}
        {isFailed && (
          <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">
            <div className="mb-1.5 flex items-center justify-between">
              <div className="flex items-center gap-1.5 font-semibold text-rose-400">
                <AlertCircle className="size-4" />
                <span>Step Error</span>
              </div>
              {step.error && (
                <button
                  type="button"
                  onClick={() => copyToClipboard(step.error!, "Error message")}
                  className="inline-flex items-center gap-1 text-[10px] text-rose-300 hover:text-white"
                >
                  {copiedKey === "Error message" ? (
                    <Check className="size-3 text-emerald-400" />
                  ) : (
                    <Copy className="size-3" />
                  )}
                  <span>Copy</span>
                </button>
              )}
            </div>
            <pre className="rounded border border-rose-500/20 bg-rose-950/40 p-2.5 font-mono text-[11px] break-all whitespace-pre-wrap text-rose-200">
              {step.error || "Step failed without a specific error message."}
            </pre>
          </div>
        )}

        {/* 2. Output view as formatted JSON */}
        {hasOutput && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs font-semibold text-foreground">
              <span>Output</span>
              <Button
                variant="ghost"
                size="xs"
                className="h-6 gap-1 px-1.5 text-[10px] text-muted-foreground hover:text-foreground"
                onClick={() => copyToClipboard(formattedOutput, "Output")}
              >
                {copiedKey === "Output" ? (
                  <Check className="size-3 text-emerald-400" />
                ) : (
                  <Copy className="size-3" />
                )}
                <span>Copy JSON</span>
              </Button>
            </div>

            <div className="overflow-x-auto rounded-md border border-border/60 bg-zinc-950/90 p-2.5 font-mono text-[11px] text-zinc-200 dark:bg-zinc-950/90">
              <pre className="leading-relaxed break-all whitespace-pre-wrap">
                {formattedOutput}
              </pre>
            </div>
          </div>
        )}

        {/* 3. Short note when there's nothing */}
        {!isFailed && !hasOutput && (
          <div className="my-4 flex flex-col items-center justify-center rounded-lg border border-dashed border-border/70 bg-muted/15 p-6 text-center text-muted-foreground">
            <FileText className="mb-1.5 size-6 text-muted-foreground/40" />
            <span className="text-xs font-semibold text-foreground">
              {isRunning
                ? "Step is currently running"
                : isPending
                  ? "Step is pending execution"
                  : "No output"}
            </span>
            <p className="mt-1 max-w-[220px] text-[11px] text-muted-foreground">
              {isRunning
                ? "Results will appear here as soon as this step completes."
                : isPending
                  ? "This step has not been reached yet."
                  : "This step ran successfully but did not produce any output."}
            </p>
          </div>
        )}

        {/* Step Metadata / Execution Info */}
        <div className="space-y-1 rounded-md border border-border/50 bg-muted/20 p-2.5 text-[11px] text-muted-foreground">
          <div className="flex justify-between">
            <span>Node ID:</span>
            <span className="font-mono text-foreground">{step.id}</span>
          </div>
          <div className="flex justify-between">
            <span>Type:</span>
            <span className="font-mono text-foreground">{step.nodeType}</span>
          </div>
          {step.startedAt && (
            <div className="flex justify-between">
              <span>Started:</span>
              <span className="font-mono text-foreground">
                {new Date(step.startedAt).toLocaleTimeString()}
              </span>
            </div>
          )}
          {step.completedAt && (
            <div className="flex justify-between">
              <span>Completed:</span>
              <span className="font-mono text-foreground">
                {new Date(step.completedAt).toLocaleTimeString()}
              </span>
            </div>
          )}
          {step.durationMs !== undefined && (
            <div className="flex justify-between">
              <span>Duration:</span>
              <span className="font-mono font-medium text-foreground">
                {formatDuration(step.durationMs)}
              </span>
            </div>
          )}
          {run && (
            <div className="mt-1 flex justify-between border-t border-border/30 pt-1">
              <span>Run:</span>
              <span className="font-mono text-foreground">
                {run.id.slice(0, 14)}...
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
