import { auth } from "@clerk/nextjs/server"

export default async function TestPage() {
  // Enforce authentication at the page level.
  // If the user is logged out, this will automatically redirect them to the sign-in page.
  await auth.protect()

  return (
    <div className="flex min-h-[calc(100vh-64px)] flex-col items-center justify-center p-6 text-center">
      <div className="max-w-md space-y-4 rounded-xl border bg-card p-8 shadow-sm">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Protected Test Page</h1>
        <p className="text-muted-foreground">
          If you are reading this, the authentication redirect and middleware are working perfectly. This route is fully protected.
        </p>
        <div className="inline-flex items-center rounded-full bg-emerald-500/10 px-3 py-1 text-sm font-medium text-emerald-500">
          ● Protected Route Accessible
        </div>
      </div>
    </div>
  )
}
