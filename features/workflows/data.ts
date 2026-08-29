import { desc, eq } from "drizzle-orm"

import { db } from "@/lib/db"
import { workflows } from "@/lib/db/schema"

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