"use client"

import * as React from "react"
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Panel,
  ConnectionLineType,
  type Edge,
  type NodeTypes,
  BackgroundVariant,
  type ColorMode,
  type DefaultEdgeOptions,
  type SmoothStepPathOptions,
} from "@xyflow/react"
import { Cursors, useLiveblocksFlow } from "@liveblocks/react-flow"
import { AvatarStack } from "@liveblocks/react-ui"
import { useOthers, useSelf } from "@liveblocks/react"

import "@xyflow/react/dist/style.css";
import "@liveblocks/react-ui/styles.css";
import "@liveblocks/react-ui/styles/dark/attributes.css";
import "@liveblocks/react-flow/styles.css";

import { StepNode } from "@/features/workflows/components/step-nodes"
import type { StepNodeType } from "@/features/workflows/nodes/node-registry"

import { useTheme } from "next-themes"
import { toast } from "sonner"

const nodeTypes: NodeTypes = { step: StepNode }

import { cn } from "@/lib/utils"

export type WorkflowEdge = Edge & {
  pathOptions?: SmoothStepPathOptions
}

const defaultEdgeOptions: DefaultEdgeOptions & {
  pathOptions?: SmoothStepPathOptions
} = {
  type: "smoothstep",
  style: { stroke: "var(--border)" },
  pathOptions: {
    borderRadius: 16,
    offset: 20,
  },
}

import type { WorkflowGraph } from "@/lib/db/schema"

const defaultInitialNodes: StepNodeType[] = [
  {
    id: "start",
    type: "step",
    position: { x: 150, y: 80 },
    data: { type: "start", kind: "trigger", title: "start", values: {} }
  },
]

const defaultInitialEdges: WorkflowEdge[] = []

export interface WorkflowCanvasProps
  extends React.HTMLAttributes<HTMLDivElement> {
  workflowId?: string
  initialGraph?: WorkflowGraph
}

