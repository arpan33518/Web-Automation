import type { Stagehand } from "@browserbasehq/stagehand"

export interface ExtractParams {
  stagehand: Stagehand
  instruction: string
}

export async function extract({ stagehand, instruction }: ExtractParams) {
  if (!instruction || !instruction.trim()) {
    throw new Error("Extract node requires a non-empty instruction")
  }

  const extractResult = await stagehand.extract(instruction)

  const rawData = extractResult?.data
  const extraction =
    typeof rawData === "string"
      ? rawData
      : (rawData as any)?.extraction ??
        (typeof rawData === "object" && rawData !== null
          ? JSON.stringify(rawData)
          : String(rawData ?? ""))

  return {
    result: extraction,
    extraction,
    data: rawData ?? extraction,
  }
}
