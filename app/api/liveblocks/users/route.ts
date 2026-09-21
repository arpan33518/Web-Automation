import { auth, clerkClient } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"

import { getUserColor } from "@/lib/colors"

export async function POST(request: Request) {
  const { userId } = await auth()

  if (!userId) {
    return new Response("Unauthorized", { status: 401 })
  }

  try {
    const body = await request.json()
    const userIds: string[] = body?.userIds ?? []

    if (!Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json([])
    }

    const client = await clerkClient()
    const response = await client.users.getUserList({
      userId: userIds,
    })

    const userMap = new Map(
      response.data.map((user) => {
        const name =
          user.fullName ||
          [user.firstName, user.lastName].filter(Boolean).join(" ") ||
          user.username ||
          "Anonymous"

        return [
          user.id,
          {
            name,
            avatar: user.imageUrl,
            color: getUserColor(user.id),
          },
        ]
      })
    )

    const users = userIds.map((id) => userMap.get(id))

    return NextResponse.json(users)
  } catch (error) {
    console.error("Failed to resolve Liveblocks users:", error)
    return new Response("Internal Server Error", { status: 500 })
  }
}