export function WorkflowCanvas({
  workflowId,
  initialGraph,
  className,
  ...props
}: WorkflowCanvasProps) {
  const { resolvedTheme } = useTheme()
  const colorMode: ColorMode = (resolvedTheme as ColorMode) ?? "system"

  const effectiveInitialNodes = React.useMemo(() => {
    const rawNodes = (initialGraph?.nodes && initialGraph.nodes.length > 0)
      ? (initialGraph.nodes as StepNodeType[])
      : defaultInitialNodes
    return rawNodes.map((n) =>
      n.data?.kind === "trigger" || n.id === "start" ? { ...n, deletable: false } : n
    )
  }, [initialGraph])

  const effectiveInitialEdges = React.useMemo(() => {
    return (initialGraph?.edges && initialGraph.edges.length > 0)
      ? (initialGraph.edges as WorkflowEdge[])
      : defaultInitialEdges
  }, [initialGraph])

  const {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onConnect,
    onDelete,
    isLoading,
  } = useLiveblocksFlow({
    nodes: {
      initial: effectiveInitialNodes,
    },
    edges: {
      initial: effectiveInitialEdges,
    },
  })

  // Provide initial nodes immediately so the canvas renders instantly with zero delay,
  // ensuring the trigger node cannot be marked as deletable.
  const displayNodes = React.useMemo(() => {
    const activeNodes = (nodes ?? effectiveInitialNodes) as StepNodeType[]
    return activeNodes.map((node) =>
      node.data?.kind === "trigger" || node.id === "start"
        ? { ...node, deletable: false }
        : node
    )
  }, [nodes, effectiveInitialNodes])

  const displayEdges = edges ?? effectiveInitialEdges

  const others = useOthers()
  const self = useSelf()
  const activeUserIds = React.useMemo(() => {
    const ids = new Set<string>()
    if (self?.id) ids.add(self.id)
    for (const other of others) {
      if (other.id) ids.add(other.id)
    }
    return ids
  }, [self?.id, others])

  const userCount = activeUserIds.size > 0 ? activeUserIds.size : (self ? 1 : 0) + others.length

  const handleNodesChange = React.useCallback(
    (...args: Parameters<typeof onNodesChange>) => {
      if (isLoading) return
      onNodesChange(...args)
    },
    [isLoading, onNodesChange]
  )

  const handleEdgesChange = React.useCallback(
    (...args: Parameters<typeof onEdgesChange>) => {
      if (isLoading) return
      onEdgesChange(...args)
    },
    [isLoading, onEdgesChange]
  )

  const handleConnect = React.useCallback(
    (...args: Parameters<typeof onConnect>) => {
      if (isLoading) return
      onConnect(...args)
    },
    [isLoading, onConnect]
  )

  const handleBeforeDelete = React.useCallback(
    async ({ nodes: nodesToRemove, edges: edgesToRemove }: { nodes: any[]; edges: any[] }) => {
      const hasTrigger = nodesToRemove.some(
        (n) => n.data?.kind === "trigger" || n.id === "start"
      )
      if (hasTrigger) {
        toast.error("The Start trigger node cannot be deleted.")
        const allowableNodes = nodesToRemove.filter(
          (n) => n.data?.kind !== "trigger" && n.id !== "start"
        )
        return {
          nodes: allowableNodes,
          edges: edgesToRemove,
        }
      }
      return true
    },
    []
  )

  const handleDelete = React.useCallback(
    (params: Parameters<typeof onDelete>[0]) => {
      if (isLoading) return
      const allowableNodes = (params.nodes as StepNodeType[]).filter(
        (node) => node.data?.kind !== "trigger" && node.id !== "start"
      )
      if (
        (params.nodes as StepNodeType[]).some(
          (node) => node.data?.kind === "trigger" || node.id === "start"
        )
      ) {
        toast.error("The Start trigger node cannot be deleted.")
      }
      if (allowableNodes.length === 0 && params.edges.length === 0) {
        return
      }
      onDelete({
        nodes: allowableNodes as any,
        edges: params.edges,
      })
    },
    [isLoading, onDelete]
  )

  return (
    <div
      className={cn("relative size-full overflow-hidden", className)}
      data-workflow-id={workflowId}
      {...props}
    >
      <ReactFlow
        nodeTypes={nodeTypes}
        nodes={displayNodes}
        edges={displayEdges}
        onNodesChange={handleNodesChange}
        onEdgesChange={handleEdgesChange}
        onConnect={handleConnect}
        onBeforeDelete={handleBeforeDelete}
        onDelete={handleDelete}
        deleteKeyCode={["Backspace", "Delete"]}
        nodesDraggable={!isLoading}
        nodesConnectable={!isLoading}
        elementsSelectable={!isLoading}
        colorMode={colorMode}
        fitView
        maxZoom={1}
        style={
          {
            "--xy-background-color": "var(--background)",
            "--xy-edge-stroke-width": 2,
            "--xy-connectionline-stroke-width": 2,
          } as React.CSSProperties
        }
        connectionLineType={ConnectionLineType.SmoothStep}
        connectionLineStyle={{ stroke: "var(--border)" }}
        defaultEdgeOptions={defaultEdgeOptions as DefaultEdgeOptions}
      >
        <Background variant={BackgroundVariant.Dots} gap={16} size={1} />
        <Controls />
        <MiniMap zoomable pannable />
        <Cursors />
        <Panel position="top-left" className="m-3">
          <div className="flex items-center gap-1.5 rounded-full border border-border/70 bg-background/80 px-2.5 py-1 text-xs font-medium text-muted-foreground shadow-xs backdrop-blur-md transition-all">
            <span
              className={cn(
                "size-2 rounded-full transition-colors",
                isLoading ? "bg-amber-500 animate-pulse" : "bg-emerald-500"
              )}
            />
            <span>{isLoading ? "Syncing..." : "Realtime"}</span>
          </div>
        </Panel>
        <Panel position="top-right" className="m-3">
          <div className="flex items-center gap-2 rounded-full border border-border/70 bg-background/80 px-2.5 py-1 text-xs font-medium text-muted-foreground shadow-xs backdrop-blur-md transition-all">
            <AvatarStack size={20} />
            <span>
              {userCount} {userCount === 1 ? "user" : "users"}
            </span>
          </div>
        </Panel>
      </ReactFlow>
    </div>
  )
}
