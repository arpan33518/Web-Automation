"use client"

import React, { createContext, useContext, useMemo } from "react"
import { useRealtimeRunsWithTag } from "@trigger.dev/react-hooks"

import type { RunStep, runWorkflowTask } from "@/features/workflows/tasks/run-workflow"

export type WorkflowRun = ReturnType<
  typeof useRealtimeRunsWithTag<typeof runWorkflowTask>
>["runs"][number]

export interface LatestRunStepsResult {
  steps: RunStep[]
  isLive: boolean
  run: WorkflowRun | null
}

export interface WorkflowRunsContextValue {
  runs: WorkflowRun[]
  latestRun: WorkflowRun | null
  steps: RunStep[]
  isLive: boolean
  error?: Error | null
}

const WorkflowRunsContext = createContext<WorkflowRunsContextValue | null>(null)

export interface WorkflowRunsProviderProps {
  workflowId: string
  /**
   * Public access token minted with read scopes for this workflow run or tag
   */
  publicAccessToken?: string | null
  /**
   * Alias for publicAccessToken
   */
  accessToken?: string | null
  children: React.ReactNode
}

/**
 * Client provider that subscribes to a workflow's runs in realtime by tag (`workflow:<id>`)
 * using a public access token passed in as a prop.
 *
 * Provides a single shared subscription for any component on the canvas.
 */
export function WorkflowRunsProvider({
  workflowId,
  publicAccessToken,
  accessToken,
  children,
}: WorkflowRunsProviderProps) {
  const token = publicAccessToken || accessToken || undefined

  const { runs, error } = useRealtimeRunsWithTag<typeof runWorkflowTask>(
    `workflow:${workflowId}`,
    {
      accessToken: token,
      enabled: Boolean(workflowId && token),
    }
  )

  const latestRun = useMemo(() => {
    if (!runs || runs.length === 0) return null
    return (
      [...runs].sort((a, b) => {
        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0
        if (timeA !== timeB) return timeB - timeA
        return b.id.localeCompare(a.id)
      })[0] ?? null
    )
  }, [runs])

  // "Live" means the run is queued or executing
  const isLive = useMemo(() => {
    if (!latestRun) return false
    const status = latestRun.status?.toUpperCase()
    return (
      status === "QUEUED" ||
      status === "EXECUTING" ||
      status === "WAITING_FOR_DEPLOY" ||
      status === "REATTEMPTING" ||
      Boolean((latestRun as any).isExecuting) ||
      Boolean((latestRun as any).isQueued)
    )
  }, [latestRun])

  // Prefer the run's final output steps and fall back to live metadata steps
  const steps: RunStep[] = useMemo(() => {
    if (!latestRun) return []

    // 1. Prefer final output steps once run completes
    const output = latestRun.output as { steps?: RunStep[] } | undefined
    if (output && Array.isArray(output.steps)) {
      return output.steps
    }

    // 2. Fall back to live metadata steps while run is running
    const metadata = latestRun.metadata as { steps?: RunStep[] } | undefined
    if (metadata && Array.isArray(metadata.steps)) {
      return metadata.steps
    }

    return []
  }, [latestRun])

  const contextValue = useMemo<WorkflowRunsContextValue>(
    () => ({
      runs: runs ?? [],
      latestRun,
      steps,
      isLive,
      error: error ?? null,
    }),
    [runs, latestRun, steps, isLive, error]
  )

  return (
    <WorkflowRunsContext.Provider value={contextValue}>
      {children}
    </WorkflowRunsContext.Provider>
  )
}

/**
 * Hook that returns the most recent run's steps plus whether it's still live.
 * Prefers the run's final output steps and falls back to live metadata steps.
 * "Live" means the run is queued or executing.
 */
export function useLatestRunSteps(): LatestRunStepsResult {
  const context = useContext(WorkflowRunsContext)
  if (!context) {
    return {
      steps: [],
      isLive: false,
      run: null,
    }
  }

  return {
    steps: context.steps,
    isLive: context.isLive,
    run: context.latestRun,
  }
}

/**
 * Hook that returns the complete workflow runs context (all runs, latest run, steps, isLive, error).
 */
export function useWorkflowRuns(): WorkflowRunsContextValue {
  const context = useContext(WorkflowRunsContext)
  if (!context) {
    return {
      runs: [],
      latestRun: null,
      steps: [],
      isLive: false,
      error: null,
    }
  }
  return context
}

