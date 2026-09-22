import { ReactFlowProvider } from "@xyflow/react"
import { Room } from "@/features/workflows/components/room"
import { WorkflowShell } from "@/features/workflows/components/workflow-shell"
import { getWorkflow } from "@/features/workflows/data"
import { ensureWorkflowRoom } from "@/lib/liveblocks"
import { auth } from "@clerk/nextjs/server"

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function WorkflowPage({ params }: PageProps) {
  const { id } = await params
  const { orgId } = await auth()
  if (!orgId) {
    return <div>No organization</div>
  }

  const workflow = await getWorkflow(orgId, id)

  // Ensure Liveblocks room exists for this workflow
  try {
    await ensureWorkflowRoom(id, orgId)
  } catch (err) {
    console.error(`Failed to ensure Liveblocks room for ${id}:`, err)
  }

  return (
    <ReactFlowProvider>
      <Room roomId={id}>
        <WorkflowShell
          workflowId={id}
          initialGraph={workflow?.graph ?? undefined}
        />
      </Room>
    </ReactFlowProvider>
  )
}

