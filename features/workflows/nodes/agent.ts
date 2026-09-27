import type { Stagehand } from "@browserbasehq/stagehand"

export interface AgentParams {
  stagehand: Stagehand
  instruction: string
}

/**
 * Attempts to decompose a multi-step user instruction into atomic actions using
 * Neon AI Gateway or OpenAI if configured, falling back to smart heuristic parsing.
 */
async function decomposeInstruction(instruction: string): Promise<string[]> {
  const trimmed = instruction.trim()

  // 1. Try Neon AI Gateway or OpenAI if available
  const gatewayUrl = process.env.NEON_AI_GATEWAY_BASE_URL
  const gatewayToken = process.env.NEON_AI_GATEWAY_TOKEN
  const openAiKey = process.env.OPENAI_API_KEY

  if ((gatewayUrl && gatewayToken) || openAiKey) {
    try {
      const endpoint = gatewayUrl
        ? `${gatewayUrl.replace(/\/+$/, "")}/v1/chat/completions`
        : "https://api.openai.com/v1/chat/completions"
      const authHeader = gatewayToken ? `Bearer ${gatewayToken}` : `Bearer ${openAiKey}`

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 8000)

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: authHeader,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content:
                'You are a browser automation planner. Decompose the user request into an ordered JSON array of short, atomic browser actions that can each be passed to stagehand.act(). Example atomic actions: "Click the login link", "Type \\"admin\\" into the username input", "Type \\"admin\\" into the password input", "Click the login button", "Click on the first author". Return ONLY a raw JSON array of strings, nothing else.',
            },
            {
              role: "user",
              content: trimmed,
            },
          ],
          temperature: 0.1,
        }),
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (response.ok) {
        const data = await response.json()
        const content = data?.choices?.[0]?.message?.content?.trim()
        if (content) {
          const cleaned = content.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "")
          const parsed = JSON.parse(cleaned)
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed.map((s) => String(s).trim()).filter(Boolean)
          }
        }
      }
    } catch {
      // Fallback cleanly to heuristic decomposition
    }
  }

  // 2. Heuristic Decomposition
  const atomicSteps: string[] = []

  // Check for common "login with username X and password Y" pattern
  const loginMatch = trimmed.match(
    /login\s+(?:with\s+)?(?:username|user|email)?\s*[:=]?\s*["']?([^"'\s]+)["']?\s*(?:and)?\s*password\s*[:=]?\s*["']?([^"'\s]+)["']?(?:[,\s]+(.*))?$/i
  )

  if (loginMatch) {
    const username = loginMatch[1]
    const password = loginMatch[2]
    const remainder = loginMatch[3]?.trim()

    atomicSteps.push("Click the login link or button")
    atomicSteps.push(`Type "${username}" into the username or email field`)
    atomicSteps.push(`Type "${password}" into the password field`)
    atomicSteps.push("Click the login or submit button")

    if (remainder) {
      atomicSteps.push(...(await decomposeInstruction(remainder)))
    }
    return atomicSteps
  }

  // Split on newlines, numbered lists, or sequence connectors ("then", "and then", "after that")
  const rawParts = trimmed
    .split(/\r?\n|(?:\s+(?:and\s+then|then|after\s+that)\s+)|(?:\s*;\s*)/i)
    .map((p) => p.replace(/^\d+[\.\)]\s*/, "").trim())
    .filter(Boolean)

  if (rawParts.length > 1) {
    for (const part of rawParts) {
      atomicSteps.push(...(await decomposeInstruction(part)))
    }
    return atomicSteps
  }

  return [trimmed]
}

export async function agent({ stagehand, instruction }: AgentParams) {
  if (!instruction || !instruction.trim()) {
    throw new Error("Agent node requires a non-empty instruction")
  }

  // Decompose instruction into atomic actions
  const steps = await decomposeInstruction(instruction)
  const executedSteps: Array<{ step: string; message?: string; success: boolean }> = []

  const context = (stagehand as any).context ?? stagehand.browser?.context
  let lastUrl = ""

  for (let i = 0; i < steps.length; i++) {
    const stepInstruction = steps[i]

    // Retry loop for rate-limit / transient errors
    const maxRetries = 3
    let lastErr: any = null

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const actResult = await stagehand.act(stepInstruction)
        const success = Boolean(actResult?.data?.success ?? true)
        const message = actResult?.data?.message || `Action ${i + 1} completed`

        executedSteps.push({
          step: stepInstruction,
          message,
          success,
        })

        lastErr = null
        break // success — exit retry loop
      } catch (err: any) {
        lastErr = err
        const msg = err?.message || String(err)
        const isRateLimit =
          msg.includes("rate") ||
          msg.includes("quota") ||
          msg.includes("429") ||
          msg.includes("Quota exceeded") ||
          msg.includes("RESOURCE_EXHAUSTED")

        if (isRateLimit && attempt < maxRetries) {
          // Parse retry delay from error if available, ensuring at least 15s to clear the RPM window
          const retryMatch = msg.match(/retry in ([\d.]+)s/i)
          const parsedSec = retryMatch ? Math.ceil(parseFloat(retryMatch[1])) : 0
          const waitSec = Math.max(parsedSec + 3, (attempt + 1) * 15)
          console.warn(
            `[agent] Rate limit hit on step ${i + 1}/${steps.length}. Pausing for ${waitSec}s to clear quota before retry ${attempt + 1}/${maxRetries}...`
          )
          await new Promise((resolve) => setTimeout(resolve, waitSec * 1000))
          continue
        }

        // Non-retryable error or max retries exceeded
        break
      }
    }

    if (lastErr) {
      const errorMsg = lastErr?.message || String(lastErr)
      executedSteps.push({
        step: stepInstruction,
        message: `Failed: ${errorMsg}`,
        success: false,
      })
      throw new Error(
        `Agent step ${i + 1}/${steps.length} ("${stepInstruction}") failed: ${errorMsg}`
      )
    }

    // Wait between steps to stay within free-tier rate limits (5 RPM)
    if (i < steps.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 5000))
    }
  }

  try {
    const pages = await context?.pages?.()
    if (pages && pages.length > 0) {
      lastUrl = pages[0].url()
    }
  } catch {
    // Ignore URL fetch failure
  }

  const allSuccess = executedSteps.every((s) => s.success)

  return {
    success: allSuccess,
    completed: true,
    totalSteps: steps.length,
    steps: executedSteps,
    message: `Agent completed ${steps.length} action(s) successfully`,
    url: lastUrl,
  }
}

