import type { Stagehand } from "@browserbasehq/stagehand"

export interface ActParams {
  stagehand: Stagehand
  instruction: string
}

export async function act({ stagehand, instruction }: ActParams) {
  if (!instruction || !instruction.trim()) {
    throw new Error("Act node requires a non-empty instruction")
  }

  const actResult = await stagehand.act(instruction)

  const context = (stagehand as any).context ?? stagehand.browser.context
  const pages = await context.pages()
  const page = pages[0] ?? (await context.newPage())
  const url = page ? page.url() : ""

  const success = Boolean(actResult?.data?.success ?? true)
  const message =
    actResult?.data?.message ||
    (success ? "Action completed successfully" : "Action failed")

  return {
    worked: success,
    success,
    message,
    url,
  }
}
