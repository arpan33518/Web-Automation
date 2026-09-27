import type { Stagehand } from "@browserbasehq/stagehand"
import { z } from "zod/v4"

export interface ExtractParams {
  stagehand: Stagehand
  instruction: string
}

export async function extract({ stagehand, instruction }: ExtractParams) {
  if (!instruction || !instruction.trim()) {
    throw new Error("Extract node requires a non-empty instruction")
  }

  let extractResult: any = null

  try {
    extractResult = await stagehand.extract(
      instruction,
      z.object({
        data: z.any().describe("The extracted data, values, or text matching the instruction"),
      })
    )
  } catch {
    extractResult = await (stagehand as any).extract(instruction)
  }

  const rawData = extractResult?.data
  const extraction =
    typeof rawData === "string"
      ? rawData
      : (rawData as any)?.data ??
        (rawData as any)?.extraction ??
        (typeof rawData === "object" && rawData !== null
          ? JSON.stringify(rawData)
          : String(rawData ?? ""))

  return {
    result: extraction,
    extraction,
    data: rawData ?? extraction,
  }
}
