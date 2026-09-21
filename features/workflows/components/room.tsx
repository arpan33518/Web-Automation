"use client";

import { ReactNode } from "react";
import {
    LiveblocksProvider,
    RoomProvider,
} from "@liveblocks/react";

export function Room({ children, roomId }: { children: ReactNode, roomId: string }) {
    return (
        <LiveblocksProvider
            throttle={16}
            authEndpoint="/api/liveblocks/auth"
            resolveUsers={async ({ userIds }) => {
                const response = await fetch("/api/liveblocks/users", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({ userIds }),
                });

                if (!response.ok) {
                    return undefined;
                }

                return await response.json();
            }}
        >
            <RoomProvider id={roomId}>
                {children}
            </RoomProvider>
        </LiveblocksProvider>
    );
}