import { and, desc, eq } from "drizzle-orm"

import { db } from "@/lib/db"
import { workflows, type WorkflowGraph } from "@/lib/db/schema"
import { validateGraph } from "@/features/workflows/lib/validate-graph"

export async function getWorkflow(orgId: string, id: string) {
    try {
        const [workflow] = await db
            .select()
            .from(workflows)
            .where(and(eq(workflows.orgId, orgId), eq(workflows.id, id)))

        if (workflow && workflow.graph && typeof workflow.graph === "string") {
            try {
                workflow.graph = JSON.parse(workflow.graph)
            } catch {
                // leave as is
            }
        }

        return workflow ?? null
    } catch (error) {
        console.error(`Database error fetching workflow ${id}:`, error)
        // Retry once in case of cold-start wake-up
        try {
            await new Promise((resolve) => setTimeout(resolve, 600))
            const [retryWorkflow] = await db
                .select()
                .from(workflows)
                .where(and(eq(workflows.orgId, orgId), eq(workflows.id, id)))

            if (retryWorkflow && retryWorkflow.graph && typeof retryWorkflow.graph === "string") {
                try {
                    retryWorkflow.graph = JSON.parse(retryWorkflow.graph)
                } catch {
                    // leave as is
                }
            }

            return retryWorkflow ?? null
        } catch (retryError) {
            console.error(`Retry fetching workflow ${id} failed:`, retryError)
            return null
        }
    }
}

export function listWorkflows(orgId: string) {
    return db
        .select()
        .from(workflows)
        .where(eq(workflows.orgId, orgId))
        .orderBy(desc(workflows.createdAt))
}

export async function createWorkflow({
    orgId,
    name,
}: {
    orgId: string
    name: string
}) {
    const [workflow] = await db
        .insert(workflows)
        .values({
            id: crypto.randomUUID(),
            orgId,
            name,
        })
        .returning()

    return workflow
}

export async function deleteWorkflow({
    orgId,
    id,
}: {
    orgId: string
    id: string
}) {
    const [workflow] = await db
        .delete(workflows)
        .where(and(eq(workflows.orgId, orgId), eq(workflows.id, id)))
        .returning()

    return workflow
}

export async function saveWorkflowGraph({
    orgId,
    id,
    graph,
}: {
    orgId: string
    id: string
    graph: WorkflowGraph
}) {
    const problems = validateGraph(graph)
    if (problems.length > 0) throw new Error(problems.join(" "))
    const graphString = typeof graph === "string" ? graph : JSON.stringify(graph)
    try {
        await db
            .update(workflows)
            .set({ graph: graphString as any, updatedAt: new Date() })
            .where(and(eq(workflows.id, id), eq(workflows.orgId, orgId)))
    } catch (error) {
        console.error(`Failed to save graph for workflow ${id}:`, error)
        try {
            await new Promise((resolve) => setTimeout(resolve, 500))
            await db
                .update(workflows)
                .set({ graph: graphString as any, updatedAt: new Date() })
                .where(and(eq(workflows.id, id), eq(workflows.orgId, orgId)))
        } catch (retryError) {
            console.error(`Retry saving graph for workflow ${id} failed:`, retryError)
        }
    }
}