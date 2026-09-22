declare global {
  interface Liveblocks {
    UserMeta: {
      id: string
      info: {
        name: string
        avatar?: string
        color?: string
      }
    }
    Storage: {
      flow?: any
      lastRun?: {
        runId: string | null
        status: string
        isCompleted: boolean
        isExecuting: boolean
        isQueued: boolean
        createdAt: string | null
        startedAt: string | null
        finishedAt: string | null
        durationMs: number | null
        error: string | null
        output: any
        nodesCount?: number
        edgesCount?: number
      }
    }
  }
}

export { }

