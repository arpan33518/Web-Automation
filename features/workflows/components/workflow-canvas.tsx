"use client"

import * as React from "react"
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  ConnectionLineType,
  Position,
  type Connection,
  type Edge,
  type Node,
  BackgroundVariant,
  type ColorMode,
  type DefaultEdgeOptions,
  type SmoothStepPathOptions,
} from "@xyflow/react"
import { useTheme } from "next-themes"

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

const initialNodes: Node[] = [
  {
    id: "1",
    data: { label: "Node 1" },
    position: { x: 150, y: 80 },
    sourcePosition: Position.Bottom,
    targetPosition: Position.Top,
  },
  {
    id: "2",
    data: { label: "Node 2" },
    position: { x: 480, y: 280 },
    sourcePosition: Position.Bottom,
    targetPosition: Position.Top,
  },
]

const initialEdges: WorkflowEdge[] = [
  {
    id: "e1-2",
    source: "1",
    target: "2",
    type: "smoothstep",
    style: { stroke: "var(--border)" },
    pathOptions: {
      borderRadius: 16,
      offset: 20,
    },
  },
]

export interface WorkflowCanvasProps
  extends React.HTMLAttributes<HTMLDivElement> {
  workflowId?: string
}

const emptySubscribe = () => () => {}

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

  const [nodes, _setNodes, onNodesChange] = useNodesState(initialNodes)
  const [edges, setEdges, onEdgesChange] =
    useEdgesState<WorkflowEdge>(initialEdges)

  const onConnect = React.useCallback(
    (params: Connection) =>
      setEdges((eds) =>
        addEdge<WorkflowEdge>(
          {
            ...params,
            type: "smoothstep",
            style: { stroke: "var(--border)" },
            pathOptions: {
              borderRadius: 16,
              offset: 20,
            },
          },
          eds
        )
      ),
    [setEdges]
  )

  return (
    <div
      className={cn("relative size-full overflow-hidden", className)}
      data-workflow-id={workflowId}
      {...props}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
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
      </ReactFlow>
    </div>
  )
}
