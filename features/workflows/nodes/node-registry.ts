import type { Node } from "@xyflow/react"
import { Eye, FileText, Globe, MousePointerClick, Sparkles, type LucideIcon } from "lucide-react"

export type StepNodeKind = "trigger" | "action"

// One editable field on a node, rendered as an input in the inspector later.
export type NodeField = {
  key: string
  label: string
  placeholder?: string
  multiline?: boolean
}

export type NodeOutput = {
  key: string
  label: string
  description?: string
  type?: string
}

// A node type's manifest entry. Add a node by adding an entry to nodeRegistry.
export type NodeDefinition = {
  type: string
  kind: StepNodeKind
  label: string
  icon: LucideIcon
  accent: string // Tailwind classes for the icon chip color
  fields: NodeField[]
  outputs?: NodeOutput[]
}

export const nodeRegistry = {
  start: {
    type: "start",
    kind: "trigger",
    label: "Start",
    icon: MousePointerClick,
    accent: "bg-blue-500 text-white",
    fields: [],
    outputs: [],
  },
  "open-url": {
    type: "open-url",
    kind: "action",
    label: "Open URL",
    icon: Globe,
    accent: "bg-emerald-500 text-white",
    fields: [{ key: "url", label: "URL", placeholder: "https://youtube.com" }],
    outputs: [
      { key: "url", label: "URL", description: "The final page URL" },
      { key: "title", label: "Page Title", description: "The title of the loaded page" },
      { key: "status", label: "Status", description: "Execution status" },
    ],
  },
  act: {
    type: "act",
    kind: "action",
    label: "Act",
    icon: Sparkles,
    accent: "bg-purple-500 text-white",
    fields: [
      {
        key: "instruction",
        label: "Instruction",
        placeholder: "e.g. Click the sign in button or type in search",
        multiline: true,
      },
    ],
    outputs: [
      {
        key: "worked",
        label: "Worked",
        description: "Whether the action worked",
        type: "boolean",
      },
      {
        key: "success",
        label: "Success",
        description: "Whether the action succeeded",
        type: "boolean",
      },
      {
        key: "message",
        label: "Message",
        description: "Action result message",
        type: "string",
      },
      {
        key: "url",
        label: "Resulting URL",
        description: "The page URL after the action",
        type: "string",
      },
    ],
  },
  extract: {
    type: "extract",
    kind: "action",
    label: "Extract",
    icon: FileText,
    accent: "bg-amber-500 text-white",
    fields: [
      {
        key: "instruction",
        label: "Instruction",
        placeholder: "e.g. Extract the page title, main content, or product price",
        multiline: true,
      },
    ],
    outputs: [
      {
        key: "result",
        label: "Result",
        description: "The extracted text or data from the page",
        type: "string",
      },
    ],
  },
  observe: {
    type: "observe",
    kind: "action",
    label: "Observe",
    icon: Eye,
    accent: "bg-sky-500 text-white",
    fields: [
      {
        key: "instruction",
        label: "Instruction",
        placeholder: "e.g. Find the sign in button or search input",
        multiline: true,
      },
    ],
    outputs: [
      {
        key: "matches",
        label: "Matches",
        description: "Matching actionable elements with selector and description",
        type: "array",
      },
      {
        key: "selector",
        label: "Selector",
        description: "Selector of the first matched element",
        type: "string",
      },
      {
        key: "description",
        label: "Description",
        description: "Description of the first matched element",
        type: "string",
      },
    ],
  },
} satisfies Record<string, NodeDefinition>

export type NodeType = keyof typeof nodeRegistry

// Plain JSON only (synced through Liveblocks later). type keys into the registry;
// kind and title are denormalized so the server can read them without the registry.
export type StepNodeData = {
  type: NodeType
  kind: StepNodeKind
  title: string
  values: Record<string, string>
}

export type StepNodeType = Node<StepNodeData, "step">
