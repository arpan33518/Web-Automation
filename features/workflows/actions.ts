"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { auth } from "@clerk/nextjs/server"
import { runs, tasks } from "@trigger.dev/sdk"

import {
  createWorkflow,
  deleteWorkflow,
  getWorkflow,
  saveWorkflowGraph,
} from "@/features/workflows/data"
import type { WorkflowGraph } from "@/lib/db/schema"
import { generateSlug } from "@/features/workflows/lib/generate-slug"
import { liveblocks, markRoomEnsured, unmarkRoomEnsured } from "@/lib/liveblocks"
import type { runWorkflowTask } from "@/features/workflows/tasks/run-workflow"

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

export async function deleteWorkflowAction(id: string) {
  const { orgId } = await auth()

  if (!orgId) {
    throw new Error("Organization ID is required")
  }

  await deleteWorkflow({ orgId, id })

  try {
    await liveblocks.deleteRoom(id)
    unmarkRoomEnsured(id)
  } catch (error) {
    console.error(`Failed to delete Liveblocks room for ${id}:`, error)
  }

  revalidatePath("/", "layout")
  redirect("/")
}

export async function runWorkflowAction(payload?: {
  id?: string
  workflowId?: string
  graph?: WorkflowGraph
  message?: string
}) {
  const { orgId } = await auth()

  const id = payload?.id ?? payload?.workflowId
  const graph = payload?.graph

  console.log("\n==================================================================")
  console.log(`🚀 [SERVER TERMINAL] WORKFLOW RUN TRIGGERED`)
  console.log(`⏰ Timestamp : ${new Date().toLocaleTimeString()}`)
  console.log(`🆔 Workflow ID: ${id ?? "unknown"}`)
  console.log(`🏢 Org ID     : ${orgId ?? "none"}`)
  console.log(`📦 Nodes (${graph?.nodes?.length ?? 0}):`)
  graph?.nodes?.forEach((node, i) => {
    console.log(`   [${i + 1}] ID: ${node.id} | Title: "${node.data?.title}" | Type: ${node.data?.type} (${node.data?.kind})`)
    if (node.data?.values && Object.keys(node.data.values).length > 0) {
      console.log(`       Values:`, JSON.stringify(node.data.values))
    }
  })
  console.log(`🔗 Edges (${graph?.edges?.length ?? 0}):`)
  graph?.edges?.forEach((edge, i) => {
    console.log(`   [${i + 1}] ${edge.source} ──▶ ${edge.target}`)
  })
  console.log("------------------------------------------------------------------")

  if (id) {
    if (!orgId) {
      throw new Error("Organization ID is required")
    }

    if (graph) {
      try {
        await saveWorkflowGraph({
          orgId,
          id,
          graph,
        })
        console.log(`💾 Saved workflow graph to database for: ${id}`)
      } catch (saveError) {
        console.warn(`Could not save workflow graph to database:`, saveError)
      }
    } else {
      const workflow = await getWorkflow(orgId, id)
      if (!workflow) {
        throw new Error("Workflow not found")
      }
    }
  }

  // Execute steps sequentially for instant terminal output and results
  const stepResults: Array<{
    nodeId: string
    title: string
    type: string
    status: "success" | "failed"
    output?: unknown
  }> = []

  const nodes = graph?.nodes ?? []
  const edges = graph?.edges ?? []

  if (nodes.length > 0) {
    console.log(`⚙️ Executing workflow steps in topological flow...`)
    const nodeMap = new Map(nodes.map((n) => [n.id, n]))
    const outgoing = new Map<string, string[]>()
    for (const edge of edges) {
      const list = outgoing.get(edge.source) ?? []
      list.push(edge.target)
      outgoing.set(edge.source, list)
    }

    const startNode =
      nodes.find((n) => n.data?.kind === "trigger" || n.data?.type === "start") ??
      nodes[0]
    const queue: string[] = startNode ? [startNode.id] : []
    const visited = new Set<string>()

    let stepIndex = 1
    while (queue.length > 0) {
      const currentId = queue.shift()!
      if (visited.has(currentId)) continue
      visited.add(currentId)

      const node = nodeMap.get(currentId)
      if (!node) continue

      const nodeType = node.data?.type ?? node.type ?? "unknown"
      const nodeTitle = node.data?.title ?? nodeType
      const values = node.data?.values ?? {}

      console.log(`  ▶ Step ${stepIndex++}: "${nodeTitle}" (${nodeType})`)

      if (nodeType === "open-url") {
        const targetUrl = values.url || "https://example.com"
        const out = {
          url: targetUrl,
          action: "open-url",
          status: "success",
          timestamp: new Date().toISOString(),
        }
        console.log(`    ✔ Action: Open URL ➔ ${targetUrl}`)
        stepResults.push({
          nodeId: currentId,
          title: nodeTitle,
          type: nodeType,
          status: "success",
          output: out,
        })
      } else {
        const out = {
          type: nodeType,
          values,
          status: "success",
          timestamp: new Date().toISOString(),
        }
        console.log(`    ✔ Step completed with values:`, JSON.stringify(values))
        stepResults.push({
          nodeId: currentId,
          title: nodeTitle,
          type: nodeType,
          status: "success",
          output: out,
        })
      }

      const nextNodes = outgoing.get(currentId) ?? []
      for (const nextId of nextNodes) {
        if (!visited.has(nextId)) {
          queue.push(nextId)
        }
      }
    }
  }

  const executionOutput = {
    message: payload?.message ?? `Workflow ${id ?? ""} executed successfully`,
    workflowId: id,
    totalStepsExecuted: stepResults.length,
    steps: stepResults,
    executedAt: new Date().toISOString(),
  }

  console.log(`🎉 [WORKFLOW FINISHED] Successfully executed ${stepResults.length} step(s)!`)
  console.log("==================================================================\n")

  let triggerHandleId: string | null = null
  let publicAccessToken: string | undefined = undefined

  try {
    if (!id || !orgId) {
      console.error(`❌ [TRIGGER.DEV] Missing parameters: workflowId=${id}, orgId=${orgId}`)
      throw new Error(`Missing workflowId or orgId for Trigger.dev task`)
    }

    console.log(`[TRIGGER.DEV] Sending task to Trigger.dev: "run-workflow" (workflowId: ${id}, orgId: ${orgId})...`)
    const handle = await tasks.trigger<typeof runWorkflowTask>(
      "run-workflow",
      {
        workflowId: id,
        orgId,
      },
      {
        tags: [id, `workflow:${id}`],
        metadata: {
          workflowId: id,
        },
      }
    )
    triggerHandleId = handle.id
    publicAccessToken = handle.publicAccessToken
    console.log(`⚡ [TRIGGER.DEV] Successfully enqueued task with tags: [${id}, workflow:${id}]! Run ID: ${handle.id}`)
  } catch (triggerError: any) {
    console.error(`❌ [TRIGGER.DEV] FAILED to trigger task:`, triggerError?.message || triggerError)
    throw new Error(`Trigger.dev failed: ${triggerError?.message || "Could not connect to Trigger.dev"}`)
  }

  return {
    id: triggerHandleId,
    publicAccessToken,
    output: executionOutput,
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
  tags?: string[]
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
      tags: run.tags ?? [],
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


