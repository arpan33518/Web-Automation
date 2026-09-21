"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { auth } from "@clerk/nextjs/server"
import { runs, tasks } from "@trigger.dev/sdk"

import { createWorkflow } from "@/features/workflows/data"
import { generateSlug } from "@/features/workflows/lib/generate-slug"
import { liveblocks, markRoomEnsured } from "@/lib/liveblocks"
import type { exampleTask } from "@/trigger/example"

export async function createWorkflowAction(name?: string) {
  const { orgId } = await auth()

  if (!orgId) {
    throw new Error("Organization ID is required")
  }

  const workflow = await createWorkflow({
    orgId,
    name: name || generateSlug(),
  })

  try {
    await liveblocks.createRoom(workflow.id, {
      organizationId: orgId,
      defaultAccesses: [],
      groupsAccesses: {
        [orgId]: ["room:write"],
      },
    })
    markRoomEnsured(workflow.id)
  } catch (error) {
    console.error(`Failed to pre-create Liveblocks room for ${workflow.id}:`, error)
  }

  revalidatePath("/", "layout")
  redirect(`/workflows/${workflow.id}`)
}

export async function runWorkflowAction(payload?: { message?: string }) {
  const handle = await tasks.trigger<typeof exampleTask>("example-task", payload ?? {})
  return {
    id: handle.id,
    publicAccessToken: handle.publicAccessToken,
  }
}

export type WorkflowRunStatusType =
  | "QUEUED"
  | "DEQUEUED"
  | "EXECUTING"
  | "COMPLETED"
  | "FAILED"
  | "CANCELED"
  | "CRASHED"
  | "WAITING"
  | "TIMED_OUT"

export interface WorkflowRunStatusResult {
  id: string
  status: WorkflowRunStatusType
  isCompleted: boolean
  isExecuting: boolean
  isQueued: boolean
  createdAt: string | null
  startedAt: string | null
  finishedAt: string | null
  durationMs: number | null
  error: string | null
  output: unknown
}

export async function getWorkflowRunStatusAction(
  runId: string
): Promise<WorkflowRunStatusResult> {
  try {
    const run = await runs.retrieve(runId)
    return {
      id: run.id,
      status: run.status as WorkflowRunStatusType,
      isCompleted: Boolean(run.isCompleted),
      isExecuting: Boolean(run.isExecuting),
      isQueued: Boolean(run.isQueued),
      createdAt: run.createdAt ? new Date(run.createdAt).toISOString() : null,
      startedAt: run.startedAt ? new Date(run.startedAt).toISOString() : null,
      finishedAt: run.finishedAt ? new Date(run.finishedAt).toISOString() : null,
      durationMs: typeof run.durationMs === "number" ? run.durationMs : null,
      error: run.error?.message ?? null,
      output: run.output ?? null,
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to retrieve run status"
    console.error("Failed to retrieve run status:", error)
    return {
      id: runId,
      status: "FAILED",
      isCompleted: true,
      isExecuting: false,
      isQueued: false,
      createdAt: null,
      startedAt: null,
      finishedAt: null,
      durationMs: null,
      error: message,
      output: null,
    }
  }
}


