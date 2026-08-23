import { OrganizationList } from "@clerk/nextjs"
import { auth } from "@clerk/nextjs/server"

export default async function ChooseOrganizationPage() {
  await auth.protect()

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="w-full max-w-xl flex justify-center">
        <OrganizationList
          hidePersonal
          afterCreateOrganizationUrl="/"
          afterSelectOrganizationUrl="/"
        />
      </div>
    </div>
  )
}
