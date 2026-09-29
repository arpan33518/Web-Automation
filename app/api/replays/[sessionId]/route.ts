import { auth } from "@clerk/nextjs/server"
import Browserbase from "@browserbasehq/sdk"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { orgId } = await auth()
  if (!orgId) {
    return new Response("Unauthorized", { status: 401 })
  }

  const { sessionId } = await params
  if (!sessionId) {
    return new Response("Session ID is required", { status: 400 })
  }

  const apiKey = process.env.BROWSERBASE_API_KEY
  if (!apiKey) {
    return new Response("BROWSERBASE_API_KEY is not configured", {
      status: 500,
    })
  }

  const bb = new Browserbase({ apiKey })
  const url = new URL(request.url)
  const queryPageId = url.searchParams.get("pageId")

  try {
    // If client specifically requests session replay metadata (e.g. multi-tab list)
    if (url.searchParams.get("meta") === "true") {
      const meta = await bb.sessions.replays.retrieve(sessionId)
      return Response.json(meta)
    }

    let pageId = queryPageId
    if (!pageId) {
      const meta = await bb.sessions.replays.retrieve(sessionId)
      if (!meta.pages || meta.pages.length === 0) {
        return new Response("Replay not ready", { status: 404 })
      }
      pageId = meta.pages[0].pageId
    }

    const playlistResponse = await bb.sessions.replays.retrievePage(
      sessionId,
      pageId
    )
    const m3u8 = await playlistResponse.text()

    return new Response(m3u8, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.apple.mpegurl",
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
    })
  } catch (err: any) {
    const status = err?.status || err?.statusCode || 500
    const message = err?.message || "Failed to retrieve replay playlist"
    return new Response(message, { status })
  }
}
