import { Liveblocks } from "@liveblocks/node"

export const liveblocks = new Liveblocks({
  secret: process.env.LIVEBLOCKS_SECRET_KEY!,
})

const ensuredRooms = new Set<string>()

export function markRoomEnsured(roomId: string) {
  ensuredRooms.add(roomId)
}

export async function ensureWorkflowRoom(roomId: string, orgId: string) {
  if (ensuredRooms.has(roomId)) {
    return
  }

  try {
    await liveblocks.getOrCreateRoom(roomId, {
      organizationId: orgId,
      defaultAccesses: [],
      groupsAccesses: {
        [orgId]: ["room:write"],
      },
    })
    ensuredRooms.add(roomId)
  } catch (error) {
    console.error(`Failed to ensure Liveblocks room for ${roomId}:`, error)
  }
}
