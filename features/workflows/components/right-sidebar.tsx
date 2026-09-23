"use client"

import { useCallback, useRef, useState, useTransition } from "react"
import { useParams, useRouter } from "next/navigation"
import {
  useNodes,
  useOnSelectionChange,
  useReactFlow,
  useStoreApi,
} from "@xyflow/react"
import { useMutation, useStorageRoot } from "@liveblocks/react"
import { LiveObject } from "@liveblocks/client"
import { Loader2, MoreHorizontal, Play, Trash2 } from "lucide-react"
import { toast } from "sonner"

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ResizablePanel } from "@/components/ui/resizable"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"

import {
  nodeRegistry,
  type NodeDefinition,
  type NodeField,
  type NodeType,
  type StepNodeKind,
  type StepNodeType,
} from "@/features/workflows/nodes/node-registry"
import {
  deleteWorkflowAction,
  getWorkflowRunStatusAction,
  runWorkflowAction,
} from "@/features/workflows/actions"
import { validateGraph } from "@/features/workflows/lib/validate-graph"

// This file builds up to the RightSidebar component exported at the bottom: a
// header with workflow actions (delete, run), then two tabs — a Toolbar for
// adding nodes and an Editor for tweaking the selected node. Each helper below is
// defined just above the block that uses it.

// ---------------------------------------------------------------------------
// Shared pieces — used by both the Toolbar and the Editor.
// ---------------------------------------------------------------------------

// The accent-colored icon chip, mirroring the node on the canvas.
function NodeIcon({ type, className }: { type: NodeType; className?: string }) {
  const def = nodeRegistry[type]
  const Icon = def.icon
  return (
    <span
      className={cn(
        "flex size-6 shrink-0 items-center justify-center rounded-md",
        def.accent,
        className
      )}
    >
      <Icon className="size-3.5" />
    </span>
  )
}

