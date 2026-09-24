import { ReactFlowProvider } from "@xyflow/react"
import { Room } from "@/features/workflows/components/room"
import { WorkflowRunsProvider } from "@/features/workflows/components/workflow-runs-provider"
import { WorkflowShell } from "@/features/workflows/components/workflow-shell"
import { getWorkflow } from "@/features/workflows/data"
import { ensureWorkflowRoom } from "@/lib/liveblocks"
import { auth } from "@clerk/nextjs/server"
import { auth as triggerAuth } from "@trigger.dev/sdk"

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

  // Mint a read-only public token scoped to this workflow's run tag, valid for ~1 hour
  let publicAccessToken: string | null = null
  try {
    publicAccessToken = await triggerAuth.createPublicToken({
      scopes: {
        read: {
          tags: [`workflow:${id}`],
        },
      },
      expirationTime: "1h",
    })
  } catch (err) {
    console.error(`Failed to create Trigger.dev public token for workflow ${id}:`, err)
  }

  return (
    <ReactFlowProvider>
      <Room roomId={id}>
        <WorkflowRunsProvider
          workflowId={id}
          publicAccessToken={publicAccessToken}
        >
          <WorkflowShell
            workflowId={id}
            initialGraph={workflow?.graph ?? undefined}
          />
        </WorkflowRunsProvider>
      </Room>
    </ReactFlowProvider>
  )
}

