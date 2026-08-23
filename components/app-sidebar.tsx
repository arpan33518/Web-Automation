import * as React from "react"
import { OrganizationSwitcher, UserButton } from "@clerk/nextjs"
import { Plus } from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarTrigger,
} from "@/components/ui/sidebar"

import { WorkflowNav } from "@/features/workflows/components/workflow-nav"

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar variant="inset" collapsible="icon" className="border-r-0" {...props}>
      {/* Sidebar Header */}
      <SidebarHeader className="flex flex-row items-center justify-between p-4 h-16 border-b border-zinc-800/40 gap-2">
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
                organizationPreviewTextContainer: "text-sidebar-foreground font-medium",
              },
            }}
          />
        </div>
        <div className="flex items-center justify-center group-data-[state=collapsed]:w-full">
          <SidebarTrigger className="text-sidebar-foreground hover:bg-sidebar-accent transition-colors" />
        </div>
      </SidebarHeader>

      {/* Sidebar Content */}
      <SidebarContent className="p-2">
        <SidebarGroup>
          {/* Expanded Header Label */}
          <SidebarGroupLabel className="group-data-[state=collapsed]:hidden text-sm font-medium text-sidebar-foreground/75 px-2 flex items-center justify-between w-full h-8">
            <span>Workflows</span>
            <button className="text-sidebar-foreground hover:bg-sidebar-accent rounded-md p-1 transition-colors flex items-center justify-center size-6">
              <Plus className="size-4" />
            </button>
          </SidebarGroupLabel>

          <SidebarGroupContent className="mt-2">
            <SidebarMenu>
              <WorkflowNav />
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* Sidebar Footer */}
      <SidebarFooter className="p-4 flex items-start justify-center border-t border-zinc-800/40 h-16 group-data-[state=collapsed]:items-center">
        <UserButton
          appearance={{
            elements: {
              rootBox: "flex items-center justify-start group-data-[state=collapsed]:justify-center",
              userButtonAvatarBox: "size-8",
              userButtonTrigger: "focus:shadow-none focus:outline-none focus:ring-0",
            },
          }}
        />
      </SidebarFooter>
    </Sidebar>
  )
}
