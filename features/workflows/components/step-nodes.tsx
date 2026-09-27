"use client"

import { memo } from "react"
import { Handle, Position, type NodeProps, useReactFlow } from "@xyflow/react"
import { Loader2, Trash2 } from "lucide-react"
import { useMutation } from "@liveblocks/react"
import { toast } from "sonner"

import { useLatestRunSteps } from "@/features/workflows/components/workflow-runs-provider"
import {
  nodeRegistry,
  type StepNodeType,
} from "@/features/workflows/nodes/node-registry"
import { cn } from "@/lib/utils"

function StepNodeComponent({ id, data, selected }: NodeProps<StepNodeType>) {
  const { type, kind, title } = data
  const def = nodeRegistry[type]
  const Icon = def.icon

  const { steps, isLive } = useLatestRunSteps()
  const step = steps.find((s) => s.id === id)
  const status = step?.status?.toLowerCase()

  // Only treat a node as running while the run is actually live
  const isRunning = isLive && status === "running"
  const isFailed = status === "failed"

  // A trigger starts the flow and takes no input, so it has no target handle.
  const hasTarget = kind !== "trigger"
  const isTrigger = kind === "trigger"

  const { deleteElements } = useReactFlow()

  const deleteNodeFromLiveblocks = useMutation(
    ({ storage }, nodeId: string) => {
      const flow = (storage as any).get("flow")
      if (flow) {
        const nodesMap = flow.get("nodes")
        const edgesMap = flow.get("edges")
        if (nodesMap) {
          nodesMap.delete(nodeId)
        }
        if (edgesMap) {
          for (const [edgeId, edge] of Array.from<[string, any]>(edgesMap.entries())) {
            const edgeVal = (edge as any)?.toObject ? (edge as any).toObject() : edge
            if (edgeVal?.source === nodeId || edgeVal?.target === nodeId) {
              edgesMap.delete(edgeId)
            }
          }
        }
      }
    },
    []
  )

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (isTrigger) return

    try {
      deleteNodeFromLiveblocks(id)
    } catch {
      // Ignore if storage is not connected
    }

    deleteElements({ nodes: [{ id }] })
    toast.success(`Deleted ${title}`)
  }

  return (
    <div
      className={cn(
        "group relative min-w-50 max-w-80 rounded-(--radius) border-2 border-border bg-card text-card-foreground transition-colors",
        isRunning && "border-blue-500",
        isFailed && "border-destructive",
        selected && "ring-2 ring-ring ring-offset-2 ring-offset-background"
      )}
    >
      {hasTarget && (
        <Handle
          type="target"
          position={Position.Left}
          style={{ transform: "translate(-100%, -50%)" }}
          className="h-3.5! w-1.5! min-w-0! rounded-l-xs! rounded-r-none! border-0! bg-border!"
        />
      )}

      <div className="flex items-center justify-between gap-2 px-3 py-2.5">
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <div
            className={cn(
              "flex size-7 shrink-0 items-center justify-center rounded-md",
              def.accent
            )}
          >
            {isRunning ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Icon className="size-4" />
            )}
          </div>
          <span className="text-sm font-semibold truncate">{title}</span>
        </div>

        {!isTrigger && (
          <button
            type="button"
            onClick={handleDelete}
            title={`Delete ${title}`}
            aria-label={`Delete ${title}`}
            className={cn(
              "flex size-6 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-all cursor-pointer hover:bg-destructive/15 hover:text-destructive focus:opacity-100",
              selected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
            )}
          >
            <Trash2 className="size-3.5" />
          </button>
        )}
      </div>

      <Handle
        type="source"
        position={Position.Right}
        style={{ transform: "translate(100%, -50%)" }}
        className="h-3.5! w-1.5! min-w-0! rounded-l-none! rounded-r-xs! border-0! bg-border!"
      />
    </div>
  )
}

export const StepNode = memo(StepNodeComponent)

