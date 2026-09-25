import type { Stagehand } from "@browserbasehq/stagehand"

export interface AgentParams {
  stagehand: Stagehand
  instruction: string
}

export async function agent({ stagehand, instruction }: AgentParams) {
  if (!instruction || !instruction.trim()) {
    throw new Error("Agent node requires a non-empty instruction")
  }

  let result: any = null

  if (typeof (stagehand as any).agent === "function") {
    const operator = (stagehand as any).agent()
    if (typeof operator.execute === "function") {
      try {
        result = await operator.execute(instruction)
      } catch {
        result = await operator.execute({ instruction })
      }
    } else if (typeof operator === "function") {
      result = await operator(instruction)
    }
  }

  // Fallback if .agent() is not directly exposed on this SDK build
  if (!result) {
    const actResult = await stagehand.act(instruction)
    result = {
      success: actResult?.data?.success ?? true,
      completed: true,
      message: actResult?.data?.message || "Task completed",
    }
  }

  const success = Boolean(result?.success ?? true)
  const completed = Boolean(result?.completed ?? true)
  const message =
    result?.message ||
    (success ? "Agent task completed successfully" : "Agent task ended")

  return {
    success,
    completed,
    message,
    actions: result?.actions,
  }
}
