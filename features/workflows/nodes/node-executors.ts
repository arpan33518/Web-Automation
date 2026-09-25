import type { Stagehand } from "@browserbasehq/stagehand"
import { act } from "@/features/workflows/nodes/act"
import { agent } from "@/features/workflows/nodes/agent"
import { extract } from "@/features/workflows/nodes/extract"
import { observe } from "@/features/workflows/nodes/observe"
import { openUrl } from "@/features/workflows/nodes/open-url"
import type { nodeRegistry } from "@/features/workflows/nodes/node-registry"

export type ActionNodeType = {
  [K in keyof typeof nodeRegistry]: (typeof nodeRegistry)[K]["kind"] extends "action"
    ? K
    : never
}[keyof typeof nodeRegistry]

export interface NodeExecutorContext {
  stagehand: Stagehand
  values: Record<string, string>
}

export type NodeExecutor = (
  ctx: NodeExecutorContext
) => Promise<Record<string, unknown>>

export const nodeExecutors = {
  "open-url": async ({ stagehand, values }) => {
    return openUrl({
      stagehand,
      url: values.url || "https://example.com",
    })
  },
  act: async ({ stagehand, values }) => {
    return act({
      stagehand,
      instruction: values.instruction || "",
    })
  },
  extract: async ({ stagehand, values }) => {
    return extract({
      stagehand,
      instruction: values.instruction || "",
    })
  },
  observe: async ({ stagehand, values }) => {
    return observe({
      stagehand,
      instruction: values.instruction || "",
    })
  },
  agent: async ({ stagehand, values }) => {
    return agent({
      stagehand,
      instruction: values.instruction || "",
    })
  },
} satisfies Record<ActionNodeType, NodeExecutor>



