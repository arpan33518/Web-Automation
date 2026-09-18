import { logger, task } from "@trigger.dev/sdk"

export const exampleTask = task({
  id: "example-task",
  run: async (payload: { message?: string } = {}) => {
    logger.log("Running example task", { payload })

    return {
      message: payload.message ?? "Hello from Trigger.dev!",
    }
  },
})
