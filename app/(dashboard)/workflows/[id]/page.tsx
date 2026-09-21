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
  if (!workflow) {
    return <div>Workflow not found</div>
  }

  await ensureWorkflowRoom(id, orgId)

  return (
    <Room roomId={id}>
      <WorkflowShell workflowId={id} />
    </Room>
  )
}
