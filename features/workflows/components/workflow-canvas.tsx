"use client"

import * as React from "react"
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  ConnectionLineType,
  type Edge,
  type NodeTypes,
  BackgroundVariant,
  type ColorMode,
  type DefaultEdgeOptions,
  type SmoothStepPathOptions,
} from "@xyflow/react"
import { Cursors, useLiveblocksFlow } from "@liveblocks/react-flow"

import "@xyflow/react/dist/style.css";
import "@liveblocks/react-ui/styles.css";
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
  } = useLiveblocksFlow({
    nodes: {
      initial: initialNodes,
    },
    edges: {
      initial: initialEdges,
    },
  })

  return (
    <div
      className={cn("relative size-full overflow-hidden", className)}
      data-workflow-id={workflowId}
      {...props}
    >
      <ReactFlow
        nodeTypes={nodeTypes}
        nodes={nodes || []}
        edges={edges || []}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onDelete={onDelete}
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
      </ReactFlow>
    </div>
  )
}
