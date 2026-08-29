"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { auth } from "@clerk/nextjs/server"

import { createWorkflow } from "@/features/workflows/data"
import { generateSlug } from "@/features/workflows/lib/generate-slug"

export async function createWorkflowAction(name?: string) {
  const { orgId } = await auth()

  if (!orgId) {
    throw new Error("Organization ID is required")
  }

  const workflow = await createWorkflow({
    orgId,
    name: name || generateSlug(),
  })

  revalidatePath("/", "layout")
  redirect(`/workflows/${workflow.id}`)
}
