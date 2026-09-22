import { logger, task } from "@trigger.dev/sdk"

export interface WorkflowTaskPayload {
  message?: string
  workflowId?: string
  graph?: {
    nodes: Array<{
      id: string
      type?: string
      data?: {
        type?: string
        kind?: string
        title?: string
        values?: Record<string, string>
      }
    }>
    edges: Array<{
      source: string
      target: string
    }>
  }
}

export const exampleTask = task({
  id: "example-task",
  run: async (payload: WorkflowTaskPayload = {}) => {
    console.log("\n============================================================")
    console.log(`[TRIGGER.DEV] Task execution started for workflow: ${payload.workflowId ?? "unspecified"}`)
    console.log(`[TRIGGER.DEV] Total canvas nodes: ${payload.graph?.nodes?.length ?? 0}`)
    console.log(`[TRIGGER.DEV] Total canvas edges: ${payload.graph?.edges?.length ?? 0}`)
    console.log("============================================================")
    logger.log("Executing workflow canvas run", { payload })

    const nodes = payload.graph?.nodes ?? []
    const edges = payload.graph?.edges ?? []

    const stepResults: Array<{
      nodeId: string
      title: string
      type: string
      status: "success" | "skipped" | "failed"
      output?: unknown
    }> = []

    if (nodes.length > 0) {
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

      while (queue.length > 0) {
        const currentId = queue.shift()!
        if (visited.has(currentId)) continue
        visited.add(currentId)

        const node = nodeMap.get(currentId)
        if (!node) continue

        const nodeType = node.data?.type ?? node.type ?? "unknown"
        const nodeTitle = node.data?.title ?? nodeType
        const values = node.data?.values ?? {}

        console.log(`[TRIGGER.DEV] ──▶ Running step: "${nodeTitle}" (${nodeType})`)
        if (Object.keys(values).length > 0) {
          console.log(`              Parameters:`, JSON.stringify(values))
        }
        logger.log(`Executing step: ${nodeTitle} (${nodeType})`, { values })

        if (nodeType === "open-url") {
          const targetUrl = values.url || "https://example.com"
          const result = {
            url: targetUrl,
            action: "open-url",
            status: "success",
            timestamp: new Date().toISOString(),
          }
          console.log(`[TRIGGER.DEV]   ✔ Step "${nodeTitle}" opened URL: ${targetUrl}`)
          stepResults.push({
            nodeId: currentId,
            title: nodeTitle,
            type: nodeType,
            status: "success",
            output: result,
          })
        } else {
          const result = {
            values,
            status: "success",
            timestamp: new Date().toISOString(),
          }
          console.log(`[TRIGGER.DEV]   ✔ Step "${nodeTitle}" completed successfully`)
          stepResults.push({
            nodeId: currentId,
            title: nodeTitle,
            type: nodeType,
            status: "success",
            output: result,
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

    console.log("============================================================")
    console.log(`[TRIGGER.DEV] Run completed! Executed ${stepResults.length} steps.`)
    console.log("============================================================\n")

    return {
      message: payload.message ?? "Workflow executed successfully!",
      workflowId: payload.workflowId,
      totalStepsExecuted: stepResults.length,
      steps: stepResults,
      finishedAt: new Date().toISOString(),
    }
  },
})

