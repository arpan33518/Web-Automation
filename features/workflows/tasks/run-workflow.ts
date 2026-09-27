import { config } from "dotenv"
import type { Edge } from "@xyflow/react"
import { logger, metadata, tags, task } from "@trigger.dev/sdk"
import { browserbase, localBrowser, Stagehand } from "@browserbasehq/stagehand"

// Ensure .env.local is loaded even if Trigger.dev dev process was started prior to editing env
config({ path: ".env.local", override: true })

import { getWorkflow } from "@/features/workflows/data"
import { interpolate } from "@/features/workflows/lib"
import { nodeExecutors } from "@/features/workflows/nodes/node-executors"
import { nodeRegistry, type StepNodeType } from "@/features/workflows/nodes/node-registry"
import type { WorkflowGraph } from "@/lib/db/schema"

export type RunStep = {
  id: string
  nodeId?: string
  nodeType: string
  type?: string
  title: string
  status: "pending" | "running" | "done" | "failed"
  durationMs?: number
  startedAt?: string
  completedAt?: string
  output?: any
  error?: string
}

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
      metadata.set("steps", [])
      await metadata.flush()
      return { steps: [] as RunStep[], executed: [] }
    }

    const nodeById = new Map<string, StepNodeType>(nodes.map((n) => [n.id, n]))
    const order = getExecutionOrder(nodes, edges)

    // Build a list of the steps we're about to run - each starting at "pending"
    const steps: RunStep[] = order.map((nodeId) => {
      const node = nodeById.get(nodeId)
      const stepType = node?.data?.type ?? node?.type ?? "step"
      const registryEntry =
        stepType in nodeRegistry
          ? nodeRegistry[stepType as keyof typeof nodeRegistry]
          : null
      const stepTitle = node?.data?.title || registryEntry?.label || stepType
      return {
        id: nodeId,
        nodeId,
        nodeType: stepType,
        type: stepType,
        title: stepTitle,
        status: "pending",
      }
    })
    metadata.set("steps", steps)
    await metadata.flush()

    logger.log(`Running workflow "${workflow.name}"`, { totalSteps: order.length })

    let stagehand: Stagehand | null = null
    const ctx: {
      browser: { close?: () => Promise<void>; context?: any } | null
    } = {
      browser: null,
    }

    const getStagehand = async () => {
      if (stagehand) return stagehand

      let browser
      if (process.env.BROWSERBASE_API_KEY) {
        logger.log("Connecting to Browserbase cloud browser...", {
          projectId: process.env.BROWSERBASE_PROJECT_ID,
        })
        try {
          browser = await browserbase.launch({
            apiKey: process.env.BROWSERBASE_API_KEY,
            projectId: process.env.BROWSERBASE_PROJECT_ID,
          })
          ctx.browser = browser

          const sessionId = (browser as unknown as { sessionId?: string }).sessionId
          if (sessionId) {
            const sessionUrl = `https://browserbase.com/sessions/${sessionId}`
            logger.log(`Browserbase Session Started: ${sessionId}`)
            logger.log(`Session Dashboard & Video: ${sessionUrl}`)
            metadata.set("browserbaseSessionId", sessionId)
            metadata.set("browserbaseSessionUrl", sessionUrl)
          }
        } catch (bbError: any) {
          const cause = bbError?.cause
          logger.error("Browserbase cloud launch failed:", {
            error: bbError?.message || String(bbError),
            cause: cause?.message || String(cause),
            status: cause?.status || cause?.statusCode,
          })
          logger.warn("Falling back to local Chrome browser...")
          browser = await localBrowser.launch({ headless: true })
          ctx.browser = browser
        }
      } else {
        logger.warn(
          "BROWSERBASE_API_KEY is not set — falling back to local Chrome browser. Cloud session video will NOT be available.",
        )
        browser = await localBrowser.launch({ headless: true })
        ctx.browser = browser
      }

      const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY
      const groqKey = process.env.GROQ_API_KEY
      const openaiKey = process.env.OPENAI_API_KEY
      const anthropicKey = process.env.ANTHROPIC_API_KEY
      const configuredModel = process.env.STAGEHAND_MODEL_NAME?.trim()

      let stagehandModel: { modelName: any; apiKey: string } | undefined

      if (configuredModel) {
        if (configuredModel.startsWith("google/") && geminiKey) {
          stagehandModel = { modelName: configuredModel as any, apiKey: geminiKey }
        } else if (configuredModel.startsWith("groq/") && groqKey) {
          stagehandModel = { modelName: configuredModel as any, apiKey: groqKey }
        } else if (configuredModel.startsWith("openai/") && openaiKey) {
          stagehandModel = { modelName: configuredModel as any, apiKey: openaiKey }
        } else if (configuredModel.startsWith("anthropic/") && anthropicKey) {
          stagehandModel = { modelName: configuredModel as any, apiKey: anthropicKey }
        }
      }

      if (!stagehandModel) {
        if (geminiKey) {
          stagehandModel = {
            modelName: "google/gemini-flash-latest" as any,
            apiKey: geminiKey,
          }
        } else if (groqKey) {
          stagehandModel = {
            modelName: "groq/llama-3.1-8b-instant" as any,
            apiKey: groqKey,
          }
        } else if (openaiKey) {
          stagehandModel = {
            modelName: "openai/gpt-4o-mini" as any,
            apiKey: openaiKey,
          }
        } else if (anthropicKey) {
          stagehandModel = {
            modelName: "anthropic/claude-3-5-sonnet" as any,
            apiKey: anthropicKey,
          }
        }
      }

      if (!stagehandModel) {
        logger.warn(
          "No LLM API key detected (OPENAI_API_KEY, GEMINI_API_KEY, or ANTHROPIC_API_KEY). AI actions (act, observe, extract, agent) require an LLM to interact with the browser."
        )
      }

      stagehand = await Stagehand.create({
        browser,
        ...(stagehandModel ? { model: stagehandModel } : {}),
        logging: { level: "info", format: "pretty" },
      })

      return stagehand
    }

    const executedSteps: Array<{
      id: string
      title: string
      type: string
      output?: unknown
    }> = []
    const nodeOutputs: Record<string, unknown> = {}

    try {
      for (const stepId of order) {
        const node = nodeById.get(stepId)
        if (node) {
          const stepType = node.data?.type ?? node.type ?? "step"
          const stepTitle = node.data?.title || stepType
          const rawValues = node.data?.values || {}

          // Replace placeholders like {{ someNodeId.title }} with matching upstream node data
          const values: Record<string, string> = Object.fromEntries(
            Object.entries(rawValues).map(([key, val]) => [
              key,
              typeof val === "string" ? interpolate(val, nodeOutputs) : val,
            ])
          )

          logger.log(`Running step: ${stepTitle} (${stepType})`, {
            stepId,
            values,
            rawValues,
          })

          const currentStep = steps.find((s) => s.id === stepId)
          const executor = nodeExecutors[stepType as keyof typeof nodeExecutors]

          // Nodes with no executor (such as the start trigger) do no work and produce
          // no output. Mark them done and publish to metadata before continuing.
          if (!executor) {
            logger.log(`Step "${stepTitle}" (${stepType}) has no executor — marking done`)
            if (currentStep) {
              currentStep.status = "done"
              currentStep.completedAt = new Date().toISOString()
              currentStep.durationMs = 0
              currentStep.output = undefined
              metadata.set("steps", steps)
              await metadata.flush()
            }
            nodeOutputs[stepId] = {}
            executedSteps.push({
              id: stepId,
              title: stepTitle,
              type: stepType,
              output: undefined,
            })
            continue
          }

          const stepStartTime = Date.now()
          if (currentStep) {
            currentStep.status = "running"
            currentStep.startedAt = new Date(stepStartTime).toISOString()
            metadata.set("steps", steps)
            await metadata.flush()
          }

          let stepResult: unknown = null

          try {
            logger.log(`Action [${stepType}]: Executing`)

            const sh = await getStagehand()
            const result = await executor({
              stagehand: sh,
              values,
            })

            stepResult = {
              ...result,
              status: "success",
            }

            const durationMs = Date.now() - stepStartTime
            if (currentStep) {
              currentStep.status = "done"
              currentStep.completedAt = new Date().toISOString()
              currentStep.durationMs = durationMs
              currentStep.output = stepResult
              metadata.set("steps", steps)
              await metadata.flush()
            }
          } catch (stepErr) {
            const durationMs = Date.now() - stepStartTime
            const errorMessage = stepErr instanceof Error ? stepErr.message : String(stepErr)
            logger.error(`Step "${stepTitle}" (${stepId}) failed:`, { error: stepErr })
            if (currentStep) {
              currentStep.status = "failed"
              currentStep.completedAt = new Date().toISOString()
              currentStep.durationMs = durationMs
              currentStep.error = errorMessage
              metadata.set("steps", steps)
              await metadata.flush()
            }
            throw stepErr
          }

          // Keep each node's output keyed by its ID for subsequent nodes to consume
          nodeOutputs[stepId] = stepResult

          executedSteps.push({
            id: stepId,
            title: stepTitle,
            type: stepType,
            output: stepResult,
          })
        }
      }

      logger.log(`Successfully completed workflow "${workflow.name}"`, {
        executedCount: executedSteps.length,
      })
    } finally {
      try {
        await (stagehand as Stagehand | null)?.close()
      } catch (err) {
        logger.warn("Error closing Stagehand", { error: err })
      }
      try {
        await ctx.browser?.close?.()
      } catch (err) {
        logger.warn("Error closing browser", { error: err })
      }
    }

    return {
      workflowId,
      name: workflow.name,
      steps,
      executed: executedSteps,
      outputs: nodeOutputs,
    }
  },
})
