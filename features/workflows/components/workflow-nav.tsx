"use client"

import * as React from "react"
import { Workflow } from "lucide-react"
import { cn } from "@/lib/utils"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"

const dummyWorkflows = [
  { id: "dominant-wasp", name: "dominant-wasp", active: true },
  { id: "honest-reindeer", name: "honest-reindeer", active: false },
  { id: "expected-llama", name: "expected-llama", active: false },
  { id: "essential-ocelot", name: "essential-ocelot", active: false },
  { id: "creepy-echidna", name: "creepy-echidna", active: false },
  { id: "eastern-silkworm", name: "eastern-silkworm", active: false },
  { id: "cultural-lion", name: "cultural-lion", active: false },
  { id: "proud-weasel", name: "proud-weasel", active: false },
  { id: "regional-bonobo", name: "regional-bonobo", active: false },
]

export function WorkflowNav() {
  const [activeWorkflowId, setActiveWorkflowId] = React.useState<string>("dominant-wasp")
  const { state } = useSidebar()
  const [popoverOpen, setPopoverOpen] = React.useState(false)

  if (state === "collapsed") {
    return (
      /* Collapsed view items (only visible when collapsed) */
      <div className="flex flex-col gap-2">
        <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
          <PopoverTrigger asChild>
            <SidebarMenuItem className="flex justify-center">
              <SidebarMenuButton
                tooltip="Workflows"
                className={cn(
                  "size-10 flex items-center justify-center rounded-lg transition-all duration-200 hover:scale-[1.05] active:scale-[0.95] text-sidebar-foreground bg-sidebar-accent text-sidebar-accent-foreground"
                )}
              >
                <Workflow className="size-5 shrink-0" />
              </SidebarMenuButton>
            </SidebarMenuItem>
          </PopoverTrigger>
          <PopoverContent
            side="right"
            align="start"
            sideOffset={12}
            className="w-56 p-2 bg-zinc-950/95 border border-zinc-800/60 rounded-xl shadow-xl flex flex-col gap-1 backdrop-blur-md text-sidebar-foreground no-scrollbar"
          >
            <div className="text-xs font-semibold text-sidebar-foreground/60 px-2 py-1.5 border-b border-zinc-800/40 mb-1 flex justify-between items-center">
              <span>Workflows</span>
              <span className="text-[9px] bg-zinc-850 text-zinc-400 px-1.5 py-0.5 rounded-full font-medium">
                {dummyWorkflows.length} total
              </span>
            </div>
            <div className="flex flex-col gap-1 max-h-64 overflow-y-auto no-scrollbar">
              {dummyWorkflows.map((flow) => (
                <button
                  key={flow.id}
                  onClick={() => {
                    setActiveWorkflowId(flow.id)
                    setPopoverOpen(false)
                  }}
                  className={cn(
                    "w-full text-left py-2 px-2.5 rounded-lg text-xs transition-all duration-150 cursor-pointer flex items-center justify-between",
                    activeWorkflowId === flow.id
                      ? "bg-zinc-850 text-zinc-100 font-medium shadow-sm"
                      : "text-zinc-400 hover:bg-zinc-900/50 hover:text-zinc-200"
                  )}
                >
                  <span className="truncate max-w-[140px]">{flow.name}</span>
                  {activeWorkflowId === flow.id && (
                    <span className="size-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]" />
                  )}
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      </div>
    )
  }

  return (
    /* Expanded view items (only visible when expanded) */
    <div className="flex flex-col gap-1">
      {dummyWorkflows.map((flow) => (
        <SidebarMenuItem key={flow.id}>
          <SidebarMenuButton
            isActive={activeWorkflowId === flow.id}
            onClick={() => setActiveWorkflowId(flow.id)}
            className={cn(
              "w-full text-left py-2 px-3 rounded-lg text-sm transition-all duration-200 h-9 hover:scale-[1.03] active:scale-[0.97] hover:shadow-sm origin-left",
              activeWorkflowId === flow.id
                ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            )}
          >
            <span>{flow.name}</span>
          </SidebarMenuButton>
        </SidebarMenuItem>
      ))}
    </div>
  )
}
