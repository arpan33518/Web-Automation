"use client"

import * as React from "react"
import { Loader2 } from "lucide-react"

import { cn } from "@/lib/utils"
import {
  nodeRegistry,
  type NodeType,
} from "@/features/workflows/nodes/node-registry"

export interface NodeIconProps {
  type: NodeType
  className?: string
  iconClassName?: string
  running?: boolean
}

/**
 * The accent-colored icon chip, mirroring the node on the canvas.
 * When `running` is true, displays a spinner inside the accent chip in place of the icon.
 */
export function NodeIcon({
  type,
  className,
  iconClassName,
  running = false,
}: NodeIconProps) {
  const def = nodeRegistry[type]
  if (!def) return null
  const Icon = def.icon

  return (
    <span
      className={cn(
        "flex size-6 shrink-0 items-center justify-center rounded-md",
        def.accent,
        className
      )}
    >
      {running ? (
        <Loader2 className={cn("size-3.5 animate-spin", iconClassName)} />
      ) : (
        <Icon className={cn("size-3.5", iconClassName)} />
      )}
    </span>
  )
}
