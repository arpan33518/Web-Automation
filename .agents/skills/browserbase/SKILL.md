---
name: browserbase
description: >
  Guides setup, authentication, and execution of Browserbase cloud browser infrastructure.
  Covers creating sessions, connecting via Playwright / CDP, using the browse CLI,
  and executing browser workflow steps (open-url, click, scrape, screenshot) within Trigger.dev tasks.
type: core
library: browserbase
---

# Browserbase Skill

Browserbase provides managed, cloud-hosted headless Chromium instances with built-in stealth proxies, captcha handling, session replays, and Live Debugger.

## 1. Credentials & Configuration

Set the following environment variables in `.env.local` and your production deployment:

```env
BROWSERBASE_API_KEY="bb_api_..."
BROWSERBASE_PROJECT_ID="proj_..."
```

- Get your API key and Project ID at: [https://browserbase.com/settings](https://browserbase.com/settings)

---

## 2. CLI Tool (`browse`)

The unified CLI for Browserbase is `browse`:

```bash
# Install browse CLI globally
npm install -g browse

# Or run via npx
npx browse --help
```

### Common Commands:
- `browse open <url>`: Opens a browser session navigating to the specified URL. Use `--local` for localhost testing.
- `browse click <selector>`: Clicks an element.
- `browse type <text>`: Inputs text into the active element.
- `browse snapshot`: Captures a clean DOM snapshot for LLMs / agents.
- `browse screenshot`: Saves a screenshot of the current page.
- `browse cloud sessions create`: Creates a remote session on Browserbase cloud.

---

## 3. Node.js / TypeScript SDK Setup

### Install Dependencies
```bash
npm install @browserbasehq/sdk playwright-core
```

### Connecting with Playwright in TypeScript

```typescript
import Browserbase from "@browserbasehq/sdk"
import { chromium } from "playwright-core"

// 1. Initialize Browserbase client
const bb = new Browserbase({
  apiKey: process.env.BROWSERBASE_API_KEY,
})

export async function runBrowserSession(url: string) {
  // 2. Create a remote browser session
  const session = await bb.sessions.create({
    projectId: process.env.BROWSERBASE_PROJECT_ID!,
  })

  console.log(`Live Debug URL: ${session.debugUrl}`)
  console.log(`Session Replay: https://browserbase.com/sessions/${session.id}`)

  // 3. Connect Playwright over CDP to the remote Chromium instance
  const browser = await chromium.connectOverCDP(session.connectUrl)
  const defaultContext = browser.contexts()[0]
  const page = defaultContext.pages()[0] || (await defaultContext.newPage())

  try {
    // 4. Perform browser automation
    await page.goto(url, { waitUntil: "domcontentloaded" })
    const title = await page.title()

    // Example screenshot
    const screenshot = await page.screenshot({ fullPage: true })

    return {
      title,
      sessionId: session.id,
      replayUrl: `https://browserbase.com/sessions/${session.id}`,
    }
  } finally {
    // 5. Close browser connection and end session
    await page.close()
    await browser.close()
  }
}
```

---

## 4. Trigger.dev Integration Pattern

When executing browser workflow steps inside Trigger.dev tasks (e.g. `runWorkflowTask`):

```typescript
import { task, logger } from "@trigger.dev/sdk"
import Browserbase from "@browserbasehq/sdk"
import { chromium } from "playwright-core"

export const runWorkflowTask = task({
  id: "run-workflow",
  run: async ({ workflowId, orgId }: { workflowId: string; orgId: string }) => {
    // Initialize Browserbase
    const bb = new Browserbase({ apiKey: process.env.BROWSERBASE_API_KEY })
    const session = await bb.sessions.create({
      projectId: process.env.BROWSERBASE_PROJECT_ID!,
    })

    logger.log("Browserbase session created", {
      sessionId: session.id,
      debugUrl: session.debugUrl,
    })

    const browser = await chromium.connectOverCDP(session.connectUrl)
    const page = (browser.contexts()[0]?.pages()[0]) ?? (await browser.newPage())

    try {
      // Execute steps...
      await page.goto("https://example.com")
      logger.log("Navigated successfully")
    } finally {
      await browser.close()
    }
  },
})
```
