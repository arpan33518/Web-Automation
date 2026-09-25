import type { Stagehand } from "@browserbasehq/stagehand"

export interface ObserveParams {
  stagehand: Stagehand
  instruction: string
}

export async function observe({ stagehand, instruction }: ObserveParams) {
  if (!instruction || !instruction.trim()) {
    throw new Error("Observe node requires a non-empty instruction")
  }

  const observeResult = await stagehand.observe(instruction)

  const matches = (observeResult?.data ?? []).map((action) => ({
    selector: action.selector,
    description: action.description,
    method: action.method,
    arguments: action.arguments,
  }))

  const firstMatch = matches[0]

  return {
    matches,
    selector: firstMatch?.selector ?? "",
    description: firstMatch?.description ?? "",
    count: matches.length,
  }
}
