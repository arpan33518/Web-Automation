import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { TooltipProvider } from "@/components/ui/tooltip"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <TooltipProvider>
      <SidebarProvider className="h-screen overflow-hidden">
        <AppSidebar />
        <SidebarInset className="flex flex-col flex-1 h-[calc(100vh-16px)] my-2 mr-2 overflow-hidden rounded-2xl border border-white/10 md:peer-data-[variant=inset]:rounded-2xl md:peer-data-[variant=inset]:border md:peer-data-[variant=inset]:border-white/10">
          {children}
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  )
}
