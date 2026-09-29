"use client"

import * as React from "react"
import Hls from "hls.js"
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Copy,
  ExternalLink,
  Film,
  Loader2,
  Maximize2,
  Play,
  RotateCcw,
} from "lucide-react"
import { toast } from "sonner"

import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

export interface SessionReplayProps {
  sessionId?: string | null
  className?: string
  autoPlay?: boolean
  pollIntervalMs?: number
  maxPollAttempts?: number
  title?: string
  onReady?: () => void
  onError?: (error: string) => void
}

type ReplayStatus = "idle" | "polling" | "ready" | "error"

export function SessionReplay({
  sessionId,
  className,
  autoPlay = false,
  pollIntervalMs = 2500,
  maxPollAttempts = 48, // ~2 minutes with 2.5s interval
  title = "Session Replay",
  onReady,
  onError,
}: SessionReplayProps) {
  const [status, setStatus] = React.useState<ReplayStatus>("idle")
  const [attempts, setAttempts] = React.useState<number>(0)
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null)
  const [copiedSessionId, setCopiedSessionId] = React.useState<boolean>(false)

  const videoRef = React.useRef<HTMLVideoElement | null>(null)
  const hlsRef = React.useRef<Hls | null>(null)
  const pollTimerRef = React.useRef<NodeJS.Timeout | null>(null)
  const isMountedRef = React.useRef<boolean>(true)

  // Clean up any active HLS instance
  const destroyHls = React.useCallback(() => {
    if (hlsRef.current) {
      hlsRef.current.destroy()
      hlsRef.current = null
    }
  }, [])

  // Clean up timers
  const clearPollTimer = React.useCallback(() => {
    if (pollTimerRef.current) {
      clearTimeout(pollTimerRef.current)
      pollTimerRef.current = null
    }
  }, [])

  // Initialize playback once 200 OK is verified
  const setupPlayer = React.useCallback(
    (sid: string) => {
      destroyHls()
      const video = videoRef.current
      if (!video) return

      const streamUrl = `/api/replays/${encodeURIComponent(sid)}`

      if (Hls.isSupported()) {
        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: false,
          maxBufferLength: 30,
        })
        hlsRef.current = hls

        hls.loadSource(streamUrl)
        hls.attachMedia(video)

        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          if (!isMountedRef.current) return
          setStatus("ready")
          onReady?.()
          if (autoPlay) {
            video.play().catch(() => {
              // Autoplay policy prevented playback
            })
          }
        })

        hls.on(Hls.Events.ERROR, (_event, data) => {
          if (data.fatal) {
            switch (data.type) {
              case Hls.ErrorTypes.NETWORK_ERROR:
                hls.startLoad()
                break
              case Hls.ErrorTypes.MEDIA_ERROR:
                hls.recoverMediaError()
                break
              default:
                destroyHls()
                if (isMountedRef.current) {
                  setStatus("error")
                  const errText = "Fatal video decoding or network error"
                  setErrorMessage(errText)
                  onError?.(errText)
                }
                break
            }
          }
        })
      } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
        // Native HLS support (Safari / iOS)
        video.src = streamUrl
        video.addEventListener("loadedmetadata", () => {
          if (!isMountedRef.current) return
          setStatus("ready")
          onReady?.()
          if (autoPlay) {
            video.play().catch(() => {})
          }
        })
      } else {
        setStatus("error")
        const errText = "Your browser does not support HLS video playback."
        setErrorMessage(errText)
        onError?.(errText)
      }
    },
    [autoPlay, destroyHls, onError, onReady]
  )

  // Polling runner
  const startPolling = React.useCallback(
    (sid: string) => {
      clearPollTimer()
      destroyHls()
      setStatus("polling")
      setAttempts(0)
      setErrorMessage(null)

      let currentAttempts = 0

      const checkReplayReady = async () => {
        if (!isMountedRef.current) return

        currentAttempts += 1
        setAttempts(currentAttempts)

        try {
          const res = await fetch(`/api/replays/${encodeURIComponent(sid)}`, {
            method: "GET",
            cache: "no-store",
          })

          if (!isMountedRef.current) return

          if (res.ok) {
            // Replay playlist is ready!
            setupPlayer(sid)
            return
          }

          if (res.status === 401) {
            setStatus("error")
            const msg = "Unauthorized: sign in to view this session replay."
            setErrorMessage(msg)
            onError?.(msg)
            return
          }

          // Browserbase returns a not-ready status (e.g. 404, 202, 425) while assembling
          if (currentAttempts >= maxPollAttempts) {
            setStatus("error")
            const msg =
              "The session recording took too long to prepare or was not found."
            setErrorMessage(msg)
            onError?.(msg)
            return
          }

          // Schedule next poll
          pollTimerRef.current = setTimeout(checkReplayReady, pollIntervalMs)
        } catch (err: any) {
          if (!isMountedRef.current) return
          if (currentAttempts >= maxPollAttempts) {
            setStatus("error")
            const msg = err?.message || "Failed to poll session replay"
            setErrorMessage(msg)
            onError?.(msg)
          } else {
            pollTimerRef.current = setTimeout(checkReplayReady, pollIntervalMs)
          }
        }
      }

      checkReplayReady()
    },
    [
      clearPollTimer,
      destroyHls,
      maxPollAttempts,
      onError,
      pollIntervalMs,
      setupPlayer,
    ]
  )

  // Track mount state & trigger polling when sessionId changes
  React.useEffect(() => {
    isMountedRef.current = true

    if (sessionId) {
      startPolling(sessionId)
    } else {
      clearPollTimer()
      destroyHls()
      setStatus("idle")
      setErrorMessage(null)
    }

    return () => {
      isMountedRef.current = false
      clearPollTimer()
      destroyHls()
    }
  }, [sessionId, startPolling, clearPollTimer, destroyHls])

  const copySessionId = () => {
    if (!sessionId) return
    navigator.clipboard.writeText(sessionId)
    setCopiedSessionId(true)
    toast.success("Session ID copied")
    setTimeout(() => setCopiedSessionId(false), 2000)
  }

  const handleRetry = () => {
    if (sessionId) {
      startPolling(sessionId)
    }
  }

  const handleToggleFullscreen = () => {
    if (!videoRef.current) return
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {})
    } else {
      videoRef.current.requestFullscreen().catch(() => {})
    }
  }

  return (
    <div
      className={cn(
        "flex flex-col overflow-hidden rounded-lg border border-border/80 bg-zinc-950 text-foreground shadow-md",
        className
      )}
    >
      {/* Top Header */}
      <div className="flex h-10 shrink-0 items-center justify-between border-b border-border/60 bg-zinc-900/60 px-3 text-xs">
        <div className="flex min-w-0 items-center gap-2">
          <Film className="size-4 shrink-0 text-sky-400" />
          <span className="truncate font-semibold text-zinc-100">{title}</span>

          {status === "polling" && (
            <Badge
              variant="outline"
              className="flex items-center gap-1 border-amber-500/30 bg-amber-500/10 px-1.5 py-0 text-[10px] font-semibold text-amber-400"
            >
              <Loader2 className="size-2.5 animate-spin" />
              <span>Processing Replay</span>
            </Badge>
          )}

          {status === "ready" && (
            <Badge
              variant="outline"
              className="flex items-center gap-1 border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0 text-[10px] font-semibold text-emerald-400"
            >
              <CheckCircle2 className="size-2.5" />
              <span>Ready</span>
            </Badge>
          )}

          {status === "error" && (
            <Badge
              variant="outline"
              className="flex items-center gap-1 border-rose-500/30 bg-rose-500/10 px-1.5 py-0 text-[10px] font-semibold text-rose-400"
            >
              <AlertCircle className="size-2.5" />
              <span>Not Ready</span>
            </Badge>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          {sessionId && (
            <button
              type="button"
              onClick={copySessionId}
              className="flex items-center gap-1 rounded bg-zinc-800/80 px-1.5 py-0.5 font-mono text-[10px] text-zinc-300 transition-colors hover:bg-zinc-800"
              title="Click to copy Session ID"
            >
              <span>{sessionId.slice(0, 10)}...</span>
              {copiedSessionId ? (
                <Check className="size-2.5 text-emerald-400" />
              ) : (
                <Copy className="size-2.5 text-zinc-400" />
              )}
            </button>
          )}

          {sessionId && (
            <a
              href={`https://browserbase.com/sessions/${sessionId}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 rounded p-1 text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-200"
              title="Open in Browserbase Dashboard"
            >
              <ExternalLink className="size-3" />
            </a>
          )}

          <Button
            variant="ghost"
            size="xs"
            onClick={handleRetry}
            disabled={!sessionId || status === "polling"}
            className="size-7 p-0 text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-100"
            title="Reload replay stream"
          >
            <RotateCcw
              className={cn("size-3.5", status === "polling" && "animate-spin")}
            />
          </Button>

          {status === "ready" && (
            <Button
              variant="ghost"
              size="xs"
              onClick={handleToggleFullscreen}
              className="size-7 p-0 text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-100"
              title="Fullscreen"
            >
              <Maximize2 className="size-3.5" />
            </Button>
          )}
        </div>
      </div>

      {/* Main Video Area */}
      <div className="relative flex aspect-video w-full items-center justify-center overflow-hidden bg-black">
        {/* Video element is always rendered so refs are intact */}
        <video
          ref={videoRef}
          controls
          playsInline
          className={cn(
            "size-full object-contain transition-opacity duration-300",
            status === "ready" ? "opacity-100" : "pointer-events-none opacity-0"
          )}
        />

        {/* Polling overlay */}
        {status === "polling" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-950/90 p-6 text-center backdrop-blur-xs">
            <div className="relative mb-3 flex items-center justify-center">
              <div className="absolute size-14 animate-ping rounded-full bg-sky-500/15 duration-1000" />
              <div className="relative flex size-12 items-center justify-center rounded-full border border-sky-500/30 bg-sky-500/10 text-sky-400 shadow-inner">
                <Loader2 className="size-6 animate-spin text-sky-400" />
              </div>
            </div>

            <p className="text-sm font-semibold text-zinc-100">
              Assembling Session Replay...
            </p>
            <p className="mt-1 max-w-sm text-xs text-zinc-400">
              Browserbase encodes HLS video shortly after session closure.
              Polling for ready status (attempt {attempts} of {maxPollAttempts}
              ).
            </p>

            <div className="mt-4 flex items-center gap-2">
              <span className="inline-block size-2 animate-pulse rounded-full bg-amber-400" />
              <span className="font-mono text-[11px] text-zinc-500">
                Polling endpoint /api/replays/{sessionId?.slice(0, 8)}...
              </span>
            </div>
          </div>
        )}

        {/* Error overlay */}
        {status === "error" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-950/95 p-6 text-center">
            <div className="mb-3 flex size-10 items-center justify-center rounded-full border border-rose-500/30 bg-rose-500/10 text-rose-400">
              <AlertCircle className="size-5" />
            </div>

            <p className="text-xs font-semibold text-rose-300">
              Session Replay Not Ready
            </p>
            <p className="mt-1 max-w-sm text-[11px] text-zinc-400">
              {errorMessage ||
                "The recording is not ready yet or was not found in Browserbase."}
            </p>

            <div className="mt-4 flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRetry}
                className="h-7 gap-1.5 border-zinc-700 bg-zinc-900 text-xs text-zinc-200 hover:bg-zinc-800"
              >
                <RotateCcw className="size-3" />
                <span>Try Again</span>
              </Button>

              {sessionId && (
                <Button
                  variant="ghost"
                  size="sm"
                  asChild
                  className="h-7 gap-1.5 text-xs text-zinc-400 hover:text-zinc-200"
                >
                  <a
                    href={`https://browserbase.com/sessions/${sessionId}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <span>View in Dashboard</span>
                    <ExternalLink className="size-3" />
                  </a>
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Idle overlay */}
        {status === "idle" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-950/90 p-6 text-center text-zinc-500">
            <Film className="mb-2 size-8 text-zinc-600" />
            <p className="text-xs font-medium text-zinc-300">
              No Session Selected
            </p>
            <p className="mt-0.5 text-[11px] text-zinc-500">
              Select or run a workflow with Browserbase to stream its session
              replay.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
