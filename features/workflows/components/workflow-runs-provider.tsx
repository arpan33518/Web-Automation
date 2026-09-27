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

export interface RunWithSteps {
  run: WorkflowRun
  steps: RunStep[]
}

export interface WorkflowRunsContextValue {
  /**
   * All workflow runs for this workflow, sorted newest first
   */
  runs: WorkflowRun[]
  /**
   * The latest/most recent run
   */
  latestRun: WorkflowRun | null
  /**
   * The steps of the latest run
   */
  steps: RunStep[]
  /**
   * Whether the latest run is currently queued or executing
   */
  isLive: boolean
  error?: Error | null
  /**
   * Every run paired with its parsed execution steps
   */
  runsWithSteps: RunWithSteps[]
  /**
   * Function to extract steps from any run (output or live metadata)
   */
  getRunSteps: (run: WorkflowRun | null | undefined) => RunStep[]
  /**
   * Function to find a run by ID and get its steps
   */
  getStepsForRun: (runId: string) => RunStep[]
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
 * Extracts steps from a run (preferring final output steps, falling back to live metadata steps).
 */
export function getRunSteps(run: WorkflowRun | null | undefined): RunStep[] {
  if (!run) return []

  const parseJson = (val: unknown) => {
    if (typeof val === "string") {
      try {
        return JSON.parse(val)
      } catch {
        return null
      }
    }
    return val
  }

  // 1. Prefer final output steps once run completes
  const output = parseJson(run.output) as { steps?: RunStep[] } | undefined
  if (output && Array.isArray(output.steps) && output.steps.length > 0) {
    return output.steps
  }

  // 2. Fall back to live metadata steps while run is running or if task failed
  const metadata = parseJson(run.metadata) as { steps?: RunStep[] } | undefined
  if (metadata && Array.isArray(metadata.steps) && metadata.steps.length > 0) {
    return metadata.steps
  }

  return []
}

/**
 * Client provider that subscribes to a workflow's runs in realtime by tag (`workflow:<id>`)
 * using a public access token passed in as a prop.
 *
 * Provides a single shared subscription for any component on the canvas and panels.
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

  const sortedRuns = useMemo(() => {
    if (!runs || runs.length === 0) return []
    return [...runs].sort((a, b) => {
      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0
      if (timeA !== timeB) return timeB - timeA
      return b.id.localeCompare(a.id)
    })
  }, [runs])

  const latestRun = useMemo(() => {
    return sortedRuns[0] ?? null
  }, [sortedRuns])

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

  const steps: RunStep[] = useMemo(() => getRunSteps(latestRun), [latestRun])

  const runsWithSteps = useMemo<RunWithSteps[]>(() => {
    return sortedRuns.map((run) => ({
      run,
      steps: getRunSteps(run),
    }))
  }, [sortedRuns])

  const getStepsForRun = React.useCallback(
    (runId: string): RunStep[] => {
      const run = sortedRuns.find((r) => r.id === runId)
      return getRunSteps(run)
    },
    [sortedRuns]
  )

  const contextValue = useMemo<WorkflowRunsContextValue>(
    () => ({
      runs: sortedRuns,
      latestRun,
      steps,
      isLive,
      error: error ?? null,
      runsWithSteps,
      getRunSteps,
      getStepsForRun,
    }),
    [sortedRuns, latestRun, steps, isLive, error, runsWithSteps, getStepsForRun]
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
 * Hook that returns the complete workflow runs context (all runs, latest run, steps, isLive, error, runsWithSteps).
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
      runsWithSteps: [],
      getRunSteps,
      getStepsForRun: () => [],
    }
  }
  return context
}

/**
 * Hook that returns every run paired with its parsed steps for consoles and panels.
 */
export function useAllWorkflowRunsWithSteps() {
  const context = useContext(WorkflowRunsContext)
  if (!context) {
    return {
      runs: [] as WorkflowRun[],
      runsWithSteps: [] as RunWithSteps[],
      latestRun: null,
      steps: [] as RunStep[],
      isLive: false,
      error: null,
      getRunSteps,
      getStepsForRun: () => [] as RunStep[],
    }
  }
  return context
}

