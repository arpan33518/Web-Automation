import { useMemo } from "react"
import { getIncomers, useEdges, useNodes, type Node } from "@xyflow/react"

import {
  nodeRegistry,
  type NodeOutput,
  type NodeType,
  type StepNodeType,
} from "@/features/workflows/nodes/node-registry"

export type UpstreamOutputOption = {
  token: string
  label: string
  type: NodeType
  nodeId: string
  nodeTitle: string
  output: NodeOutput
}

/**
 * Hook that returns every output exposed by nodes upstream of the given node.
 * Traverses backwards through all incoming connections in the graph.
 * Automatically re-computes when edges are connected or disconnected.
 */
export function useUpstreamConnections(
  selectedNode: StepNodeType | Node | null | undefined
): UpstreamOutputOption[] {
  const nodes = useNodes<StepNodeType>()
  const edges = useEdges()

  return useMemo(() => {
    if (!selectedNode?.id) return []

    // Queue for BFS traversal up the DAG
    const upstreamNodes: StepNodeType[] = []
    const visited = new Set<string>([selectedNode.id])
    const queue: (StepNodeType | Node)[] = [selectedNode]

    while (queue.length > 0) {
      const current = queue.shift()!
      const directIncomers = getIncomers(current, nodes, edges)

      for (const incomer of directIncomers) {
        if (!visited.has(incomer.id)) {
          visited.add(incomer.id)
          upstreamNodes.push(incomer as StepNodeType)
          queue.push(incomer)
        }
      }
    }

    // Map each upstream node's declared outputs to ready-to-use tokens
    const options: UpstreamOutputOption[] = []

    for (const node of upstreamNodes) {
      const nodeType = (node.data?.type ?? node.type) as NodeType
      const definition = nodeRegistry[nodeType]
      const outputs = definition?.outputs ?? []

      if (outputs.length === 0) continue

      const nodeTitle = node.data?.title || definition?.label || node.id

      for (const output of outputs) {
        options.push({
          token: `{{ ${node.id}.${output.key} }}`,
          label: `${nodeTitle} · ${output.label}`,
          type: nodeType,
          nodeId: node.id,
          nodeTitle,
          output,
        })
      }
    }

    return options
  }, [selectedNode?.id, nodes, edges])
}
