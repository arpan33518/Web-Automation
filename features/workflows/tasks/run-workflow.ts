import type { Edge } from "@xyflow/react"
import { logger, metadata, tags, task } from "@trigger.dev/sdk"

import { getWorkflow } from "@/features/workflows/data"
import type { StepNodeType } from "@/features/workflows/nodes/node-registry"
import type { WorkflowGraph } from "@/lib/db/schema"

/**
 * Computes topological execution order of workflow nodes based on directed edges.
 * - Prioritizes connected nodes starting from trigger/start nodes.
 * - Falls back cleanly if there are no edges.
 */
function getExecutionOrder(nodes: StepNodeType[], edges: Edge[]): string[] {
  if (nodes.length === 0) return []

  const nodeIds = new Set(nodes.map((n) => n.id))
  const validEdges = edges.filter((e) => nodeIds.has(e.source) && nodeIds.has(e.target))

  // If there are no connections, run available nodes (triggers first)
  if (validEdges.length === 0) {
    return [...nodes]
      .sort((a, b) => {
        const isA = a.data?.kind === "trigger" || a.data?.type === "start" ? 1 : 0
        const isB = b.data?.kind === "trigger" || b.data?.type === "start" ? 1 : 0
        return isB - isA
      })
      .map((n) => n.id)
  }

  const connectedIds = new Set(validEdges.flatMap((e) => [e.source, e.target]))
  const targetNodes = nodes.filter((n) => connectedIds.has(n.id))

  const inDegree = new Map<string, number>()
  const outgoing = new Map<string, string[]>()

  for (const node of targetNodes) {
    inDegree.set(node.id, 0)
    outgoing.set(node.id, [])
  }

  for (const edge of validEdges) {
    if (outgoing.has(edge.source) && inDegree.has(edge.target)) {
      outgoing.get(edge.source)!.push(edge.target)
      inDegree.set(edge.target, (inDegree.get(edge.target) ?? 0) + 1)
    }
  }

  // Start with nodes that have 0 incoming edges (starting nodes), prioritizing triggers
  const queue: string[] = targetNodes
    .filter((n) => (inDegree.get(n.id) ?? 0) === 0)
    .sort((a, b) => {
      const isA = a.data?.kind === "trigger" || a.data?.type === "start" ? 1 : 0
      const isB = b.data?.kind === "trigger" || b.data?.type === "start" ? 1 : 0
      return isB - isA
    })
    .map((n) => n.id)

  const order: string[] = []
  const visited = new Set<string>()

  while (queue.length > 0) {
    const currentId = queue.shift()!
    if (visited.has(currentId)) continue
    visited.add(currentId)
    order.push(currentId)

    const neighbors = outgoing.get(currentId) ?? []
    for (const nextId of neighbors) {
      const degree = (inDegree.get(nextId) ?? 1) - 1
      inDegree.set(nextId, degree)
      if (degree <= 0 && !visited.has(nextId)) {
        queue.push(nextId)
      }
    }
  }

  // If there are any remaining unvisited nodes (e.g. cyclic graph), append them
  for (const node of targetNodes) {
    if (!visited.has(node.id)) {
      order.push(node.id)
    }
  }

  return order
}

export const runWorkflowTask = task({
  id: "run-workflow",
  run: async ({ workflowId, orgId }: { workflowId: string; orgId: string }) => {
    try {
      await tags.add([workflowId, `workflow:${workflowId}`])
      metadata.set("workflowId", workflowId)
    } catch (tagErr) {
      logger.warn("Could not set tags/metadata on run", { error: tagErr })
    }

    const workflow = await getWorkflow(orgId, workflowId)
    if (!workflow) {
      throw new Error(`Workflow "${workflowId}" not found for organization "${orgId}"`)
    }

    const rawGraph: unknown = workflow.graph
    let graph: WorkflowGraph = { nodes: [], edges: [] }

    if (typeof rawGraph === "string") {
      try {
        graph = JSON.parse(rawGraph) as WorkflowGraph
      } catch (parseError) {
        logger.warn("Failed to parse workflow graph JSON", { error: parseError })
        graph = { nodes: [], edges: [] }
      }
    } else if (rawGraph && typeof rawGraph === "object") {
      graph = rawGraph as WorkflowGraph
    }

    const nodes: StepNodeType[] = Array.isArray(graph.nodes) ? graph.nodes : []
    const edges: Edge[] = Array.isArray(graph.edges) ? graph.edges : []

    if (nodes.length === 0) {
      logger.log(`Workflow "${workflow.name}" has no nodes to execute.`)
      return { steps: 0, executed: [] }
    }

    const nodeById = new Map<string, StepNodeType>(nodes.map((n) => [n.id, n]))
    const order = getExecutionOrder(nodes, edges)

    logger.log(`Running workflow "${workflow.name}"`, { totalSteps: order.length })

    const executedSteps: Array<{ id: string; title: string; type: string }> = []

    for (const stepId of order) {
      const node = nodeById.get(stepId)
      if (node) {
        const stepType = node.data?.type ?? node.type ?? "step"
        const stepTitle = node.data?.title || stepType
        const values = node.data?.values || {}

        logger.log(`Running step: ${stepTitle} (${stepType})`, { stepId, values })

        if (stepType === "open-url") {
          const targetUrl = values.url || "https://example.com"
          logger.log(`Action [open-url]: ${targetUrl}`)
        }

        executedSteps.push({
          id: stepId,
          title: stepTitle,
          type: stepType,
        })
      }
    }

    logger.log(`Successfully completed workflow "${workflow.name}"`, {
      executedCount: executedSteps.length,
    })

    return {
      workflowId,
      name: workflow.name,
      steps: executedSteps.length,
      executed: executedSteps,
    }
  },
})
