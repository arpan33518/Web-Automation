"use client"

import * as React from "react"
import { Loader2, Play, Sparkles } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { ResizablePanel } from "@/components/ui/resizable"
import {
  getWorkflowRunStatusAction,
  runWorkflowAction,
} from "@/features/workflows/actions"
import {
  WorkflowRunState,
  WorkflowRunStatus,
} from "@/features/workflows/components/workflow-run-status"

interface RightSidebarProps extends React.ComponentProps<typeof ResizablePanel> {
  workflowId?: string
  runState?: WorkflowRunState | null
  onRunStateChange?: (state: WorkflowRunState | null) => void
}

export function RightSidebar({
  workflowId,
  defaultSize = "18rem",
  minSize = "16rem",
  maxSize = "36rem",
  runState: controlledRunState,
  onRunStateChange,
  ...props
}: RightSidebarProps) {
  const [internalRunState, setInternalRunState] =
    React.useState<WorkflowRunState | null>(null)
  const [isPending, startTransition] = React.useTransition()
  const pollingRef = React.useRef<NodeJS.Timeout | null>(null)
  const simulationTimerRef = React.useRef<NodeJS.Timeout[]>([])

  const currentRunState = controlledRunState ?? internalRunState

  const updateRunState = React.useCallback(
    (nextState: WorkflowRunState | null) => {
      if (onRunStateChange) {
        onRunStateChange(nextState)
      } else {
        setInternalRunState(nextState)
      }
    },
    [onRunStateChange]
  )

  // Clear timers on unmount
  React.useEffect(() => {
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current)
      simulationTimerRef.current.forEach(clearTimeout)
    }
  }, [])

  // Start polling Trigger.dev for status updates
  const startPolling = React.useCallback(
    (runId: string) => {
      if (pollingRef.current) clearInterval(pollingRef.current)

      pollingRef.current = setInterval(async () => {
        try {
          const result = await getWorkflowRunStatusAction(runId)
          updateRunState({
            runId: result.id,
            status: result.status,
            isCompleted: result.isCompleted,
            isExecuting: result.isExecuting,
            isQueued: result.isQueued,
            createdAt: result.createdAt,
            startedAt: result.startedAt,
            finishedAt: result.finishedAt,
            durationMs: result.durationMs,
            error: result.error,
            output: result.output,
            isSimulated: false,
          })

          if (result.isCompleted) {
            if (pollingRef.current) clearInterval(pollingRef.current)
            if (result.status === "COMPLETED") {
              toast.success("Workflow completed successfully!")
            } else {
              toast.error(`Workflow ended with status: ${result.status}`)
            }
          }
        } catch (error) {
          console.error("Polling error:", error)
        }
      }, 700)
    },
    [updateRunState]
  )

  const handleRun = () => {
    // Clear any previous running simulation
    simulationTimerRef.current.forEach(clearTimeout)
    simulationTimerRef.current = []

    startTransition(async () => {
      try {
        const initialTimestamp = new Date().toISOString()
        updateRunState({
          runId: null,
          status: "QUEUED",
          isCompleted: false,
          isExecuting: false,
          isQueued: true,
          createdAt: initialTimestamp,
          startedAt: initialTimestamp,
          finishedAt: null,
          durationMs: null,
          error: null,
          output: null,
          isSimulated: false,
        })

        const handle = await runWorkflowAction(
          workflowId ? { message: `Workflow ${workflowId} run` } : undefined
        )

        updateRunState({
          runId: handle.id,
          status: "QUEUED",
          isCompleted: false,
          isExecuting: false,
          isQueued: true,
          createdAt: initialTimestamp,
          startedAt: initialTimestamp,
          finishedAt: null,
          durationMs: null,
          error: null,
          output: null,
          isSimulated: false,
        })

        toast.success(`Workflow triggered (Run ID: ${handle.id})`)
        startPolling(handle.id)
      } catch (error) {
        console.error("Failed to run workflow:", error)
        toast.error("Failed to run workflow")
        updateRunState({
          runId: null,
          status: "FAILED",
          isCompleted: true,
          isExecuting: false,
          isQueued: false,
          createdAt: null,
          startedAt: null,
          finishedAt: null,
          durationMs: null,
          error: error instanceof Error ? error.message : "Failed to run workflow",
          output: null,
          isSimulated: false,
        })
      }
    })
  }

  // Interactive flow preview / simulation (Queued -> Dequeued -> Executing -> Completed)
  const handleSimulate = () => {
    if (pollingRef.current) clearInterval(pollingRef.current)
    simulationTimerRef.current.forEach(clearTimeout)
    simulationTimerRef.current = []

    const mockRunId = `run_sim_${Math.random().toString(36).substring(2, 9)}`
    const startTime = new Date().toISOString()

    // 1. Queued
    updateRunState({
      runId: mockRunId,
      status: "QUEUED",
      isCompleted: false,
      isExecuting: false,
      isQueued: true,
      createdAt: startTime,
      startedAt: startTime,
      finishedAt: null,
      durationMs: null,
      error: null,
      output: null,
      isSimulated: true,
    })

    // 2. Dequeued after 1.2s
    const t1 = setTimeout(() => {
      updateRunState({
        runId: mockRunId,
        status: "DEQUEUED",
        isCompleted: false,
        isExecuting: false,
        isQueued: false,
        createdAt: startTime,
        startedAt: startTime,
        finishedAt: null,
        durationMs: null,
        error: null,
        output: null,
        isSimulated: true,
      })
    }, 1200)

    // 3. Executing after 2.4s
    const t2 = setTimeout(() => {
      updateRunState({
        runId: mockRunId,
        status: "EXECUTING",
        isCompleted: false,
        isExecuting: true,
        isQueued: false,
        createdAt: startTime,
        startedAt: startTime,
        finishedAt: null,
        durationMs: null,
        error: null,
        output: null,
        isSimulated: true,
      })
    }, 2400)

    // 4. Completed after 4.2s
    const t3 = setTimeout(() => {
      const endTime = new Date().toISOString()
      updateRunState({
        runId: mockRunId,
        status: "COMPLETED",
        isCompleted: true,
        isExecuting: false,
        isQueued: false,
        createdAt: startTime,
        startedAt: startTime,
        finishedAt: endTime,
        durationMs: 1800,
        error: null,
        output: {
          message: "Workflow executed successfully!",
          stepsCompleted: 3,
          duration: "1.8s",
        },
        isSimulated: true,
      })
      toast.success("Simulation finished successfully!")
    }, 4200)

    simulationTimerRef.current = [t1, t2, t3]
  }

  const handleReset = () => {
    if (pollingRef.current) clearInterval(pollingRef.current)
    simulationTimerRef.current.forEach(clearTimeout)
    simulationTimerRef.current = []
    updateRunState(null)
  }

  const isRunning =
    isPending ||
    (currentRunState !== null &&
      !currentRunState.isCompleted &&
      currentRunState.status !== "IDLE")

  return (
    <ResizablePanel
      defaultSize={defaultSize}
      minSize={minSize}
      maxSize={maxSize}
      className="flex flex-col bg-background/50 backdrop-blur-sm"
      {...props}
    >
      <div className="flex h-full flex-col overflow-y-auto p-4 gap-4 no-scrollbar">
        {/* Panel Header */}
        <div className="flex items-center justify-between border-b border-border/50 pb-3">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Inspector</h3>
            <p className="text-[11px] text-muted-foreground">Workflow controls & run monitor</p>
          </div>
          {workflowId && (
            <span className="font-mono text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
              {workflowId.slice(0, 8)}
            </span>
          )}
        </div>

        {/* Run Controls Area */}
        <div className="flex flex-col items-center gap-2 pt-1">
          <Button
            onClick={handleRun}
            disabled={isRunning}
            size="lg"
            className="w-full flex items-center justify-center gap-2 font-semibold shadow-md transition-all active:scale-[0.98]"
          >
            {isRunning ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Play className="size-4 fill-current" />
            )}
            {isRunning ? "EXECUTING WORKFLOW..." : "RUN WORKFLOW"}
          </Button>

          {/* Quick Simulation trigger */}
          {!isRunning && (!currentRunState || currentRunState.isCompleted) && (
            <button
              type="button"
              onClick={handleSimulate}
              className="inline-flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground hover:text-primary transition-colors py-0.5"
            >
              <Sparkles className="size-3" />
              Simulate run pipeline
            </button>
          )}
        </div>

        {/* Status Feature below the Run button */}
        <div className="flex flex-col gap-1.5">
          <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground px-0.5">
            Run Status
          </div>
          <WorkflowRunStatus
            runState={currentRunState}
            onSimulate={handleSimulate}
            onReset={handleReset}
          />
        </div>
      </div>
    </ResizablePanel>
  )
}