// A titled, scrollable panel. Each tab renders its content inside one.
function Section({
  title,
  icon,
  children,
}: {
  title: string
  icon?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center gap-2 border-y border-border bg-card px-3 py-1.5 text-sm font-semibold">
        {icon}
        {title}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Editor tab — edits the fields of the selected node.
// ---------------------------------------------------------------------------

// A single editor field for a node property.
function Field({
  field,
  value,
  onChange,
}: {
  field: NodeField
  value: string
  onChange: (value: string) => void
}) {
  if (field.multiline) {
    return (
      <Textarea
        id={field.key}
        value={value}
        placeholder={field.placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    )
  }

  return (
    <Input
      id={field.key}
      value={value}
      placeholder={field.placeholder}
      onChange={(e) => onChange(e.target.value)}
    />
  )
}

// The Editor tab: one input per field on the selected node, or an empty state.
function Inspector({ node }: { node: StepNodeType | undefined }) {
  const { setNodes } = useReactFlow<StepNodeType>()

  const updateNodeInLiveblocks = useMutation(
    ({ storage }, nodeId: string, key: string, value: string) => {
      const flow = (storage as any).get("flow")
      if (flow) {
        const nodesMap = flow.get("nodes")
        const liveNode = nodesMap?.get(nodeId)
        if (liveNode) {
          const data = liveNode.get("data")
          if (data) {
            const values = data.get("values")
            if (values && typeof values.set === "function") {
              values.set(key, value)
            } else if (values && typeof values === "object") {
              data.set("values", new LiveObject({ ...values, [key]: value }))
            } else {
              data.set("values", new LiveObject({ [key]: value }))
            }
          }
        }
      }
    },
    []
  )

  if (!node) {
    return (
      <Section title="Editor">
        <p className="p-3 text-sm text-muted-foreground">No node selected</p>
      </Section>
    )
  }

  const { type, title, values } = node.data
  const def: NodeDefinition = nodeRegistry[type]

  const updateField = (key: string, value: string) => {
    setNodes((nodes) =>
      nodes.map((n) => {
        if (n.id === node.id) {
          return {
            ...n,
            data: {
              ...n.data,
              values: {
                ...(n.data?.values ?? {}),
                [key]: value,
              },
            },
          }
        }
        return n
      })
    )

    try {
      updateNodeInLiveblocks(node.id, key, value)
    } catch {
      // Ignore if not yet connected to Liveblocks storage
    }
  }

  return (
    <Section title={title} icon={<NodeIcon type={type} />}>
      <div className="flex flex-col gap-3 p-3">
        {def.fields.length === 0 ? (
          <p className="text-xs text-muted-foreground">No properties</p>
        ) : (
          def.fields.map((field) => (
            <div key={field.key} className="flex flex-col gap-1.5">
              <Label htmlFor={field.key} className="text-xs">
                {field.label}
              </Label>
              <Field
                field={field}
                value={values?.[field.key] ?? ""}
                onChange={(value) => updateField(field.key, value)}
              />
            </div>
          ))
        )}
      </div>
    </Section>
  )
}

// ---------------------------------------------------------------------------
// Toolbar tab — adds nodes to the canvas, grouped by kind.
// ---------------------------------------------------------------------------

// The Toolbar's groups, one accordion section per node kind.
const sections: { kind: StepNodeKind; label: string }[] = [
  { kind: "trigger", label: "Triggers" },
  { kind: "action", label: "Actions" },
]

// Every node type from the registry, filtered into the groups below.
const definitions = Object.values(nodeRegistry)

// The Toolbar tab: a button per node type that adds it to the canvas.
function Palette() {
  const store = useStoreApi()
  const { screenToFlowPosition, getNodes, setNodes } = useReactFlow<StepNodeType>()

  const addNodeToLiveblocks = useMutation(
    ({ storage }, newNode: StepNodeType) => {
      const flow = (storage as any).get("flow")
      if (flow) {
        const nodesMap = flow.get("nodes")
        if (nodesMap) {
          nodesMap.set(newNode.id, LiveObject.from(newNode as any))
        }
      }
    },
    []
  )

  const add = (type: NodeType) => {
    const def = nodeRegistry[type]
    const existingNodes = getNodes()

    if (def.kind === "trigger") {
      const hasTrigger = existingNodes.some((node) => node.data?.kind === "trigger")
      if (hasTrigger) {
        toast.error("Only a single trigger node is allowed")
        return
      }
    }

    const sameTypeNodes = existingNodes.filter((node) => node.data?.type === type)
    const regex = new RegExp(`^${def.label}\\s+(\\d+)$`)
    let maxNum = 0
    for (const n of sameTypeNodes) {
      const match = n.data?.title?.match(regex)
      if (match) {
        const num = parseInt(match[1], 10)
        if (num > maxNum) maxNum = num
      }
    }
    const count = Math.max(sameTypeNodes.length + 1, maxNum + 1)
    const title = def.kind === "trigger" ? def.label : `${def.label} ${count}`

    const domNode = store.getState().domNode ?? document.querySelector<HTMLElement>(".react-flow")
    const rect = domNode?.getBoundingClientRect()
    const centerScreen = rect
      ? { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
      : { x: window.innerWidth / 2, y: window.innerHeight / 2 }
    const flowPosition = screenToFlowPosition(centerScreen)

    const newNode: StepNodeType = {
      id: crypto.randomUUID(),
      type: "step",
      position: {
        x: flowPosition.x - 100,
        y: flowPosition.y - 25,
      },
      data: {
        type,
        kind: def.kind,
        title,
        values: {},
      },
    }

    setNodes((nodes) => [...nodes, newNode])

    try {
      addNodeToLiveblocks(newNode)
    } catch {
      // fallback if liveblocks storage not ready yet
    }
  }

  return (
    <Section title="Toolbar">
      <Accordion
        type="multiple"
        defaultValue={sections.map((s) => s.kind)}
        className="px-3 py-2"
      >
        {sections.map((section) => (
          <AccordionItem
            key={section.kind}
            value={section.kind}
            className="not-last:border-b-0"
          >
            <AccordionTrigger className="py-2 text-xs font-medium text-muted-foreground hover:no-underline">
              {section.label}
            </AccordionTrigger>
            <AccordionContent className="flex flex-col gap-0.5">
              {definitions
                .filter((def) => def.kind === section.kind)
                .map((def) => (
                  <Button
                    key={def.type}
                    variant="ghost"
                    onClick={() => add(def.type as NodeType)}
                    className="justify-start gap-2.5 px-1.5 text-xs"
                  >
                    <NodeIcon type={def.type as NodeType} />
                    {def.label}
                  </Button>
                ))}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </Section>
  )
}

// ---------------------------------------------------------------------------
// Header — workflow-level actions shown above the tabs.
// ---------------------------------------------------------------------------

// The "..." menu for workflow-level actions.
function ActionsMenu({ workflowId }: { workflowId?: string }) {
  const params = useParams()
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const id = workflowId ?? (typeof params?.id === "string" ? params.id : undefined)

  const handleDelete = () => {
    if (!id || isPending) return

    startTransition(async () => {
      try {
        await deleteWorkflowAction(id)
        router.push("/")
      } catch (error) {
        if (
          error &&
          typeof error === "object" &&
          "digest" in error &&
          typeof error.digest === "string" &&
          error.digest.startsWith("NEXT_REDIRECT")
        ) {
          return
        }
        console.error("Failed to delete workflow:", error)
        toast.error("Failed to delete workflow")
      }
    })
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="icon" variant="ghost" disabled={isPending}>
          <MoreHorizontal />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-48">
        <DropdownMenuItem
          variant="destructive"
          disabled={isPending || !id}
          className="text-xs [&_svg:not([class*='size-'])]:size-3.5"
          onSelect={(e) => {
            e.preventDefault()
            handleDelete()
          }}
        >
          <Trash2 />
          {isPending ? "Deleting workflow..." : "Delete workflow"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

// Kicks off a run of the current workflow and populates results in Liveblocks.
function RunButton({ workflowId }: { workflowId?: string }) {
  const params = useParams()
  const [isRunning, setIsRunning] = useState(false)
  const { getNodes, getEdges } = useReactFlow<StepNodeType>()

  const id = workflowId ?? (typeof params?.id === "string" ? params.id : undefined)
  const [storageRoot] = useStorageRoot()
  const storageRootRef = useRef(storageRoot)
  storageRootRef.current = storageRoot

  const populateRunInLiveblocks = useMutation(
    ({ storage }, runData: any) => {
      ;(storage as any).set("lastRun", new LiveObject(runData))
    },
    []
  )

  const syncGraphToLiveblocks = useMutation(
    ({ storage }, currentNodes: StepNodeType[], currentEdges: any[]) => {
      const flow = (storage as any).get("flow")
      if (flow) {
        const nodesMap = flow.get("nodes")
        const edgesMap = flow.get("edges")
        if (nodesMap && edgesMap) {
          for (const n of currentNodes) {
            if (!nodesMap.has(n.id)) {
              nodesMap.set(n.id, LiveObject.from(n as any))
            }
          }
          for (const e of currentEdges) {
            if (!edgesMap.has(e.id)) {
              edgesMap.set(e.id, LiveObject.from(e as any))
            }
          }
        }
      }
    },
    []
  )

  const safePopulateRun = useCallback(
    (runData: any) => {
      if (!storageRootRef.current) {
        return
      }
      try {
        populateRunInLiveblocks(runData)
      } catch (err) {
        console.warn("Failed to set run state in Liveblocks:", err)
      }
    },
    [populateRunInLiveblocks]
  )

  const safeSyncGraph = useCallback(
    (currentNodes: StepNodeType[], currentEdges: any[]) => {
      if (!storageRootRef.current) {
        return
      }
      try {
        syncGraphToLiveblocks(currentNodes, currentEdges)
      } catch (syncErr) {
        console.warn("Could not sync nodes directly to Liveblocks:", syncErr)
      }
    },
    [syncGraphToLiveblocks]
  )

  const handleRun = async () => {
    if (isRunning) return

    const nodes = getNodes()
    const edges = getEdges()

    // 1. Validate the graph with topological sort
    const problems = validateGraph({ nodes, edges })
    if (problems.length > 0) {
      toast.error(problems[0])
      return
    }

    setIsRunning(true)
    const startedAt = new Date().toISOString()
    const startMs = Date.now()

    // 2. Sync nodes & edges into Liveblocks (safe guarded)
    safeSyncGraph(nodes, edges)

    // 3. Populate QUEUED run state in Liveblocks (safe guarded)
    safePopulateRun({
      runId: null,
      status: "QUEUED",
      isCompleted: false,
      isExecuting: false,
      isQueued: true,
      createdAt: startedAt,
      startedAt,
      finishedAt: null,
      durationMs: null,
      error: null,
      output: null,
      nodesCount: nodes.length,
      edgesCount: edges.length,
    })

    try {
      toast.info("Running workflow...")

      // 4. Trigger workflow run action (logs to terminal and triggers Trigger.dev task)
      const result = await runWorkflowAction({
        workflowId: id,
        graph: { nodes, edges },
        message: `Workflow run triggered from right sidebar at ${new Date().toLocaleTimeString()}`,
      })

      // 5. Update Liveblocks with runId and begin polling Trigger.dev worker status
      if (result.id) {
        safePopulateRun({
          runId: result.id,
          status: "QUEUED",
          isCompleted: false,
          isExecuting: false,
          isQueued: true,
          createdAt: startedAt,
          startedAt,
          finishedAt: null,
          durationMs: null,
          error: null,
          output: result.output,
          nodesCount: nodes.length,
          edgesCount: edges.length,
        })

        let pollCount = 0
        const pollInterval = setInterval(async () => {
          pollCount++
          try {
            const runInfo = await getWorkflowRunStatusAction(result.id)
            safePopulateRun({
              runId: runInfo.id,
              status: runInfo.status,
              isCompleted: runInfo.isCompleted,
              isExecuting: runInfo.isExecuting,
              isQueued: runInfo.isQueued,
              createdAt: runInfo.createdAt ?? startedAt,
              startedAt: runInfo.startedAt ?? startedAt,
              finishedAt: runInfo.finishedAt,
              durationMs: runInfo.durationMs ?? (Date.now() - startMs),
              error: runInfo.error,
              output: runInfo.output ?? result.output,
              nodesCount: nodes.length,
              edgesCount: edges.length,
            })

            if (runInfo.isCompleted || pollCount >= 30) {
              clearInterval(pollInterval)
            }
          } catch {
            if (pollCount >= 30) {
              clearInterval(pollInterval)
            }
          }
        }, 1500)
      } else {
        const finishedAt = new Date().toISOString()
        const durationMs = Date.now() - startMs

        safePopulateRun({
          runId: null,
          status: "COMPLETED",
          isCompleted: true,
          isExecuting: false,
          isQueued: false,
          createdAt: startedAt,
          startedAt,
          finishedAt,
          durationMs,
          error: null,
          output: result.output,
          nodesCount: nodes.length,
          edgesCount: edges.length,
        })
      }

      toast.success("Workflow triggered! Watching execution progress...")
    } catch (error: any) {
      console.error("Workflow execution error:", error)
      const errorMsg = error?.message || "Failed to execute workflow"
      toast.error(errorMsg)

      safePopulateRun({
        runId: null,
        status: "FAILED",
        isCompleted: true,
        isExecuting: false,
        isQueued: false,
        createdAt: startedAt,
        startedAt,
        finishedAt: new Date().toISOString(),
        durationMs: Date.now() - startMs,
        error: errorMsg,
        output: null,
        nodesCount: nodes.length,
        edgesCount: edges.length,
      })
    } finally {
      setIsRunning(false)
    }
  }

  return (
    <Button
      size="sm"
      variant={isRunning ? "outline" : "secondary"}
      disabled={isRunning}
      onClick={handleRun}
      className="gap-1.5"
    >
      {isRunning ? (
        <>
          <Loader2 className="size-3.5 animate-spin text-primary" />
          <span>Running...</span>
        </>
      ) : (
        <>
          <Play className="size-3.5 fill-primary" />
          <span>Run</span>
        </>
      )}
    </Button>
  )
}

// ---------------------------------------------------------------------------
// The sidebar itself — header on top, then the Toolbar / Editor tabs.
// ---------------------------------------------------------------------------

export function RightSidebar({ workflowId }: { workflowId?: string } = {}) {
  const [tab, setTab] = useState("toolbar")

  const nodes = useNodes<StepNodeType>()
  const selected = nodes.find((node) => node.selected)

  useOnSelectionChange({
    onChange: useCallback(({ nodes }) => {
      if (nodes.length > 0) {
        setTab("editor")
      }
    }, []),
  })

  return (
    <ResizablePanel
      className="bg-background"
      defaultSize="16rem"
      minSize="14rem"
      maxSize="36rem"
      groupResizeBehavior="preserve-pixel-size"
    >
      <Tabs value={tab} onValueChange={setTab} className="size-full gap-0">
        <div className="flex items-center justify-between border-b border-border p-2">
          <ActionsMenu workflowId={workflowId} />
          <RunButton workflowId={workflowId} />
        </div>
        <TabsList className="m-2 w-fit bg-background">
          <TabsTrigger
            value="toolbar"
            className="flex-none rounded-sm data-active:bg-accent! data-active:text-accent-foreground! data-active:shadow-none! dark:data-active:border-transparent!"
          >
            Toolbar
          </TabsTrigger>
          <TabsTrigger
            value="editor"
            className="flex-none rounded-sm data-active:bg-accent! data-active:text-accent-foreground! data-active:shadow-none! dark:data-active:border-transparent!"
          >
            Editor
          </TabsTrigger>
        </TabsList>
        <TabsContent value="toolbar" className="flex min-h-0 flex-col">
          <Palette />
        </TabsContent>
        <TabsContent value="editor" className="flex min-h-0 flex-col">
          <Inspector node={selected} />
        </TabsContent>
      </Tabs>
    </ResizablePanel>
  )
}