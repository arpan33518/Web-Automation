"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Plus, Workflow } from "lucide-react"

import { cn } from "@/lib/utils"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import type { Workflow as WorkflowType } from "@/lib/db/schema"
import { generateSlug } from "@/features/workflows/lib/generate-slug"

interface WorkflowNavProps {
  workflows: WorkflowType[]
  createWorkflowAction: (name: string) => Promise<void>
}

export function WorkflowNav({ workflows, createWorkflowAction }: WorkflowNavProps) {
  const pathname = usePathname()
  const { state } = useSidebar()
  const [popoverOpen, setPopoverOpen] = React.useState(false)
  const [isPending, startTransition] = React.useTransition()

  const handleCreateWorkflow = () => {
    const name = generateSlug()
    startTransition(async () => {
      await createWorkflowAction(name)
      setPopoverOpen(false)
    })
  }

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
            <button
              onClick={handleCreateWorkflow}
              disabled={isPending}
              className="w-full flex items-center gap-2 px-2.5 py-2 text-xs font-medium text-sidebar-foreground hover:bg-zinc-900/60 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
            >
              <Plus className="size-3.5" />
              <span>New workflow</span>
            </button>
            <div className="h-px bg-zinc-800/60 my-1" />
            <div className="flex flex-col gap-1 max-h-64 overflow-y-auto no-scrollbar">
              {workflows.map((flow) => {
                const isActive = pathname === `/workflows/${flow.id}`
                return (
                  <Link
                    key={flow.id}
                    href={`/workflows/${flow.id}`}
                    onClick={() => setPopoverOpen(false)}
                    className={cn(
                      "w-full text-left py-2 px-2.5 rounded-lg text-xs transition-all duration-150 cursor-pointer flex items-center justify-between",
                      isActive
                        ? "bg-zinc-850 text-zinc-100 font-medium shadow-sm"
                        : "text-zinc-400 hover:bg-zinc-900/50 hover:text-zinc-200"
                    )}
                  >
                    <span className="truncate max-w-[140px]">{flow.name}</span>
                    {isActive && (
                      <span className="size-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]" />
                    )}
                  </Link>
                )
              })}
              {workflows.length === 0 && (
                <div className="px-2 py-3 text-center text-xs text-zinc-500">
                  No workflows
                </div>
              )}
            </div>
          </PopoverContent>
        </Popover>
      </div>
    )
  }

  return (
    /* Expanded view items (only visible when expanded) */
    <div className="flex flex-col gap-1">
      {workflows.map((flow) => {
        const isActive = pathname === `/workflows/${flow.id}`
        return (
          <SidebarMenuItem key={flow.id}>
            <SidebarMenuButton
              asChild
              isActive={isActive}
              className={cn(
                "w-full text-left py-2 px-3 rounded-lg text-sm transition-all duration-200 h-9 hover:scale-[1.03] active:scale-[0.97] hover:shadow-sm origin-left",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                  : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}
            >
              <Link href={`/workflows/${flow.id}`}>
                <span>{flow.name}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        )
      })}
      {workflows.length === 0 && (
        <div className="px-3 py-2 text-xs text-zinc-500">
          No workflows yet
        </div>
      )}
    </div>
  )
}
