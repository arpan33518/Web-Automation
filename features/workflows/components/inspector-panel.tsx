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
  Loader2,
  X,
} from "lucide-react"
import { toast } from "sonner"

import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { NodeIcon } from "@/features/workflows/components/node-icon"
import type { NodeType } from "@/features/workflows/nodes/node-registry"
import type { WorkflowRun } from "@/features/workflows/components/workflow-runs-provider"
import type { RunStep } from "@/features/workflows/tasks/run-workflow"

export interface InspectorPanelProps {
  step: RunStep
  run?: WorkflowRun | null
  className?: string
  onClose?: () => void
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
  className,
  onClose,
}: InspectorPanelProps) {
  const [copiedKey, setCopiedKey] = React.useState<string | null>(null)

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
        <div className="flex items-center gap-2 min-w-0">
          <NodeIcon
            type={step.nodeType as NodeType}
            className="size-5 shrink-0"
            iconClassName="size-3"
          />
          <span className="text-xs font-semibold text-foreground truncate">
            {step.title || step.nodeType}
          </span>

          <Badge
            variant="outline"
            className={cn(
              "text-[10px] px-1.5 py-0 font-medium shrink-0 gap-1",
              isDone &&
                "bg-emerald-500/10 text-emerald-400 border-emerald-500/25",
              isFailed &&
                "bg-rose-500/10 text-rose-400 border-rose-500/25",
              isRunning &&
                "bg-sky-500/10 text-sky-400 border-sky-500/25",
              isPending &&
                "bg-muted text-muted-foreground border-border"
            )}
          >
            {isRunning && <Loader2 className="size-2.5 animate-spin" />}
            {isFailed && <AlertCircle className="size-2.5" />}
            {isDone && <CheckCircle2 className="size-2.5" />}
            {step.status?.toUpperCase() || "PENDING"}
          </Badge>
        </div>

        <div className="flex items-center gap-2 shrink-0">
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
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {/* 1. Error view if step failed */}
        {isFailed && (
          <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">
            <div className="flex items-center justify-between mb-1.5">
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
            <pre className="font-mono text-[11px] whitespace-pre-wrap break-all bg-rose-950/40 p-2.5 rounded border border-rose-500/20 text-rose-200">
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
                className="h-6 text-[10px] gap-1 px-1.5 text-muted-foreground hover:text-foreground"
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

            <div className="rounded-md border border-border/60 bg-zinc-950/90 dark:bg-zinc-950/90 p-2.5 font-mono text-[11px] text-zinc-200 overflow-x-auto">
              <pre className="whitespace-pre-wrap break-all leading-relaxed">
                {formattedOutput}
              </pre>
            </div>
          </div>
        )}

        {/* 3. Short note when there's nothing */}
        {!isFailed && !hasOutput && (
          <div className="flex flex-col items-center justify-center p-6 text-center text-muted-foreground rounded-lg border border-dashed border-border/70 bg-muted/15 my-4">
            <FileText className="size-6 text-muted-foreground/40 mb-1.5" />
            <span className="text-xs font-semibold text-foreground">
              {isRunning
                ? "Step is currently running"
                : isPending
                ? "Step is pending execution"
                : "No output"}
            </span>
            <p className="mt-1 text-[11px] text-muted-foreground max-w-[220px]">
              {isRunning
                ? "Results will appear here as soon as this step completes."
                : isPending
                ? "This step has not been reached yet."
                : "This step ran successfully but did not produce any output."}
            </p>
          </div>
        )}

        {/* Step Metadata / Execution Info */}
        <div className="rounded-md border border-border/50 bg-muted/20 p-2.5 text-[11px] text-muted-foreground space-y-1">
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
              <span className="font-mono text-foreground font-medium">
                {formatDuration(step.durationMs)}
              </span>
            </div>
          )}
          {run && (
            <div className="flex justify-between border-t border-border/30 pt-1 mt-1">
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
