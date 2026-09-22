import toposort from "toposort"

import type { WorkflowGraph } from "@/lib/db/schema"

export function validateGraph({ nodes, edges }: WorkflowGraph): string[] {
  const problems: string[] = []

  const triggers = nodes.filter((n) => n.data?.kind === "trigger").length
  if (triggers !== 1) {
    problems.push(`A workflow needs exactly one Start trigger (found ${triggers}).`)
  }

  // The runner only executes nodes touching an edge, so with none Run is a no-op.
  if (edges.length === 0) {
    problems.push("Connect your nodes before running.")
  } else {
    try {
      // toposort throws on a cycle — the run would otherwise fail mid-sort.
      toposort(edges.map((e) => [e.source, e.target]))
    } catch {
      problems.push("Workflow has a cycle — remove the loop before running.")
    }
  }

  return problems
}
