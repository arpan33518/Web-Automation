import type { Stagehand } from "@browserbasehq/stagehand"

export async function openUrl({
  stagehand,
  url,
}: {
  stagehand: Stagehand
  url: string
}) {
  const context = (stagehand as any).context ?? stagehand.browser.context
  const pages = await context.pages()
  const page = pages[0] ?? (await context.newPage())
  await page.goto(url, { waitUntil: "load" })
  return { url: page.url(), title: await page.title() }
}
