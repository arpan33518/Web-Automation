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

const initialNodes: StepNodeType[] = [
  {
    id: "start",
    type: "step",
    position: { x: 150, y: 80 },
    data: { type: "start", kind: "trigger", title: "start", values: {} }
  },

]

const initialEdges: WorkflowEdge[] = []

export interface WorkflowCanvasProps
  extends React.HTMLAttributes<HTMLDivElement> {
  workflowId?: string
}

const emptySubscribe = () => () => { }

export function WorkflowCanvas({
  workflowId,
  className,
  ...props
}: WorkflowCanvasProps) {
  const { resolvedTheme } = useTheme()
  const mounted = React.useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  )
  const colorMode: ColorMode = mounted
    ? ((resolvedTheme as ColorMode) ?? "light")
    : "light"

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
      initial: initialNodes,
    },
    edges: {
      initial: initialEdges,
    },
  })

  // Provide initial nodes immediately so the canvas renders instantly with zero delay
  const displayNodes = nodes ?? initialNodes
  const displayEdges = edges ?? initialEdges

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

  const handleDelete = React.useCallback(
    (...args: Parameters<typeof onDelete>) => {
      if (isLoading) return
      onDelete(...args)
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
        onDelete={handleDelete}
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
