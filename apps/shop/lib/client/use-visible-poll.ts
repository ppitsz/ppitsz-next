"use client"

import { useEffect, useRef } from "react"

/**
 * Runs `task` repeatedly while the page is visible: after `nextDelay(elapsed)`
 * ms each time, at once when the tab or phone screen comes back, and never
 * while hidden (no reads wasted on a phone in a pocket). `nextDelay` returns
 * null to stop; pass a module-level function, since a new one restarts the poll.
 */
export function useVisiblePoll(
  task: () => Promise<void> | void,
  nextDelay: (elapsedMs: number) => number | null,
  active = true
) {
  const taskRef = useRef(task)
  useEffect(() => {
    taskRef.current = task
  })

  useEffect(() => {
    if (!active) return
    const started = Date.now()
    let timer: ReturnType<typeof setTimeout> | undefined
    let running = false
    let stopped = false

    const schedule = () => {
      clearTimeout(timer)
      const delay = nextDelay(Date.now() - started)
      if (delay !== null && !stopped) timer = setTimeout(run, delay)
    }
    const run = async () => {
      // Hidden: wait for visibilitychange instead of polling.
      if (running || document.visibilityState !== "visible") return
      running = true
      try {
        await taskRef.current()
      } catch {
        // Offline for a moment: try again next time.
      } finally {
        running = false
      }
      schedule()
    }
    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        clearTimeout(timer)
        void run()
      }
    }

    schedule()
    document.addEventListener("visibilitychange", onVisibility)
    return () => {
      stopped = true
      clearTimeout(timer)
      document.removeEventListener("visibilitychange", onVisibility)
    }
  }, [active, nextDelay])
}
