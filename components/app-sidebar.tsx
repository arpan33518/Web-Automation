import * as React from "react"
import { OrganizationSwitcher, UserButton } from "@clerk/nextjs"
import { auth } from "@clerk/nextjs/server"
import Link from "next/link"
import { CreditCard, Plus } from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { listWorkflows } from "@/features/workflows/data"
import { createWorkflowAction } from "@/features/workflows/actions"
import { generateSlug } from "@/features/workflows/lib/generate-slug"
import { WorkflowNav } from "@/features/workflows/components/workflow-nav"

export async function AppSidebar({
  ...props
}: React.ComponentProps<typeof Sidebar>) {
  const { orgId } = await auth()
  const workflows = orgId ? await listWorkflows(orgId) : []

  return (
    <Sidebar
      variant="inset"
      collapsible="icon"
      className="border-r-0"
      {...props}
    >
      {/* Sidebar Header */}
      <SidebarHeader className="flex h-16 flex-row items-center justify-between gap-2 border-b border-zinc-800/40 p-4">
        <div className="flex items-center gap-2 overflow-hidden transition-all duration-200 group-data-[state=collapsed]:hidden">
          <OrganizationSwitcher
            hidePersonal
            afterCreateOrganizationUrl="/"
            afterSelectOrganizationUrl="/"
            afterLeaveOrganizationUrl="/"
            appearance={{
              elements: {
                rootBox: "w-full max-w-[180px]",
                organizationSwitcherTrigger:
                  "py-1 px-2 w-full hover:bg-sidebar-accent hover:text-sidebar-accent-foreground text-sidebar-foreground transition-colors rounded-lg border-0",
                organizationPreview: "text-sidebar-foreground",
                organizationPreviewTextContainer:
                  "text-sidebar-foreground font-medium",
              },
            }}
          />
        </div>
        <div className="flex items-center justify-center group-data-[state=collapsed]:w-full">
          <SidebarTrigger className="text-sidebar-foreground transition-colors hover:bg-sidebar-accent" />
        </div>
      </SidebarHeader>

      {/* Sidebar Content */}
      <SidebarContent className="p-2">
        <SidebarGroup>
          {/* Expanded Header Label */}
          <SidebarGroupLabel className="flex h-8 w-full items-center justify-between px-2 text-sm font-medium text-sidebar-foreground/75 group-data-[state=collapsed]:hidden">
            <span>Workflows</span>
            <form
              action={async () => {
                "use server"
                await createWorkflowAction(generateSlug())
              }}
            >
              <button
                type="submit"
                className="flex size-6 cursor-pointer items-center justify-center rounded-md p-1 text-sidebar-foreground transition-colors hover:bg-sidebar-accent"
              >
                <Plus className="size-4" />
              </button>
            </form>
          </SidebarGroupLabel>

          <SidebarGroupContent className="mt-2">
            <SidebarMenu>
              <WorkflowNav
                workflows={workflows}
                createWorkflowAction={createWorkflowAction}
              />
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* Sidebar Footer */}
      <SidebarFooter className="flex flex-col gap-2 border-t border-zinc-800/40 p-3 group-data-[state=collapsed]:p-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip="Pricing & Plans">
              <Link href="/pricing" className="flex items-center gap-2">
                <CreditCard className="size-4" />
                <span className="text-xs group-data-[state=collapsed]:hidden">
                  Pricing & Plans
                </span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        <div className="flex items-center justify-start px-1 group-data-[state=collapsed]:justify-center">
          <UserButton
            appearance={{
              elements: {
                rootBox:
                  "flex items-center justify-start group-data-[state=collapsed]:justify-center",
                userButtonAvatarBox: "size-8",
                userButtonTrigger:
                  "focus:shadow-none focus:outline-none focus:ring-0",
              },
            }}
          />
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}
